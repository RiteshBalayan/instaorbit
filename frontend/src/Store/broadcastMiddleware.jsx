/**
 * broadcastMiddleware — Syncs Redux state from the master tab to daughter
 * display tabs via BroadcastChannel.
 *
 * Master tab:  dispatches actions → middleware broadcasts full state snapshot
 * Daughter tab: listens for broadcasts → replaces its entire Redux store
 *
 * We use a FULL_STATE_SYNC action type so the daughter store can wholesale
 * replace its state tree on every broadcast.
 */

export const FULL_STATE_SYNC = '@@broadcast/FULL_STATE_SYNC';
const CHANNEL_NAME = 'instaorbit-state-sync';

/* ── Throttle helper ─────────────────────────────────────────── */
let _pending = false;
let _latestState = null;

function schedulePost(channel, state) {
  _latestState = state;
  if (_pending) return;              // a frame is already scheduled
  _pending = true;
  requestAnimationFrame(() => {
    _pending = false;
    if (!_latestState) return;
    try {
      channel.postMessage({ type: FULL_STATE_SYNC, state: _latestState });
    } catch { /* channel closed */ }
    _latestState = null;
  });
}

/**
 * Create the broadcast middleware (master side).
 * Only slices relevant to rendering are sent to keep message size reasonable.
 */
export function createBroadcastMiddleware() {
  const channel = new BroadcastChannel(CHANNEL_NAME);

  return (store) => (next) => (action) => {
    const result = next(action);

    // Don't re-broadcast syncs that came IN from the channel
    if (action.type === FULL_STATE_SYNC) return result;

    const full = store.getState();

    // Only send slices that daughter tabs actually need for rendering.
    // Strip heavy time-series data — daughter tabs will get their own
    // TSDB windows via timeSeriesClient or the lightweight Redux fields.
    const particles = full.particles;
    const lightParticles = {
      ...particles,
      // Send only the windowed TSDB data (small), not the full legacy arrays
      particles: (particles.particles || []).map((p) => ({
        ...p,
        tracePoints: [],  // stripped — daughter uses visibleTracePoints / lowResTimelines
      })),
      // Keep TSDB windowed data (already small — ±60 s high-res + 10 s low-res)
      visibleTracePoints: particles.visibleTracePoints,
      lowResTimelines: particles.lowResTimelines,
    };

    const comm = full.communication;
    const lightComm = {
      ...comm,
      // Strip heavy bulk lookup table; keep TSDB-backed visible window
      activeLinksAtTime: null,
      visibleLinkStates: comm.visibleLinkStates,
    };

    const payload = {
      particles:     lightParticles,
      timer:         full.timer,
      CurrentState:  full.CurrentState,
      satellites:    full.satellites,
      view:          full.view,
      groundStations: full.groundStations,
      communication: lightComm,
      groups:        full.groups,
    };

    schedulePost(channel, payload);

    return result;
  };
}

/**
 * Listen for state broadcasts (daughter side).
 * Call this once from main.jsx when the page is a daughter display.
 */
export function listenForBroadcasts(store) {
  const channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = (event) => {
    if (event.data?.type === FULL_STATE_SYNC) {
      store.dispatch({ type: FULL_STATE_SYNC, payload: event.data.state });
    }
  };
  return channel;
}
