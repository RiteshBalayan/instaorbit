/**
 * useLinkDisplayData — Single source of truth for link display across ALL views.
 *
 * Every render surface (3D globe, LVLH, 2D map, timeline) MUST use this
 * to determine which links to show.  The linkDisplayMode in Redux controls
 * whether we show "connected" (connectivity-solver output) or "available"
 * (line-of-sight availability) links.
 *
 * This module exports:
 *   1. `getLinksAtTimeFromStore(store, renderTime)` — for useFrame (no React hooks)
 *   2. `useLinkDisplayData()` — React hook for component-level consumers
 *
 * Data shape returned by both:
 *   { connections: [{ txParentId, rxParentId, txNodeId?, rxNodeId?, ... }], mode }
 *
 * The `connections` array is in the same shape as connectedPairsTimeSeries[i].connections
 * so that all render code has ONE code path.
 */

/* ── Binary search: find entry with .time ≤ t ─────────────── */
function findStepAtTime(ts, t) {
  if (!ts || !ts.length) return null;
  let lo = 0, hi = ts.length - 1;
  if (t <= ts[0].time) return ts[0];
  if (t >= ts[hi].time) return ts[hi];
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (ts[mid].time <= t) lo = mid; else hi = mid - 1;
  }
  return ts[lo];
}

/**
 * Get the list of active link connections at `renderTime` based on the
 * current linkDisplayMode.  Reads directly from store (no hooks).
 *
 * Call this inside useFrame or any imperative context.
 *
 * @param {object} store - Redux store (from useStore())
 * @param {number} renderTime - current simulation elapsed seconds
 * @returns {{ connections: Array, mode: string, hasData: boolean }}
 */
/**
 * Check whether a sorted time-series array actually covers `renderTime`.
 * We use a generous tolerance (±5 s beyond the endpoints) so that
 * tiny floating-point scrub deltas don't disqualify the window.
 */
function windowCoversTime(ts, renderTime) {
  if (!ts || ts.length === 0) return false;
  const TOLERANCE = 5; // seconds
  return (renderTime >= ts[0].time - TOLERANCE &&
          renderTime <= ts[ts.length - 1].time + TOLERANCE);
}

/**
 * Normalise an availability-pairs step to the same { txParentId, rxParentId, … }
 * shape used by connected-pairs so all renderers have ONE code path.
 */
function normalisePairsToConnections(step) {
  if (!step?.pairs) return [];
  return step.pairs
    .filter(p => p.inLink)
    .map(p => ({
      txParentId: p.txId,
      rxParentId: p.rxId,
      txNodeId: p.txId,
      rxNodeId: p.rxId,
      rangeKm: p.rangeKm,
      elevationDeg: p.elevationDeg,
    }));
}

export function getLinksAtTimeFromStore(store, renderTime) {
  const state = store.getState();
  const comm = state.communication;
  const mode = comm.linkDisplayMode || 'connected';

  if (mode === 'connected') {
    // ── Pick the best data source for the requested renderTime ──
    // Prefer the TSDB ±60 s window ONLY if it actually covers the time
    // the caller is asking about.  Otherwise fall back to the full
    // in-memory connectedPairsTimeSeries which always has the whole sim.
    const visConn  = comm.visibleConnectivityStates || [];
    const fullConn = comm.connectedPairsTimeSeries  || [];

    const visCovering = windowCoversTime(visConn, renderTime);
    const tsData = visCovering ? visConn : fullConn;

    if (tsData.length === 0) {
      return { connections: [], mode, hasData: false };
    }
    const step = findStepAtTime(tsData, renderTime);
    return {
      connections: step?.connections || [],
      mode,
      hasData: true,
    };
  }

  // mode === 'available'
  const availTs = comm.availablePairsTimeSeries || [];
  if (availTs.length === 0) {
    return { connections: [], mode, hasData: false };
  }
  const step = findStepAtTime(availTs, renderTime);
  const connections = normalisePairsToConnections(step);
  return {
    connections,
    mode,
    hasData: connections.length > 0 || availTs.length > 0,
  };
}

/**
 * React hook version for component-level consumers (timeline, 2D map, etc.).
 * Uses useSelector so the component re-renders when mode or data changes.
 *
 * @param {number} renderTime - current simulation elapsed seconds
 * @returns {{ connections: Array, mode: string, hasData: boolean }}
 */
import { useMemo } from 'react';
import { useSelector } from 'react-redux';

export function useLinkDisplayData(renderTime) {
  const mode = useSelector(s => s.communication.linkDisplayMode || 'connected');
  const connectedTs = useSelector(s => s.communication.connectedPairsTimeSeries);
  const visConnStates = useSelector(s => s.communication.visibleConnectivityStates);
  const availableTs = useSelector(s => s.communication.availablePairsTimeSeries);

  return useMemo(() => {
    if (mode === 'connected') {
      // Same window-validation logic as getLinksAtTimeFromStore
      const visCovering = windowCoversTime(visConnStates, renderTime);
      const tsData = visCovering ? visConnStates : (connectedTs || []);
      if (tsData.length === 0) return { connections: [], mode, hasData: false };
      const step = findStepAtTime(tsData, renderTime);
      return { connections: step?.connections || [], mode, hasData: true };
    }
    // available
    const availData = availableTs || [];
    if (availData.length === 0) return { connections: [], mode, hasData: false };
    const step = findStepAtTime(availData, renderTime);
    const connections = normalisePairsToConnections(step);
    return {
      connections,
      mode,
      hasData: connections.length > 0 || availData.length > 0,
    };
  }, [mode, connectedTs, visConnStates, availableTs, renderTime]);
}
