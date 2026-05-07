/**
 * TSDB — SQLite database layer for InstaOrbit time-series data.
 *
 * Uses better-sqlite3 in WAL mode for concurrent read/write.
 * Schema covers: sessions, trace_points, link_states, contact_windows.
 *
 * All heavy simulation data lives here instead of Redux,
 * keeping the frontend memory footprint small and constant.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

/* ── Ensure data directory exists ─────────────────────────── */
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'tsdb.sqlite');

/* ── Open database ────────────────────────────────────────── */
const db = new Database(DB_PATH);

/* ── Pragmas for performance ──────────────────────────────── */
db.pragma('journal_mode = WAL');       // concurrent reads during writes
db.pragma('synchronous = NORMAL');     // safe + fast
db.pragma('cache_size = -64000');      // 64 MB page cache
db.pragma('temp_store = MEMORY');      // temp tables in RAM
db.pragma('mmap_size = 268435456');    // 256 MB memory-mapped I/O

/* ── Schema migration ─────────────────────────────────────── */
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    session_id  TEXT PRIMARY KEY,
    user_id     TEXT,
    project_id  TEXT,
    created_at  INTEGER DEFAULT (strftime('%s','now')),
    metadata    TEXT
  );

  CREATE TABLE IF NOT EXISTS trace_points (
    session_id  TEXT    NOT NULL,
    sat_id      INTEGER NOT NULL,
    time_s      REAL    NOT NULL,
    x           REAL,
    y           REAL,
    z           REAL,
    map_x       REAL,
    map_y       REAL,
    lat         REAL,
    lon         REAL,
    alt         REAL,
    vx          REAL,
    vy          REAL,
    vz          REAL,
    qx          REAL,
    qy          REAL,
    qz          REAL,
    qw          REAL,
    component_angles TEXT,
    PRIMARY KEY (session_id, sat_id, time_s)
  ) WITHOUT ROWID;

  CREATE TABLE IF NOT EXISTS link_states (
    session_id   TEXT NOT NULL,
    time_s       REAL NOT NULL,
    active_links TEXT,
    PRIMARY KEY (session_id, time_s)
  ) WITHOUT ROWID;

  CREATE TABLE IF NOT EXISTS contact_windows (
    session_id TEXT NOT NULL,
    id         TEXT NOT NULL,
    pair_id    TEXT,
    tx_id      TEXT,
    rx_id      TEXT,
    sim_start  REAL,
    sim_end    REAL,
    closed     INTEGER DEFAULT 0,
    PRIMARY KEY (session_id, id)
  );

  CREATE TABLE IF NOT EXISTS connectivity_states (
    session_id   TEXT NOT NULL,
    time_s       REAL NOT NULL,
    connections  TEXT,
    PRIMARY KEY (session_id, time_s)
  ) WITHOUT ROWID;

  CREATE TABLE IF NOT EXISTS connection_windows (
    session_id  TEXT NOT NULL,
    id          TEXT NOT NULL,
    pair_id     TEXT,
    tx_node_id  TEXT,
    rx_node_id  TEXT,
    sim_start   REAL,
    sim_end     REAL,
    closed      INTEGER DEFAULT 0,
    PRIMARY KEY (session_id, id)
  );

  CREATE INDEX IF NOT EXISTS idx_trace_session_sat_time
    ON trace_points(session_id, sat_id, time_s);

  CREATE INDEX IF NOT EXISTS idx_links_session_time
    ON link_states(session_id, time_s);

  CREATE INDEX IF NOT EXISTS idx_connectivity_session_time
    ON connectivity_states(session_id, time_s);

  CREATE INDEX IF NOT EXISTS idx_sessions_user
    ON sessions(user_id);

  CREATE INDEX IF NOT EXISTS idx_sessions_project
    ON sessions(project_id);
`);

/* ── Prepared statements (reusable, much faster) ──────────── */

const stmts = {
  /* Sessions */
  insertSession: db.prepare(`
    INSERT OR REPLACE INTO sessions (session_id, user_id, project_id, metadata)
    VALUES (?, ?, ?, ?)
  `),
  getSession: db.prepare(`
    SELECT * FROM sessions WHERE session_id = ?
  `),
  deleteSession: db.prepare(`
    DELETE FROM sessions WHERE session_id = ?
  `),
  listUserSessions: db.prepare(`
    SELECT * FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50
  `),

  /* Trace points */
  insertTracePoint: db.prepare(`
    INSERT OR REPLACE INTO trace_points
    (session_id, sat_id, time_s, x, y, z, map_x, map_y, lat, lon, alt, vx, vy, vz, qx, qy, qz, qw, component_angles)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  queryTracePoints: db.prepare(`
    SELECT * FROM trace_points
    WHERE session_id = ? AND sat_id = ? AND time_s BETWEEN ? AND ?
    ORDER BY time_s
  `),
  queryTracePointsDownsampled: db.prepare(`
    SELECT * FROM trace_points
    WHERE session_id = ? AND sat_id = ? AND time_s BETWEEN ? AND ?
      AND CAST(time_s AS INTEGER) % ? = 0
    ORDER BY time_s
  `),
  getTraceTimeRange: db.prepare(`
    SELECT MIN(time_s) AS min_t, MAX(time_s) AS max_t, COUNT(*) AS count
    FROM trace_points
    WHERE session_id = ? AND sat_id = ?
  `),
  getSatIds: db.prepare(`
    SELECT DISTINCT sat_id FROM trace_points WHERE session_id = ?
  `),
  deleteTracePoints: db.prepare(`
    DELETE FROM trace_points WHERE session_id = ?
  `),
  deleteTracePointsForSat: db.prepare(`
    DELETE FROM trace_points WHERE session_id = ? AND sat_id = ?
  `),

  /* Link states */
  insertLinkState: db.prepare(`
    INSERT OR REPLACE INTO link_states (session_id, time_s, active_links)
    VALUES (?, ?, ?)
  `),
  queryLinkStates: db.prepare(`
    SELECT * FROM link_states
    WHERE session_id = ? AND time_s BETWEEN ? AND ?
    ORDER BY time_s
  `),
  queryLinkStatesDownsampled: db.prepare(`
    SELECT * FROM link_states
    WHERE session_id = ? AND time_s BETWEEN ? AND ?
      AND CAST(time_s AS INTEGER) % ? = 0
    ORDER BY time_s
  `),
  deleteLinkStates: db.prepare(`
    DELETE FROM link_states WHERE session_id = ?
  `),

  /* Contact windows */
  insertContactWindow: db.prepare(`
    INSERT OR REPLACE INTO contact_windows
    (session_id, id, pair_id, tx_id, rx_id, sim_start, sim_end, closed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `),
  queryContactWindows: db.prepare(`
    SELECT * FROM contact_windows WHERE session_id = ? ORDER BY sim_start
  `),
  queryContactWindowsByTx: db.prepare(`
    SELECT * FROM contact_windows WHERE session_id = ? AND tx_id = ? ORDER BY sim_start
  `),
  queryContactWindowsByPair: db.prepare(`
    SELECT * FROM contact_windows WHERE session_id = ? AND tx_id = ? AND rx_id = ? ORDER BY sim_start
  `),
  deleteContactWindows: db.prepare(`
    DELETE FROM contact_windows WHERE session_id = ?
  `),

  /* Connectivity states */
  insertConnectivityState: db.prepare(`
    INSERT OR REPLACE INTO connectivity_states (session_id, time_s, connections)
    VALUES (?, ?, ?)
  `),
  queryConnectivityStates: db.prepare(`
    SELECT * FROM connectivity_states
    WHERE session_id = ? AND time_s BETWEEN ? AND ?
    ORDER BY time_s
  `),
  queryConnectivityStatesDownsampled: db.prepare(`
    SELECT * FROM connectivity_states
    WHERE session_id = ? AND time_s BETWEEN ? AND ?
      AND CAST(time_s AS INTEGER) % ? = 0
    ORDER BY time_s
  `),
  deleteConnectivityStates: db.prepare(`
    DELETE FROM connectivity_states WHERE session_id = ?
  `),

  /* Connection windows */
  insertConnectionWindow: db.prepare(`
    INSERT OR REPLACE INTO connection_windows
    (session_id, id, pair_id, tx_node_id, rx_node_id, sim_start, sim_end, closed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `),
  queryConnectionWindows: db.prepare(`
    SELECT * FROM connection_windows WHERE session_id = ? ORDER BY sim_start
  `),
  queryConnectionWindowsByNode: db.prepare(`
    SELECT * FROM connection_windows
    WHERE session_id = ? AND (tx_node_id = ? OR rx_node_id = ?)
    ORDER BY sim_start
  `),
  deleteConnectionWindows: db.prepare(`
    DELETE FROM connection_windows WHERE session_id = ?
  `),
};

/* ── Bulk insert helpers (wrapped in transactions) ────────── */

const bulkInsertTracePoints = db.transaction((rows) => {
  for (const r of rows) {
    stmts.insertTracePoint.run(
      r.session_id, r.sat_id, r.time_s,
      r.x, r.y, r.z, r.map_x, r.map_y,
      r.lat, r.lon, r.alt,
      r.vx, r.vy, r.vz,
      r.qx, r.qy, r.qz, r.qw,
      r.component_angles || null,
    );
  }
});

const bulkInsertLinkStates = db.transaction((rows) => {
  for (const r of rows) {
    stmts.insertLinkState.run(r.session_id, r.time_s, r.active_links);
  }
});

const bulkInsertContactWindows = db.transaction((rows) => {
  for (const r of rows) {
    stmts.insertContactWindow.run(
      r.session_id, r.id, r.pair_id, r.tx_id, r.rx_id,
      r.sim_start, r.sim_end, r.closed ? 1 : 0,
    );
  }
});

const bulkInsertConnectivityStates = db.transaction((rows) => {
  for (const r of rows) {
    stmts.insertConnectivityState.run(r.session_id, r.time_s, r.connections);
  }
});

const bulkInsertConnectionWindows = db.transaction((rows) => {
  for (const r of rows) {
    stmts.insertConnectionWindow.run(
      r.session_id, r.id, r.pair_id, r.tx_node_id, r.rx_node_id,
      r.sim_start, r.sim_end, r.closed ? 1 : 0,
    );
  }
});

const clearSessionData = db.transaction((sessionId) => {
  stmts.deleteTracePoints.run(sessionId);
  stmts.deleteLinkStates.run(sessionId);
  stmts.deleteContactWindows.run(sessionId);
  stmts.deleteConnectivityStates.run(sessionId);
  stmts.deleteConnectionWindows.run(sessionId);
});

/* ── Exports ──────────────────────────────────────────────── */
module.exports = {
  db,
  stmts,
  bulkInsertTracePoints,
  bulkInsertLinkStates,
  bulkInsertContactWindows,
  bulkInsertConnectivityStates,
  bulkInsertConnectionWindows,
  clearSessionData,
};
