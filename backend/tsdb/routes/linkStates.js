/**
 * Link-state + contact-window REST routes.
 *
 * POST   /sessions/:id/link-states           – Bulk ingest link states
 * GET    /sessions/:id/link-states            – Query link states by time range
 * DELETE /sessions/:id/link-states            – Delete all link states for session
 *
 * POST   /sessions/:id/contact-windows        – Bulk ingest contact windows
 * GET    /sessions/:id/contact-windows        – Query contact windows (filter by tx_id, rx_id)
 * DELETE /sessions/:id/contact-windows        – Delete all contact windows for session
 */

const express = require('express');
const { stmts, bulkInsertLinkStates, bulkInsertContactWindows } = require('../db');

const router = express.Router({ mergeParams: true });

/* ═══════════════  LINK STATES  ═══════════════ */

/**
 * POST /sessions/:id/link-states
 * Body: { states: [{ time_s, active_links: [...] }] }
 */
router.post('/link-states', (req, res) => {
  try {
    const sessionId = req.params.id;
    const { states } = req.body;

    if (!Array.isArray(states) || !states.length) {
      return res.status(400).json({ error: 'states array required' });
    }

    const rows = states.map((s) => ({
      session_id: sessionId,
      time_s: s.time_s ?? s.time,
      active_links: typeof s.active_links === 'string'
        ? s.active_links
        : JSON.stringify(s.active_links ?? s.activeLinks ?? []),
    }));

    bulkInsertLinkStates(rows);
    res.json({ inserted: rows.length });
  } catch (err) {
    console.error('POST link-states error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * GET /sessions/:id/link-states?from=0&to=3600&resolution=1
 */
router.get('/link-states', (req, res) => {
  try {
    const sessionId = req.params.id;
    const { from = 0, to = 999999999, resolution = 1 } = req.query;
    const fromT = Number(from);
    const toT = Number(to);
    const resn = Math.max(1, Math.round(Number(resolution)));

    let rows;
    if (resn <= 1) {
      rows = stmts.queryLinkStates.all(sessionId, fromT, toT);
    } else {
      rows = stmts.queryLinkStatesDownsampled.all(sessionId, fromT, toT, resn);
    }

    const states = rows.map((r) => ({
      time_s: r.time_s,
      active_links: JSON.parse(r.active_links),
    }));

    res.json({ states, count: states.length });
  } catch (err) {
    console.error('GET link-states error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * DELETE /sessions/:id/link-states
 */
router.delete('/link-states', (req, res) => {
  try {
    const sessionId = req.params.id;
    stmts.deleteLinkStates.run(sessionId);
    res.json({ message: 'Link states deleted' });
  } catch (err) {
    console.error('DELETE link-states error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/* ═══════════════  CONTACT WINDOWS  ═══════════════ */

/**
 * POST /sessions/:id/contact-windows
 * Body: { windows: [{ id, pair_id, tx_id, rx_id, sim_start, sim_end, closed }] }
 */
router.post('/contact-windows', (req, res) => {
  try {
    const sessionId = req.params.id;
    const { windows } = req.body;

    if (!Array.isArray(windows) || !windows.length) {
      return res.status(400).json({ error: 'windows array required' });
    }

    const rows = windows.map((w) => ({
      session_id: sessionId,
      id: w.id,
      pair_id: w.pair_id ?? w.pairId ?? null,
      tx_id: w.tx_id ?? w.txId ?? null,
      rx_id: w.rx_id ?? w.rxId ?? null,
      sim_start: w.sim_start ?? w.simStart ?? null,
      sim_end: w.sim_end ?? w.simEnd ?? null,
      closed: w.closed ? 1 : 0,
    }));

    bulkInsertContactWindows(rows);
    res.json({ inserted: rows.length });
  } catch (err) {
    console.error('POST contact-windows error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * GET /sessions/:id/contact-windows?tx_id=X&rx_id=Y
 */
router.get('/contact-windows', (req, res) => {
  try {
    const sessionId = req.params.id;
    const { tx_id, rx_id } = req.query;

    let rows;
    if (tx_id !== undefined && rx_id !== undefined) {
      rows = stmts.queryContactWindowsByPair.all(sessionId, String(tx_id), String(rx_id));
    } else if (tx_id !== undefined) {
      rows = stmts.queryContactWindowsByTx.all(sessionId, String(tx_id));
    } else {
      rows = stmts.queryContactWindows.all(sessionId);
    }

    const windows = rows.map((r) => ({
      id: r.id,
      pair_id: r.pair_id,
      tx_id: r.tx_id,
      rx_id: r.rx_id,
      sim_start: r.sim_start,
      sim_end: r.sim_end,
      closed: !!r.closed,
    }));

    res.json({ windows, count: windows.length });
  } catch (err) {
    console.error('GET contact-windows error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * DELETE /sessions/:id/contact-windows
 */
router.delete('/contact-windows', (req, res) => {
  try {
    const sessionId = req.params.id;
    stmts.deleteContactWindows.run(sessionId);
    res.json({ message: 'Contact windows deleted' });
  } catch (err) {
    console.error('DELETE contact-windows error:', err);
    res.status(500).json({ error: String(err) });
  }
});

module.exports = router;
