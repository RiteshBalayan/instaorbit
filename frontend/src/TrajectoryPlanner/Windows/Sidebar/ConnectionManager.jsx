/**
 * ConnectionManager — UI for configuring and running the link connectivity
 * algorithm (Feature 2).
 *
 * Displays:
 *   1. Auto-detected nodes (laser terminals + ground antennas)
 *   2. Per-node priority editor (simple list for now)
 *   3. "Run Connectivity" button → calls POST /link-connectivity
 *   4. Results summary (connection count, windows)
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  setConnectedPairsTimeSeries,
  setConnectionWindows,
  clearConnectedPairsTimeSeries,
  clearConnectionWindows,
  setLinkDisplayMode,
  setMaxConnectionsPerNode,
} from '../../../Store/communicationSlice';
import { buildNodesFromConfig } from './linkComputation';
import tsClient from '../../../services/timeSeriesClient';
import './ConnectionManager.css';

const ConnectionManager = () => {
  const dispatch = useDispatch();
  const satellites = useSelector((s) => s.satellites.satellitesConfig) || [];
  const groundStations = useSelector((s) => s.groundStations?.groundStations) || [];
  const availablePairsTimeSeries = useSelector((s) => s.communication.availablePairsTimeSeries) || [];
  const connectedPairsTimeSeries = useSelector((s) => s.communication.connectedPairsTimeSeries) || [];
  const connectionWindows = useSelector((s) => s.communication.connectionWindows) || [];
  const linkDisplayMode = useSelector((s) => s.communication.linkDisplayMode || 'connected');

  // Auto-build nodes from satellite configs
  const nodes = useMemo(
    () => buildNodesFromConfig(satellites, groundStations),
    [satellites, groundStations],
  );

  // Per-node priorities (local state, editable)
  const [priorityMap, setPriorityMap] = useState({});

  // Global max concurrent connections per node — sourced from Redux so the
  // Link Manager (Configure Links) and this panel stay in sync.
  const maxConnectionsPerNode = useSelector(
    (s) => s.communication.maxConnectionsPerNode ?? 1,
  );

  // Status
  const [status, setStatus] = useState(null); // null | 'running' | 'success' | 'error'
  const [statusMsg, setStatusMsg] = useState('');

  // Toggle a priority entry for a node
  const togglePriority = useCallback((nodeId, targetNodeId) => {
    setPriorityMap((prev) => {
      const current = prev[nodeId] || [];
      const exists = current.find((p) => p.targetNodeId === targetNodeId);
      if (exists) {
        // Remove it
        return {
          ...prev,
          [nodeId]: current.filter((p) => p.targetNodeId !== targetNodeId),
        };
      }
      // Add it with next priority number
      const maxPri = current.reduce((mx, p) => Math.max(mx, p.priority), 0);
      return {
        ...prev,
        [nodeId]: [...current, { targetNodeId, priority: maxPri + 1 }],
      };
    });
  }, []);

  // Move a priority up
  const movePriorityUp = useCallback((nodeId, targetNodeId) => {
    setPriorityMap((prev) => {
      const current = [...(prev[nodeId] || [])].sort((a, b) => a.priority - b.priority);
      const idx = current.findIndex((p) => p.targetNodeId === targetNodeId);
      if (idx <= 0) return prev;
      // Swap priorities
      const tmp = current[idx].priority;
      current[idx].priority = current[idx - 1].priority;
      current[idx - 1].priority = tmp;
      return { ...prev, [nodeId]: current };
    });
  }, []);

  // Run connectivity
  const handleRun = useCallback(async () => {
    if (!availablePairsTimeSeries.length) {
      setStatus('error');
      setStatusMsg('No availability data — run Bulk Sim first');
      return;
    }
    if (!nodes.length) {
      setStatus('error');
      setStatusMsg('No nodes detected — add satellites with laser terminals');
      return;
    }

    setStatus('running');
    setStatusMsg('Computing…');

    try {
      // Build priorities array
      const priorities = Object.entries(priorityMap)
        .filter(([, pris]) => pris.length > 0)
        .map(([nodeId, pris]) => ({
          nodeId,
          priorities: pris.sort((a, b) => a.priority - b.priority),
        }));

      const payload = {
        availablePairsTimeSeries,
        nodes,
        priorities,
        maxConnectionsPerNode: Math.max(1, Number(maxConnectionsPerNode) || 1),
      };

      const resp = await fetch('http://localhost:3001/link-connectivity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }

      const data = await resp.json();

      // Load results into Redux
      dispatch(setConnectedPairsTimeSeries(data.connectedPairsTimeSeries || []));
      dispatch(setConnectionWindows(data.connectionWindows || []));

      // Ingest into TSDB for windowed playback
      if (data.connectedPairsTimeSeries?.length) {
        tsClient.ingestConnectivityStates(data.connectedPairsTimeSeries)
          .catch(err => console.warn('[TSDB] Ingest connectivity states:', err));
      }
      if (data.connectionWindows?.length) {
        tsClient.ingestConnectionWindows(data.connectionWindows)
          .catch(err => console.warn('[TSDB] Ingest connection windows:', err));
      }

      const totalConns = data.meta?.totalConnections || 0;
      const windows = data.connectionWindows?.length || 0;
      setStatus('success');
      setStatusMsg(
        `${totalConns} connections across ${data.meta?.totalTimesteps || 0} steps, ` +
        `${windows} connection windows — ${data.meta?.computeTimeMs}ms`
      );
    } catch (err) {
      console.error('Connectivity computation failed:', err);
      setStatus('error');
      setStatusMsg(String(err.message || err));
    }
  }, [availablePairsTimeSeries, nodes, priorityMap, maxConnectionsPerNode, dispatch]);

  // Clear results
  const handleClear = useCallback(() => {
    dispatch(clearConnectedPairsTimeSeries());
    dispatch(clearConnectionWindows());
    setStatus(null);
    setStatusMsg('');
  }, [dispatch]);

  return (
    <div className="conn-manager">
      {/* ── Link Display Mode Toggle ────────────────────────── */}
      <div className="conn-section" style={{ marginBottom: 8 }}>
        <div className="conn-section-title" style={{ marginBottom: 6 }}>Link Display Mode</div>
        <div style={{
          display: 'flex',
          gap: 0,
          borderRadius: 6,
          overflow: 'hidden',
          border: '1px solid rgba(138,130,251,0.3)',
        }}>
          <button
            onClick={() => dispatch(setLinkDisplayMode('connected'))}
            style={{
              flex: 1,
              padding: '7px 12px',
              fontSize: 11,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: linkDisplayMode === 'connected'
                ? 'rgba(255,235,59,0.25)'
                : 'rgba(30,30,50,0.6)',
              color: linkDisplayMode === 'connected'
                ? '#ffeb3b'
                : '#8f94fb',
              transition: 'all 0.15s',
            }}
          >
            🔗 Connected
          </button>
          <button
            onClick={() => dispatch(setLinkDisplayMode('available'))}
            style={{
              flex: 1,
              padding: '7px 12px',
              fontSize: 11,
              fontWeight: 600,
              border: 'none',
              borderLeft: '1px solid rgba(138,130,251,0.2)',
              cursor: 'pointer',
              background: linkDisplayMode === 'available'
                ? 'rgba(56,189,248,0.25)'
                : 'rgba(30,30,50,0.6)',
              color: linkDisplayMode === 'available'
                ? '#38bdf8'
                : '#8f94fb',
              transition: 'all 0.15s',
            }}
          >
            📡 Available
          </button>
        </div>
        <div style={{
          fontSize: 10,
          color: '#6b7280',
          marginTop: 4,
          lineHeight: '1.4',
        }}>
          {linkDisplayMode === 'connected'
            ? 'Showing only links assigned by the connectivity solver (3D, 2D, LVLH, Timeline).'
            : 'Showing all physically available links — line of sight (3D, 2D, LVLH, Timeline).'}
        </div>
      </div>

      {/* ── Global Limits ───────────────────────────────────── */}
      <div className="conn-section" style={{
        padding: '8px 10px',
        background: 'rgba(59,130,246,0.08)',
        borderRadius: 6,
        margin: '6px 0',
        border: '1px solid rgba(59,130,246,0.2)',
      }}>
        <div style={{
          fontSize: 10,
          fontWeight: 700,
          color: '#60a5fa',
          textTransform: 'uppercase',
          letterSpacing: 1,
          marginBottom: 6,
        }}>
          Global Limits
        </div>
        <label style={{ fontSize: 11, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 6 }}>
          Max Connections per Satellite
          <input
            type="number"
            min={1}
            max={64}
            step={1}
            value={maxConnectionsPerNode}
            onChange={(e) => dispatch(setMaxConnectionsPerNode(e.target.value))}
            style={{
              width: 56,
              padding: '3px 6px',
              background: 'rgba(15,23,42,0.6)',
              color: '#e2e8f0',
              border: '1px solid rgba(148,163,184,0.3)',
              borderRadius: 4,
              fontSize: 11,
            }}
          />
        </label>
        <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4, lineHeight: 1.4 }}>
          Each satellite/ground node can be assigned up to this many simultaneous links.
          Default 1. Re-run connectivity after changing.
        </div>
      </div>

      {/* Header / summary */}
      <div className="conn-section">
        <div className="conn-section-title">Detected Nodes</div>
        <div className="conn-section-subtitle">
          {nodes.length} node{nodes.length !== 1 ? 's' : ''} from {satellites.length} satellite{satellites.length !== 1 ? 's' : ''} and {groundStations.length} ground station{groundStations.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Node list */}
      <div className="conn-node-list">
        {nodes.map((node) => (
          <div key={node.nodeId} className="conn-node-card">
            <div className="conn-node-header">
              <span className={`conn-node-badge ${node.parentType}`}>
                {node.parentType === 'satellite' ? '🛰' : '📡'}
              </span>
              <span className="conn-node-label">{node.label}</span>
              <span className="conn-node-type">{node.componentType}</span>
            </div>

            {/* Priority targets */}
            <div className="conn-node-priorities">
              <span className="conn-prio-label">Targets:</span>
              {(priorityMap[node.nodeId] || [])
                .sort((a, b) => a.priority - b.priority)
                .map((pri) => {
                  const target = nodes.find((n) => n.nodeId === pri.targetNodeId);
                  return (
                    <span
                      key={pri.targetNodeId}
                      className="conn-prio-chip"
                      title={`Priority ${pri.priority}. Click to remove.`}
                    >
                      <span
                        className="conn-prio-up"
                        onClick={() => movePriorityUp(node.nodeId, pri.targetNodeId)}
                        title="Move up in priority"
                      >
                        ▲
                      </span>
                      <span onClick={() => togglePriority(node.nodeId, pri.targetNodeId)}>
                        {pri.priority}. {target?.label || pri.targetNodeId}
                      </span>
                    </span>
                  );
                })}

              {/* Add target dropdown */}
              <select
                className="conn-prio-add"
                value=""
                onChange={(e) => {
                  if (e.target.value) togglePriority(node.nodeId, e.target.value);
                }}
              >
                <option value="">+ Add target…</option>
                {nodes
                  .filter(
                    (n) =>
                      n.nodeId !== node.nodeId &&
                      !(priorityMap[node.nodeId] || []).find((p) => p.targetNodeId === n.nodeId),
                  )
                  .map((n) => (
                    <option key={n.nodeId} value={n.nodeId}>
                      {n.label}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        ))}

        {nodes.length === 0 && (
          <div className="conn-empty">
            No laser terminals or ground stations found.<br />
            Add satellites with laser components, then try again.
          </div>
        )}
      </div>

      {/* Availability data status */}
      <div className="conn-section" style={{ marginTop: 12 }}>
        <div className="conn-section-title">Availability Data</div>
        <div className="conn-avail-status">
          {availablePairsTimeSeries.length > 0 ? (
            <span className="conn-avail-ok">
              ✅ {availablePairsTimeSeries.length} timesteps loaded
            </span>
          ) : (
            <span className="conn-avail-warn">
              ⚠️ No availability data — run Bulk Sim first
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="conn-actions">
        <button
          className="conn-btn conn-btn-run"
          onClick={handleRun}
          disabled={status === 'running' || !nodes.length || !availablePairsTimeSeries.length}
        >
          {status === 'running' ? 'Computing…' : 'Run Connectivity'}
        </button>
        <button
          className="conn-btn conn-btn-clear"
          onClick={handleClear}
          disabled={!connectedPairsTimeSeries.length}
        >
          Clear Results
        </button>
      </div>

      {/* Status message */}
      {statusMsg && (
        <div className={`conn-status ${status || ''}`}>{statusMsg}</div>
      )}

      {/* Results summary */}
      {connectedPairsTimeSeries.length > 0 && (
        <div className="conn-section" style={{ marginTop: 12 }}>
          <div className="conn-section-title">Results</div>
          <div className="conn-results-grid">
            <div className="conn-result-card">
              <div className="conn-result-value">{connectedPairsTimeSeries.length}</div>
              <div className="conn-result-label">Timesteps</div>
            </div>
            <div className="conn-result-card">
              <div className="conn-result-value">
                {connectedPairsTimeSeries.reduce((s, t) => s + t.connections.length, 0)}
              </div>
              <div className="conn-result-label">Total Connections</div>
            </div>
            <div className="conn-result-card">
              <div className="conn-result-value">{connectionWindows.length}</div>
              <div className="conn-result-label">Connection Windows</div>
            </div>
          </div>

          {/* Connection windows list */}
          {connectionWindows.length > 0 && (
            <div className="conn-windows">
              <div className="conn-section-subtitle" style={{ marginTop: 8 }}>
                Connection Windows
              </div>
              <div className="conn-windows-list">
                {connectionWindows.slice(0, 50).map((w) => (
                  <div key={w.id} className="conn-window-row">
                    <span className="conn-window-pair">{w.pairId}</span>
                    <span className="conn-window-time">
                      {w.simStart.toFixed(1)}s → {w.simEnd.toFixed(1)}s
                    </span>
                    <span className="conn-window-dur">
                      {(w.simEnd - w.simStart).toFixed(1)}s
                    </span>
                  </div>
                ))}
                {connectionWindows.length > 50 && (
                  <div className="conn-window-more">
                    +{connectionWindows.length - 50} more windows
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConnectionManager;
