/**
 * Trace-point REST routes.
 *
 * POST /sessions/:id/trace-points          – Bulk ingest
 * GET  /sessions/:id/trace-points          – Query with downsampling
 * GET  /sessions/:id/trace-points/meta     – Time range & count per satellite
 * GET  /sessions/:id/trace-points/sat-ids  – List satellite IDs with data
 * DELETE /sessions/:id/trace-points/:satId – Delete data for one satellite
 */

const express = require('express');
const { stmts, bulkInsertTracePoints } = require('../db');

const router = express.Router({ mergeParams: true });

/* ── POST /sessions/:id/trace-points ─── Bulk ingest ──────── */
router.post('/', (req, res) => {
  try {
    const sessionId = req.params.id;
    const { points } = req.body; // [{ sat_id, time_s, x, y, z, ... }]

    if (!Array.isArray(points) || !points.length) {
      return res.status(400).json({ error: 'points array required' });
    }

    // Attach session_id to each row
    const rows = points.map((p) => ({
      session_id: sessionId,
      sat_id: p.sat_id,
      time_s: p.time_s ?? p.time,
      x: p.x, y: p.y, z: p.z,
      map_x: p.map_x ?? p.mapX,
      map_y: p.map_y ?? p.mapY,
      lat: p.lat, lon: p.lon, alt: p.alt,
      vx: p.vx, vy: p.vy, vz: p.vz,
      qx: p.qx, qy: p.qy, qz: p.qz, qw: p.qw,
      component_angles: p.component_angles
        ? (typeof p.component_angles === 'string' ? p.component_angles : JSON.stringify(p.component_angles))
        : (p.componentAngles ? JSON.stringify(p.componentAngles) : null),
    }));

    bulkInsertTracePoints(rows);

    res.json({ inserted: rows.length });
  } catch (err) {
    console.error('POST trace-points error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/* ── GET /sessions/:id/trace-points ─── Query ─────────────── */
router.get('/', (req, res) => {
  try {
    const sessionId = req.params.id;
    const {
      sat_id,
      from = 0,
      to = 999999999,
      resolution = 1,
    } = req.query;

    if (sat_id === undefined) {
      return res.status(400).json({ error: 'sat_id query param required' });
    }

    const satId = Number(sat_id);
    const fromT = Number(from);
    const toT = Number(to);
    const resn = Math.max(1, Math.round(Number(resolution)));

    let rows;
    if (resn <= 1) {
      rows = stmts.queryTracePoints.all(sessionId, satId, fromT, toT);
    } else {
      rows = stmts.queryTracePointsDownsampled.all(sessionId, satId, fromT, toT, resn);
    }

    // Parse component_angles JSON
    const points = rows.map((r) => ({
      ...r,
      component_angles: r.component_angles ? JSON.parse(r.component_angles) : null,
    }));

    res.json({ points, count: points.length });
  } catch (err) {
    console.error('GET trace-points error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/* ── GET /sessions/:id/trace-points/meta ─── Time range ───── */
router.get('/meta', (req, res) => {
  try {
    const sessionId = req.params.id;
    const { sat_id } = req.query;

    if (sat_id === undefined) {
      return res.status(400).json({ error: 'sat_id query param required' });
    }

    const meta = stmts.getTraceTimeRange.get(sessionId, Number(sat_id));
    res.json(meta || { min_t: null, max_t: null, count: 0 });
  } catch (err) {
    console.error('GET trace-points/meta error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/* ── GET /sessions/:id/trace-points/sat-ids ─── Satellite list */
router.get('/sat-ids', (req, res) => {
  try {
    const sessionId = req.params.id;
    const rows = stmts.getSatIds.all(sessionId);
    res.json({ sat_ids: rows.map((r) => r.sat_id) });
  } catch (err) {
    console.error('GET trace-points/sat-ids error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/* ── DELETE /sessions/:id/trace-points/:satId ────────────── */
router.delete('/:satId', (req, res) => {
  try {
    const sessionId = req.params.id;
    const satId = Number(req.params.satId);
    stmts.deleteTracePointsForSat.run(sessionId, satId);
    res.json({ message: `Trace points deleted for sat ${satId}` });
  } catch (err) {
    console.error('DELETE trace-points error:', err);
    res.status(500).json({ error: String(err) });
  }
});

module.exports = router;
