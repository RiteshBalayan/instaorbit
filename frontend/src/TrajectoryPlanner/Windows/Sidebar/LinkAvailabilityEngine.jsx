/**
 * LinkAvailabilityEngine — headless component that provides
 * link availability data at the current render time.
 *
 * This is the ISOLATED Feature 1 output: it reads the pre-computed
 * `availablePairsTimeSeries` from Redux and makes the current-time
 * slice available for other consumers (Feature 2 connectivity,
 * Feature 3 rendering, UI panels, etc.).
 *
 * In LIVE mode (no bulk data), it computes availability on-the-fly
 * using the same link budget math, dispatching only the availability
 * data — NOT activeLinks for rendering (that stays in LinkEngine).
 *
 * Must stay mounted at all times (alongside LinkEngine).
 */

import { useEffect, useMemo, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  setAvailablePairsTimeSeries,
  updateContactWindows,
} from '../../../Store/communicationSlice';
import { computeLink, getEndpointPos } from './linkComputation';

/**
 * Binary-search helper: find the entry in a sorted time-series array
 * whose `time` is closest to (but ≤) the given render time.
 */
function findAtTime(timeSeries, renderTime) {
  if (!timeSeries || timeSeries.length === 0) return null;
  let lo = 0;
  let hi = timeSeries.length - 1;
  // If renderTime is before the first entry, return the first
  if (renderTime <= timeSeries[0].time) return timeSeries[0];
  // If renderTime is after the last entry, return the last
  if (renderTime >= timeSeries[hi].time) return timeSeries[hi];
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (timeSeries[mid].time <= renderTime) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return timeSeries[lo];
}

const LinkAvailabilityEngine = () => {
  const dispatch = useDispatch();
  const links = useSelector((s) => s.communication.links) || [];
  const currentStates = useSelector((s) => s.CurrentState.satelite) || [];
  const groundStations = useSelector((s) => s.groundStations.groundStations) || [];
  const particles = useSelector((s) => s.particles?.particles || []);
  const visibleTracePoints = useSelector((s) => s.particles?.visibleTracePoints || {});
  const renderTime = useSelector((s) => s.timer.RenderTime);
  const starttime = useSelector((s) => s.timer.starttime);
  const globalThresholds = useSelector((s) => s.communication.globalThresholds || {});
  const lastWindowUpdateRef = useRef(0);

  // Pre-computed bulk data
  const availablePairsTimeSeries = useSelector((s) => s.communication.availablePairsTimeSeries);
  const activeLinksAtTime = useSelector((s) => s.communication.activeLinksAtTime);

  // ── BULK PATH: availability data is already loaded ──────────
  // When bulk data exists, LinkAvailabilityEngine is passive —
  // the data is already in Redux from BulkSimControls.
  // We just expose a current-time lookup that consumers can use.
  // (Nothing to dispatch — data is already there.)

  // ── LIVE PATH: compute availability on-the-fly ──────────────
  const ctx = useMemo(
    () => ({ currentStates, groundStations, particles, renderTime, starttime, globalThresholds, visibleTracePoints }),
    [currentStates, groundStations, particles, renderTime, starttime, globalThresholds, visibleTracePoints],
  );

  useEffect(() => {
    // If bulk data exists, skip live computation
    if (availablePairsTimeSeries?.length > 0 || activeLinksAtTime) return;
    if (!links.length) return;

    // Compute link budget for all configured links
    const results = links.map((cfg) => computeLink(cfg, ctx));

    // Build availability pairs (data only, no positions)
    const pairs = results
      .filter((r) => r.ready && r.inLink)
      .map((r) => ({
        txId: r.txId,
        rxId: r.rxId,
        rangeKm: r.rangeKm,
        elevationDeg: r.elevationDeg,
        snrDb: r.snrDb,
        linkMargin: r.linkMargin,
        inLink: r.inLink,
      }));

    // In LIVE mode, we update a single-entry time series
    // This is a lightweight approach — the full time series
    // is only built during bulk sim.
    // For now, just update contact windows (existing behavior).
    const now = Date.now();
    if (now - lastWindowUpdateRef.current >= 1000) {
      lastWindowUpdateRef.current = now;
      const activeLinkIds = results
        .filter((r) => r.ready && r.inLink)
        .map((r) => `${r.txId}→${r.rxId}`);
      const simTimeMs = starttime + renderTime * 1000;
      dispatch(updateContactWindows({ activeLinkIds, simTimeMs }));
    }
  }, [links, renderTime, ctx, availablePairsTimeSeries, activeLinksAtTime, dispatch, starttime]);

  // Headless — renders nothing
  return null;
};

/**
 * Get the available pairs at a specific render time from the time series.
 * Exported as a standalone utility for use in other components.
 */
export function getAvailablePairsAtTime(availablePairsTimeSeries, renderTime) {
  const entry = findAtTime(availablePairsTimeSeries, renderTime);
  return entry?.pairs || [];
}

export default LinkAvailabilityEngine;
