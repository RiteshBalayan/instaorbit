/**
 * TimeSeriesClient — Frontend middleware between TSDB and Redux.
 *
 * Manages:
 * 1. REST + WebSocket connection to the TSDB server
 * 2. Session lifecycle (create / resume)
 * 3. Data ingestion (single + bulk trace points, link states)
 * 4. Resolution-aware caching:
 *    - lowRes: full timeline sampled every LOW_RES_INTERVAL seconds
 *    - highRes: ±WINDOW_HALF_SIZE seconds around current sim time at full fidelity
 * 5. Sliding window: as sim time changes, fetch new high-res data and evict old
 * 6. Redux dispatch: pushes visibleTracePoints + lowResTimelines to store
 *
 * Usage:
 *   import tsClient from './timeSeriesClient';
 *   await tsClient.init({ userId, projectId });
 *   tsClient.ingestTracePoint(satId, tracePoint);
 *   tsClient.syncToTime(currentSimTime, satIds);   // call every frame
 */

/* ── Configuration ────────────────────────────────────────── */
const TSDB_BASE = import.meta.env.VITE_TSDB_URL || 'http://localhost:3002';
const TSDB_WS   = TSDB_BASE.replace(/^http/, 'ws') + '/ws';

const LOW_RES_INTERVAL = 10;        // seconds between low-res samples
const WINDOW_HALF_SIZE = 60;        // ±60 s of high-res data around current time
const SYNC_DEBOUNCE_MS = 200;       // min ms between sync() calls
const WS_RECONNECT_MS  = 3000;      // auto-reconnect delay
const INGEST_BATCH_MS   = 100;      // batch ingest buffer flush interval

/* ── Internal state ───────────────────────────────────────── */
let _sessionId = null;
let _ws = null;
let _wsReady = false;
let _wsReconnectTimer = null;
let _dispatch = null;        // Redux dispatch function
let _destroyed = false;

// In-memory caches (lightweight — only what's displayed)
const _lowResCache  = {};    // { satId: [ point, ... ] }
const _highResCache = {};    // { satId: [ point, ... ] }
const _linkStateCache = [];  // [ { time_s, active_links } ]
const _connectivityCache = []; // [ { time, connections } ] — windowed connectivity states
let _connectivityFullIngested = false; // tracks if full data was ingested
let _lastSyncTime = -Infinity;
let _lastSyncTs = 0;

// Tracks what was last dispatched to avoid redundant Redux updates
// that create new references and trigger cascading re-renders.
let _lastDispatchedVTPKeys = '';   // e.g. "0:150,1:150"
let _lastDispatchedLRKeys  = '';   // e.g. "0:3000,1:3000"
let _lastDispatchedLSKey   = '';   // link-states fingerprint
let _lastDispatchedCSKey   = '';   // connectivity-states fingerprint

// Ingestion buffer (batch writes)
let _tracePointBuffer = [];
let _linkStateBuffer  = [];
let _flushTimer = null;

/* ── REST helpers ─────────────────────────────────────────── */
async function _post(path, body) {
  const res = await fetch(`${TSDB_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`TSDB POST ${path} → ${res.status}`);
  return res.json();
}

async function _get(path) {
  const res = await fetch(`${TSDB_BASE}${path}`);
  if (!res.ok) throw new Error(`TSDB GET ${path} → ${res.status}`);
  return res.json();
}

async function _del(path) {
  const res = await fetch(`${TSDB_BASE}${path}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`TSDB DELETE ${path} → ${res.status}`);
  return res.json();
}

/* ── WebSocket ────────────────────────────────────────────── */
function _connectWs() {
  if (_destroyed || _ws) return;

  try {
    _ws = new WebSocket(TSDB_WS);
  } catch (e) {
    console.warn('[TSDB-WS] Connection failed, will retry:', e.message);
    _scheduleReconnect();
    return;
  }

  _ws.onopen = () => {
    console.log('[TSDB-WS] Connected');
    _wsReady = true;
  };

  _ws.onmessage = (evt) => {
    try {
      const msg = JSON.parse(evt.data);
      _handleWsMessage(msg);
    } catch { /* ignore bad frames */ }
  };

  _ws.onclose = () => {
    _wsReady = false;
    _ws = null;
    if (!_destroyed) _scheduleReconnect();
  };

  _ws.onerror = () => {
    // onclose will fire after this
  };
}

function _scheduleReconnect() {
  if (_wsReconnectTimer) return;
  _wsReconnectTimer = setTimeout(() => {
    _wsReconnectTimer = null;
    _connectWs();
  }, WS_RECONNECT_MS);
}

function _wsSend(msg) {
  if (_wsReady && _ws?.readyState === WebSocket.OPEN) {
    _ws.send(JSON.stringify(msg));
    return true;
  }
  return false;
}

function _handleWsMessage(msg) {
  switch (msg.type) {
    case 'tracePoint': {
      // Real-time single point pushed by server
      const { satId, point } = msg;
      if (!_highResCache[satId]) _highResCache[satId] = [];
      _highResCache[satId].push(point);
      break;
    }
    case 'tracePoints': {
      // Bulk push from subscription
      const { satId, points } = msg;
      _highResCache[satId] = points || [];
      break;
    }
    case 'linkStates': {
      _linkStateCache.length = 0;
      _linkStateCache.push(...(msg.states || []));
      break;
    }
    case 'queryResult': {
      // Handled by promise resolver if we implement request tracking
      break;
    }
    case 'pong':
      break;
  }
}

/* ── Ingestion buffering ──────────────────────────────────── */
function _startFlushTimer() {
  if (_flushTimer) return;
  _flushTimer = setInterval(_flushBuffers, INGEST_BATCH_MS);
}

function _stopFlushTimer() {
  if (_flushTimer) {
    clearInterval(_flushTimer);
    _flushTimer = null;
  }
}

async function _flushBuffers() {
  // Flush trace points
  if (_tracePointBuffer.length > 0 && _sessionId) {
    const batch = _tracePointBuffer.splice(0);
    try {
      await _post(`/sessions/${_sessionId}/trace-points`, { points: batch });
    } catch (err) {
      console.error('[TSDB] Trace point flush failed:', err);
      // Put back for retry
      _tracePointBuffer.unshift(...batch);
    }
  }

  // Flush link states
  if (_linkStateBuffer.length > 0 && _sessionId) {
    const batch = _linkStateBuffer.splice(0);
    try {
      await _post(`/sessions/${_sessionId}/link-states`, { states: batch });
    } catch (err) {
      console.error('[TSDB] Link state flush failed:', err);
      _linkStateBuffer.unshift(...batch);
    }
  }
}

/* ── Field mapping: frontend tracePoint → TSDB row ────────── */
function _mapTracePointToRow(satId, tp) {
  return {
    sat_id: Number(satId),
    time_s: tp.time,
    x: tp.x,
    y: tp.y,
    z: tp.z,
    map_x: tp.mapX ?? null,
    map_y: tp.mapY ?? null,
    lat: tp.lat ?? null,
    lon: tp.lon ?? null,
    alt: tp.alt ?? null,
    vx: tp.vx ?? null,
    vy: tp.vy ?? null,
    vz: tp.vz ?? null,
    qx: tp.qx ?? null,
    qy: tp.qy ?? null,
    qz: tp.qz ?? null,
    qw: tp.qw ?? null,
    component_angles: tp.componentAngles ?? null,
  };
}

/** TSDB row → frontend tracePoint format */
function _mapRowToTracePoint(row) {
  return {
    time: row.time_s,
    x: row.x,
    y: row.y,
    z: row.z,
    mapX: row.map_x,
    mapY: row.map_y,
    lat: row.lat,
    lon: row.lon,
    alt: row.alt,
    vx: row.vx,
    vy: row.vy,
    vz: row.vz,
    qx: row.qx,
    qy: row.qy,
    qz: row.qz,
    qw: row.qw,
    componentAngles: row.component_angles,
  };
}

/* ══════════════════════════════════════════════════════════════
   PUBLIC API
   ══════════════════════════════════════════════════════════ */

const tsClient = {
  /** Current TSDB session ID (null if not initialized) */
  get sessionId() { return _sessionId; },

  /** Whether the WebSocket is connected */
  get wsConnected() { return _wsReady; },

  /**
   * Initialize the client: create or resume a TSDB session.
   * Must be called before any other method.
   *
   * @param {Object} opts
   * @param {string}  opts.userId     - Firebase UID or 'anon-<uuid>'
   * @param {string}  opts.projectId  - Project identifier
   * @param {Function} opts.dispatch  - Redux store.dispatch
   * @param {string}  [opts.sessionId] - Resume existing session
   */
  async init({ userId, projectId, dispatch, sessionId }) {
    _dispatch = dispatch;
    _destroyed = false;

    if (sessionId) {
      // Resume existing session
      try {
        const existing = await _get(`/sessions/${sessionId}`);
        if (existing?.session_id) {
          _sessionId = existing.session_id;
          console.log(`[TSDB] Resumed session ${_sessionId}`);
        }
      } catch {
        console.warn('[TSDB] Could not resume session, creating new');
      }
    }

    if (!_sessionId) {
      const data = await _post('/sessions', {
        user_id: userId || `anon-${crypto.randomUUID()}`,
        project_id: projectId || 'default',
      });
      _sessionId = data.session_id;
      console.log(`[TSDB] Created session ${_sessionId}`);
    }

    // Store session ID for persistence
    try {
      localStorage.setItem('instaorbit_tsdb_session', _sessionId);
    } catch { /* SSR safe */ }

    // Connect WebSocket
    _connectWs();

    // Start ingestion flush timer
    _startFlushTimer();

    return _sessionId;
  },

  /**
   * Ingest a single trace point (buffered — flushed every INGEST_BATCH_MS).
   * Also tries to send via WebSocket for real-time broadcast to other tabs.
   */
  ingestTracePoint(satId, tracePoint) {
    const row = _mapTracePointToRow(satId, tracePoint);
    _tracePointBuffer.push(row);

    // Also send via WS for real-time broadcast
    _wsSend({
      type: 'ingest',
      sessionId: _sessionId,
      dataType: 'tracePoint',
      payload: row,
    });
  },

  /**
   * Ingest a batch of trace points for one satellite (used by BulkSimControls).
   * Goes directly via REST, bypassing the buffer.
   */
  async ingestBulkTracePoints(satId, tracePoints) {
    if (!_sessionId) throw new Error('TSDB not initialized');
    const rows = tracePoints.map(tp => _mapTracePointToRow(satId, tp));
    return _post(`/sessions/${_sessionId}/trace-points`, { points: rows });
  },

  /**
   * Ingest a single link state snapshot.
   */
  ingestLinkState(time, activeLinks) {
    _linkStateBuffer.push({
      time_s: time,
      active_links: activeLinks,
    });
  },

  /**
   * Ingest bulk link states (from BulkSimControls).
   */
  async ingestBulkLinkStates(states) {
    if (!_sessionId) throw new Error('TSDB not initialized');
    return _post(`/sessions/${_sessionId}/link-states`, { states });
  },

  /**
   * Ingest contact windows.
   */
  async ingestContactWindows(windows) {
    if (!_sessionId) throw new Error('TSDB not initialized');
    return _post(`/sessions/${_sessionId}/contact-windows`, { windows });
  },

  /**
   * Ingest connectivity states (connectedPairsTimeSeries) into TSDB.
   * Each entry: { time, connections: [...] }
   */
  async ingestConnectivityStates(states) {
    if (!_sessionId) throw new Error('TSDB not initialized');
    const rows = states.map(s => ({
      time_s: s.time ?? s.time_s,
      connections: s.connections,
    }));
    _connectivityFullIngested = true;
    return _post(`/sessions/${_sessionId}/connectivity-states`, { states: rows });
  },

  /**
   * Ingest connection windows into TSDB.
   * Each entry: { id, pairId, txNodeId, rxNodeId, simStart, simEnd, closed }
   */
  async ingestConnectionWindows(windows) {
    if (!_sessionId) throw new Error('TSDB not initialized');
    return _post(`/sessions/${_sessionId}/connection-windows`, { windows });
  },

  /**
   * Core sync function — call this every render frame (debounced internally).
   *
   * Fetches:
   * 1. Low-res timeline (full duration, every LOW_RES_INTERVAL s) — only once or when range grows
   * 2. High-res window (±WINDOW_HALF_SIZE s around currentTime) — on every sync
   * 3. Link states for the high-res window
   *
   * Then dispatches to Redux:
   *   - setVisibleTracePoints({ satId: points[] })
   *   - setLowResTimelines({ satId: points[] })
   *   - setVisibleLinkStates(states[])
   *
   * @param {number} currentTime - Current simulation elapsed seconds
   * @param {number[]} satIds    - Active satellite IDs to fetch data for
   */
  async syncToTime(currentTime, satIds) {
    if (!_sessionId || !_dispatch) return;

    // Debounce
    const now = Date.now();
    if (now - _lastSyncTs < SYNC_DEBOUNCE_MS) return;
    _lastSyncTs = now;

    // Skip if time hasn't changed enough (< 0.5s)
    if (Math.abs(currentTime - _lastSyncTime) < 0.5) return;
    _lastSyncTime = currentTime;

    const from = Math.max(0, currentTime - WINDOW_HALF_SIZE);
    const to = currentTime + WINDOW_HALF_SIZE;

    try {
      // Parallel fetch: high-res trace points for each sat + link states
      const promises = [];

      for (const satId of satIds) {
        // High-res (full fidelity) for visible window
        promises.push(
          _get(`/sessions/${_sessionId}/trace-points?sat_id=${satId}&from=${from}&to=${to}&resolution=1`)
            .then(data => ({ type: 'highRes', satId, points: data.points }))
            .catch(() => ({ type: 'highRes', satId, points: [] }))
        );

        // Low-res (every 10s) for full timeline — only re-fetch if we don't have it
        if (!_lowResCache[satId] || _lowResCache[satId].length === 0) {
          promises.push(
            _get(`/sessions/${_sessionId}/trace-points?sat_id=${satId}&from=0&to=999999999&resolution=${LOW_RES_INTERVAL}`)
              .then(data => ({ type: 'lowRes', satId, points: data.points }))
              .catch(() => ({ type: 'lowRes', satId, points: [] }))
          );
        }
      }

      // Link states for visible window
      promises.push(
        _get(`/sessions/${_sessionId}/link-states?from=${from}&to=${to}`)
          .then(data => ({ type: 'linkStates', states: data.states }))
          .catch(() => ({ type: 'linkStates', states: [] }))
      );

      // Connectivity states for visible window (if data was ingested)
      if (_connectivityFullIngested) {
        promises.push(
          _get(`/sessions/${_sessionId}/connectivity-states?from=${from}&to=${to}`)
            .then(data => ({ type: 'connectivityStates', states: data.states }))
            .catch(() => ({ type: 'connectivityStates', states: [] }))
        );
      }

      const results = await Promise.all(promises);

      // Process results and build dispatch payloads
      const visibleTracePoints = {};
      const lowResTimelines = {};

      for (const r of results) {
        if (r.type === 'highRes') {
          const mapped = (r.points || []).map(_mapRowToTracePoint);
          _highResCache[r.satId] = mapped;
          visibleTracePoints[r.satId] = mapped;
        } else if (r.type === 'lowRes') {
          const mapped = (r.points || []).map(_mapRowToTracePoint);
          _lowResCache[r.satId] = mapped;
          lowResTimelines[r.satId] = mapped;
        } else if (r.type === 'linkStates') {
          _linkStateCache.length = 0;
          _linkStateCache.push(...(r.states || []));
        } else if (r.type === 'connectivityStates') {
          _connectivityCache.length = 0;
          const mapped = (r.states || []).map(s => ({
            time: s.time_s,
            connections: s.connections,
          }));
          _connectivityCache.push(...mapped);
        }
      }

      // Include cached low-res for sats we didn't re-fetch
      for (const satId of satIds) {
        if (!lowResTimelines[satId] && _lowResCache[satId]) {
          lowResTimelines[satId] = _lowResCache[satId];
        }
      }

      // Only dispatch to Redux if data actually changed.
      // Build a lightweight fingerprint: "satId:pointCount,..." for each payload.
      // This prevents creating new Redux references every 200ms when the
      // underlying data is identical (e.g. sim paused, or same time window).
      const vtpKey = Object.entries(visibleTracePoints)
        .map(([id, pts]) => `${id}:${pts.length}:${pts.length ? pts[0].time : ''}:${pts.length ? pts[pts.length - 1].time : ''}`)
        .sort()
        .join(',');
      if (vtpKey !== _lastDispatchedVTPKeys) {
        _lastDispatchedVTPKeys = vtpKey;
        _dispatch({ type: 'particles/setVisibleTracePoints', payload: visibleTracePoints });
      }

      const lrKey = Object.entries(lowResTimelines)
        .map(([id, pts]) => `${id}:${pts.length}`)
        .sort()
        .join(',');
      if (lrKey !== _lastDispatchedLRKeys) {
        _lastDispatchedLRKeys = lrKey;
        _dispatch({ type: 'particles/setLowResTimelines', payload: lowResTimelines });
      }

      // Fingerprint link-states before dispatching
      const lsKey = `${_linkStateCache.length}:${_linkStateCache.length ? _linkStateCache[0]?.time_s : ''}:${_linkStateCache.length ? _linkStateCache[_linkStateCache.length - 1]?.time_s : ''}`;
      if (lsKey !== _lastDispatchedLSKey) {
        _lastDispatchedLSKey = lsKey;
        _dispatch({ type: 'communication/setVisibleLinkStates', payload: [..._linkStateCache] });
      }

      if (_connectivityFullIngested) {
        const csKey = `${_connectivityCache.length}:${_connectivityCache.length ? _connectivityCache[0]?.time : ''}:${_connectivityCache.length ? _connectivityCache[_connectivityCache.length - 1]?.time : ''}`;
        if (csKey !== _lastDispatchedCSKey) {
          _lastDispatchedCSKey = csKey;
          _dispatch({ type: 'communication/setVisibleConnectivityStates', payload: [..._connectivityCache] });
        }
      }

    } catch (err) {
      console.error('[TSDB] syncToTime error:', err);
    }
  },

  /**
   * Force refresh low-res cache (e.g. after bulk simulation completes).
   */
  async refreshLowRes(satIds) {
    if (!_sessionId) return;

    for (const satId of satIds) {
      try {
        const data = await _get(
          `/sessions/${_sessionId}/trace-points?sat_id=${satId}&from=0&to=999999999&resolution=${LOW_RES_INTERVAL}`
        );
        _lowResCache[satId] = (data.points || []).map(_mapRowToTracePoint);
      } catch (err) {
        console.error(`[TSDB] refreshLowRes sat ${satId}:`, err);
      }
    }

    // Dispatch updated low-res
    if (_dispatch) {
      const lowResTimelines = {};
      for (const satId of satIds) {
        lowResTimelines[satId] = _lowResCache[satId] || [];
      }
      _dispatch({ type: 'particles/setLowResTimelines', payload: lowResTimelines });
    }
  },

  /**
   * Get metadata for a satellite's data in the TSDB.
   */
  async getTracePointMeta(satId) {
    if (!_sessionId) return null;
    return _get(`/sessions/${_sessionId}/trace-points/meta?sat_id=${satId}`);
  },

  /**
   * Get list of satellite IDs that have data in the TSDB.
   */
  async getSatIds() {
    if (!_sessionId) return [];
    const data = await _get(`/sessions/${_sessionId}/trace-points/sat-ids`);
    return data.sat_ids || [];
  },

  /**
   * Get contact windows (optionally filtered).
   */
  async getContactWindows(txId, rxId) {
    if (!_sessionId) return [];
    let url = `/sessions/${_sessionId}/contact-windows`;
    const params = [];
    if (txId !== undefined) params.push(`tx_id=${txId}`);
    if (rxId !== undefined) params.push(`rx_id=${rxId}`);
    if (params.length) url += '?' + params.join('&');
    const data = await _get(url);
    return data.windows || [];
  },

  /**
   * Clear all simulation data for the current session (keep session alive).
   */
  async clearSessionData() {
    if (!_sessionId) return;
    await _post(`/sessions/${_sessionId}/clear`, {});
    // Clear local caches
    Object.keys(_lowResCache).forEach(k => delete _lowResCache[k]);
    Object.keys(_highResCache).forEach(k => delete _highResCache[k]);
    _linkStateCache.length = 0;
    _connectivityCache.length = 0;
    _connectivityFullIngested = false;
    _lastSyncTime = -Infinity;
    // Reset fingerprint caches so next sync dispatches fresh data
    _lastDispatchedVTPKeys = '';
    _lastDispatchedLRKeys  = '';
    _lastDispatchedLSKey   = '';
    _lastDispatchedCSKey   = '';
  },

  /**
   * Reset session: delete old session, create a fresh one.
   * Use this before starting a new simulation to ensure no stale data.
   */
  async resetForNewSimulation() {
    if (!_sessionId) return;
    console.log('[TSDB] Resetting session for new simulation');
    try {
      await _post(`/sessions/${_sessionId}/clear`, {});
    } catch (err) {
      console.warn('[TSDB] clearSessionData failed during reset:', err.message);
    }
    // Clear local caches
    Object.keys(_lowResCache).forEach(k => delete _lowResCache[k]);
    Object.keys(_highResCache).forEach(k => delete _highResCache[k]);
    _linkStateCache.length = 0;
    _connectivityCache.length = 0;
    _connectivityFullIngested = false;
    _lastSyncTime = -Infinity;
    _lastDispatchedVTPKeys = '';
    _lastDispatchedLRKeys  = '';
    _lastDispatchedLSKey   = '';
    _lastDispatchedCSKey   = '';
    // Dispatch empty data to Redux so stale data is cleared
    if (_dispatch) {
      _dispatch({ type: 'particles/setVisibleTracePoints', payload: {} });
      _dispatch({ type: 'particles/setLowResTimelines', payload: {} });
      _dispatch({ type: 'communication/setVisibleLinkStates', payload: [] });
      _dispatch({ type: 'communication/setVisibleConnectivityStates', payload: [] });
    }
  },

  /**
   * Reset a specific satellite's data.
   */
  async clearSatelliteData(satId) {
    if (!_sessionId) return;
    await _del(`/sessions/${_sessionId}/trace-points/${satId}`);
    delete _lowResCache[satId];
    delete _highResCache[satId];
  },

  /**
   * Flush any pending ingestion buffers immediately.
   */
  async flush() {
    await _flushBuffers();
  },

  /**
   * Tear down: disconnect WS, flush buffers, clear state.
   */
  async destroy() {
    _destroyed = true;
    _stopFlushTimer();
    await _flushBuffers();

    if (_ws) {
      _ws.close();
      _ws = null;
    }
    _wsReady = false;

    if (_wsReconnectTimer) {
      clearTimeout(_wsReconnectTimer);
      _wsReconnectTimer = null;
    }

    Object.keys(_lowResCache).forEach(k => delete _lowResCache[k]);
    Object.keys(_highResCache).forEach(k => delete _highResCache[k]);
    _linkStateCache.length = 0;
    _connectivityCache.length = 0;
    _connectivityFullIngested = false;
    _tracePointBuffer.length = 0;
    _linkStateBuffer.length = 0;
    _sessionId = null;
    _dispatch = null;
    _lastSyncTime = -Infinity;
    _lastSyncTs = 0;
  },
};

export { tsClient };
export default tsClient;
