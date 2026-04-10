/**
 * buildSavePayload — Sanitise the full Redux store before uploading to Firebase.
 *
 * Firestore documents have a 1 MB size limit.  The raw Redux state can easily
 * exceed this because of:
 *   • particles.tracePoints (100k+ entries from bulk sim)
 *   • communication.activeLinksAtTime (huge pre-computed lookup table)
 *   • communication.linkHistory / contactEvents (large runtime arrays)
 *   • CurrentState satellite coordinates (re-derived every sim step)
 *
 * This function keeps all *user-configured* data (satellite configs,
 * orbital elements, bodyFrame, components, burns, ground stations, links,
 * global thresholds, view preferences, groups, timer config) while
 * stripping large runtime/ephemeral arrays that are recomputed on sim start.
 *
 * The TSDB session ID is persisted so that time-series data can be
 * re-associated with the project on reload (without re-simulating).
 *
 * @param {Object} reduxState – the full Redux store snapshot
 * @param {Object} [opts] – optional extras
 * @param {string} [opts.tsdbSessionId] – TSDB session ID from timeSeriesClient
 * @returns {Object} – cleaned state safe for Firestore upload
 */
export function buildSavePayload(reduxState, opts = {}) {
  const s = reduxState;

  // ── Timer — keep config, drop transient events ────────────
  const timer = {
    ...(s.timer || {}),
    // Keep: starttime, elapsedTime, RenderTime, timeStep, renderStep,
    //       playbackSpeed, simulationDuration, loopMode, coupled, timePoints
    // Drop heavy runtime arrays
    events: [],
    eclipseStates: {},
    orbitalEvents: [],
    // Always restore paused
    isRunning: false,
  };

  // ── Particles — keep skeleton (id, name) but clear trace points ──
  const particles = {
    particles: (s.particles?.particles || []).map((p) => ({
      ...p,
      tracePoints: [],  // recomputed on sim run — can be 100k+ entries
    })),
    // Strip TSDB windowed data (ephemeral, reconstructed from TSDB on load)
    visibleTracePoints: {},
    lowResTimelines: {},
  };

  // ── CurrentState — keep satellite entries but clear coordinates ──
  // Coordinates are ephemeral (recomputed every step from orbital elements).
  // Keep the satellite roster so IDs are preserved.
  const CurrentState = {
    satelite: (s.CurrentState?.satelite || []).map((sat) => ({
      id: sat.id,
      name: sat.name,
      color: sat.color,
      // Clear per-step fields
      coordinates: {},
      velocity: null,
      elements: null,
      eclipseState: null,
      derived: null,
      attitude: null,
      componentAngles: null,
    })),
  };

  // ── Satellites — keep everything (user config, bodyFrame, components, burns)
  const satellites = s.satellites || { satellitesConfig: [] };

  // ── WorkingProject — keep as-is ──────────────────────────
  const workingProject = s.workingProject || {};

  // ── Ground stations — keep full config ────────────────────
  const groundStations = {
    groundStations: (s.groundStations?.groundStations || []),
    // Drop ephemeral runtime data
    contactWindows: {},
    currentTracking: {},
  };

  // ── Communication — keep link definitions & thresholds,
  //    strip large runtime data ──────────────────────────────
  const comm = s.communication || {};
  const communication = {
    // User-configured
    links: comm.links || [],
    globalThresholds: comm.globalThresholds || { minElevationDeg: 10, maxDistanceKm: null },
    // Keep persisted contact windows (small, useful for display)
    contactWindows: comm.contactWindows || [],
    // Drop transient / huge runtime data
    activeLinks: [],
    activeLinksAtTime: null,  // huge bulk-sim lookup table
    visibleLinkStates: {},    // TSDB windowed data — reconstructed from TSDB
    linkHistory: [],          // legacy, can be huge
    contactEvents: [],
    predictedContacts: [],
    dopplerData: {},
    linkStats: {},
    handoverQueue: [],
    activeHandovers: [],
  };

  // ── View — keep all user preferences ──────────────────────
  const view = s.view || {};

  // ── Groups — keep all ─────────────────────────────────────
  const groups = s.groups || { groups: [], selectedGroup: null };

  return {
    timer,
    particles,
    CurrentState,
    satellites,
    workingProject,
    groundStations,
    communication,
    view,
    groups,
    // TSDB session ID — allows re-association of time-series data on reload
    ...(opts.tsdbSessionId ? { tsdbSessionId: opts.tsdbSessionId } : {}),
  };
}

export default buildSavePayload;
