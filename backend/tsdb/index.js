/**
 * InstaOrbit TSDB — Time-Series Database Microservice
 *
 * Express REST API  +  WebSocket streaming server
 * Port: 3002 (configurable via TSDB_PORT env var)
 *
 * Stores trace-points, link-states, and contact-windows in SQLite.
 * Frontend connects via REST for batch ops and WebSocket for
 * real-time streaming during simulation playback.
 */

const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');

/* ── Import routes ────────────────────────────────────────── */
const sessionsRouter = require('./routes/sessions');
const tracePointsRouter = require('./routes/tracePoints');
const linkStatesRouter = require('./routes/linkStates');

/* ── Express app ──────────────────────────────────────────── */
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' })); // bulk ingests can be large

/* ── Mount routes ─────────────────────────────────────────── */
app.use('/sessions', sessionsRouter);
app.use('/sessions/:id/trace-points', tracePointsRouter);
app.use('/sessions/:id', linkStatesRouter); // link-states & contact-windows sub-paths

/* ── Health check ─────────────────────────────────────────── */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'instaorbit-tsdb', uptime: process.uptime() });
});

/* ── 404 fallback ─────────────────────────────────────────── */
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

/* ── Error handler ────────────────────────────────────────── */
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

/* ── HTTP + WebSocket server ──────────────────────────────── */
const server = http.createServer(app);

const wss = new WebSocketServer({ server, path: '/ws' });

/**
 * WebSocket connection handler.
 *
 * Protocol (JSON messages):
 *
 * Client → Server:
 *   { type: 'subscribe',   sessionId, satIds: [1,2], from, to, resolution }
 *   { type: 'unsubscribe', sessionId }
 *   { type: 'query',       sessionId, satIds, from, to, resolution, requestId }
 *   { type: 'ping' }
 *
 * Server → Client:
 *   { type: 'tracePoints', sessionId, satId, points: [...], resolution }
 *   { type: 'linkStates',  sessionId, states: [...] }
 *   { type: 'queryResult', requestId, data: {...} }
 *   { type: 'pong' }
 *   { type: 'error', message }
 */
const { stmts } = require('./db');

// Track subscriptions per client
const clientSubs = new Map(); // ws → { sessionId, satIds, from, to, resolution, interval }

wss.on('connection', (ws) => {
  console.log(`[WS] Client connected (total: ${wss.clients.size})`);

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
      return;
    }

    try {
      handleWsMessage(ws, msg);
    } catch (err) {
      console.error('[WS] Handler error:', err);
      ws.send(JSON.stringify({ type: 'error', message: String(err) }));
    }
  });

  ws.on('close', () => {
    // Clean up subscription interval
    const sub = clientSubs.get(ws);
    if (sub?.interval) clearInterval(sub.interval);
    clientSubs.delete(ws);
    console.log(`[WS] Client disconnected (total: ${wss.clients.size})`);
  });

  ws.on('error', (err) => {
    console.error('[WS] Socket error:', err.message);
  });
});

function handleWsMessage(ws, msg) {
  switch (msg.type) {
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong' }));
      break;

    case 'subscribe':
      handleSubscribe(ws, msg);
      break;

    case 'unsubscribe':
      handleUnsubscribe(ws);
      break;

    case 'query':
      handleQuery(ws, msg);
      break;

    case 'ingest':
      handleWsIngest(ws, msg);
      break;

    default:
      ws.send(JSON.stringify({ type: 'error', message: `Unknown type: ${msg.type}` }));
  }
}

/**
 * Subscribe: client wants periodic pushes of trace points for given sats
 * in a sliding window. The server pushes every `interval` ms.
 */
function handleSubscribe(ws, msg) {
  // Clean up old subscription
  const old = clientSubs.get(ws);
  if (old?.interval) clearInterval(old.interval);

  const {
    sessionId,
    satIds = [],
    from = 0,
    to = 999999999,
    resolution = 1,
    intervalMs = 1000, // push interval in ms
  } = msg;

  const pushData = () => {
    if (ws.readyState !== 1) return; // OPEN

    for (const satId of satIds) {
      const resn = Math.max(1, Math.round(resolution));
      let rows;
      if (resn <= 1) {
        rows = stmts.queryTracePoints.all(sessionId, satId, from, to);
      } else {
        rows = stmts.queryTracePointsDownsampled.all(sessionId, satId, from, to, resn);
      }
      ws.send(JSON.stringify({
        type: 'tracePoints',
        sessionId,
        satId,
        points: rows,
        resolution: resn,
      }));
    }

    // Also push link states for the window
    const linkRows = stmts.queryLinkStates.all(sessionId, from, to);
    if (linkRows.length) {
      ws.send(JSON.stringify({
        type: 'linkStates',
        sessionId,
        states: linkRows.map((r) => ({
          time_s: r.time_s,
          active_links: JSON.parse(r.active_links),
        })),
      }));
    }
  };

  // Immediate first push
  pushData();

  // Periodic pushes
  const interval = setInterval(pushData, Math.max(200, intervalMs));

  clientSubs.set(ws, { sessionId, satIds, from, to, resolution, interval });

  ws.send(JSON.stringify({ type: 'subscribed', sessionId, satIds }));
}

function handleUnsubscribe(ws) {
  const sub = clientSubs.get(ws);
  if (sub?.interval) clearInterval(sub.interval);
  clientSubs.delete(ws);
  ws.send(JSON.stringify({ type: 'unsubscribed' }));
}

/**
 * One-shot query: client asks for a slice of data, server responds once.
 */
function handleQuery(ws, msg) {
  const {
    sessionId,
    satIds = [],
    from = 0,
    to = 999999999,
    resolution = 1,
    requestId,
    dataType = 'tracePoints', // 'tracePoints' | 'linkStates' | 'both'
  } = msg;

  const result = {};

  if (dataType === 'tracePoints' || dataType === 'both') {
    result.tracePoints = {};
    const resn = Math.max(1, Math.round(resolution));
    for (const satId of satIds) {
      let rows;
      if (resn <= 1) {
        rows = stmts.queryTracePoints.all(sessionId, satId, from, to);
      } else {
        rows = stmts.queryTracePointsDownsampled.all(sessionId, satId, from, to, resn);
      }
      result.tracePoints[satId] = rows;
    }
  }

  if (dataType === 'linkStates' || dataType === 'both') {
    const linkRows = stmts.queryLinkStates.all(sessionId, from, to);
    result.linkStates = linkRows.map((r) => ({
      time_s: r.time_s,
      active_links: JSON.parse(r.active_links),
    }));
  }

  ws.send(JSON.stringify({
    type: 'queryResult',
    requestId,
    data: result,
  }));
}

/**
 * WebSocket ingest: client pushes data via WS instead of REST for lower latency.
 * Used during real-time simulation stepping.
 */
function handleWsIngest(ws, msg) {
  const { sessionId, dataType, payload } = msg;

  if (dataType === 'tracePoint' && payload) {
    stmts.insertTracePoint.run(
      sessionId, payload.sat_id, payload.time_s,
      payload.x, payload.y, payload.z,
      payload.map_x, payload.map_y,
      payload.lat, payload.lon, payload.alt,
      payload.vx, payload.vy, payload.vz,
      payload.qx, payload.qy, payload.qz, payload.qw,
      payload.component_angles ? JSON.stringify(payload.component_angles) : null,
    );

    // Broadcast to all subscribed clients watching this session + sat
    broadcastToSubscribers(sessionId, payload.sat_id, payload);
  }

  if (dataType === 'linkState' && payload) {
    stmts.insertLinkState.run(
      sessionId,
      payload.time_s,
      typeof payload.active_links === 'string'
        ? payload.active_links
        : JSON.stringify(payload.active_links),
    );
  }

  // No ack sent for ingest to keep throughput high
}

/**
 * Broadcast a new trace point to all clients subscribed to this session+sat.
 */
function broadcastToSubscribers(sessionId, satId, point) {
  for (const [client, sub] of clientSubs) {
    if (
      client.readyState === 1 &&
      sub.sessionId === sessionId &&
      sub.satIds.includes(satId)
    ) {
      client.send(JSON.stringify({
        type: 'tracePoint',  // singular — real-time single point
        sessionId,
        satId,
        point,
      }));
    }
  }
}

/* ── Start server ─────────────────────────────────────────── */
const PORT = process.env.TSDB_PORT || 3002;

server.listen(PORT, () => {
  console.log(`\n  🚀  InstaOrbit TSDB running on http://localhost:${PORT}`);
  console.log(`  📡  WebSocket endpoint: ws://localhost:${PORT}/ws`);
  console.log(`  💾  SQLite WAL mode — data in ./data/tsdb.sqlite\n`);
});

module.exports = { app, server, wss };
