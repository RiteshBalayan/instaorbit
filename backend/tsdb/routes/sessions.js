/**
 * Session CRUD routes for the TSDB server.
 *
 * POST   /sessions           – Create a new session
 * GET    /sessions/:id       – Get session metadata
 * DELETE /sessions/:id       – Delete session and all associated data
 * GET    /sessions?user_id=X – List sessions for a user
 * POST   /sessions/:id/clear – Clear all time-series data (keep session)
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { stmts, clearSessionData } = require('../db');

const router = express.Router();

/* ── POST /sessions ─── Create session ────────────────────── */
router.post('/', (req, res) => {
  try {
    const { session_id, user_id, project_id, metadata } = req.body;
    const id = session_id || uuidv4();
    stmts.insertSession.run(
      id,
      user_id || null,
      project_id || null,
      metadata ? JSON.stringify(metadata) : null,
    );
    const session = stmts.getSession.get(id);
    res.status(201).json(session);
  } catch (err) {
    console.error('POST /sessions error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/* ── GET /sessions?user_id=X ─── List sessions ───────────── */
router.get('/', (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) {
      return res.status(400).json({ error: 'user_id query param required' });
    }
    const sessions = stmts.listUserSessions.all(user_id);
    res.json({ sessions });
  } catch (err) {
    console.error('GET /sessions error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/* ── GET /sessions/:id ─── Get session ────────────────────── */
router.get('/:id', (req, res) => {
  try {
    const session = stmts.getSession.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(session);
  } catch (err) {
    console.error('GET /sessions/:id error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/* ── POST /sessions/:id/clear ─── Clear data, keep session ── */
router.post('/:id/clear', (req, res) => {
  try {
    const session = stmts.getSession.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    clearSessionData(req.params.id);
    res.json({ message: 'Session data cleared', session_id: req.params.id });
  } catch (err) {
    console.error('POST /sessions/:id/clear error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/* ── DELETE /sessions/:id ─── Delete session and data ──────── */
router.delete('/:id', (req, res) => {
  try {
    clearSessionData(req.params.id);
    stmts.deleteSession.run(req.params.id);
    res.json({ message: 'Session deleted', session_id: req.params.id });
  } catch (err) {
    console.error('DELETE /sessions/:id error:', err);
    res.status(500).json({ error: String(err) });
  }
});

module.exports = router;
