/**
 * useTracePoints — Unified hook for accessing trace-point data.
 *
 * Provides a single interface for components to get trace points,
 * automatically choosing the best data source:
 *
 *   1. TSDB visibleTracePoints (high-res ±60 s window) — preferred
 *   2. TSDB lowResTimelines (every 10 s, full duration) — for orbit lines
 *   3. Legacy particle.tracePoints (full in-Redux) — fallback
 *
 * Returns:
 *   { highRes, lowRes, combined, hasData }
 *
 *   - highRes: points near current time (full fidelity)
 *   - lowRes:  points for full timeline (every ~10 s)
 *   - combined: merged & deduped, suitable for orbit-track rendering
 *   - hasData:  boolean
 */

import { useMemo } from 'react';
import { useSelector, shallowEqual } from 'react-redux';

/**
 * @param {number|string} satId — satellite / particle ID
 * @returns {{ highRes: object[], lowRes: object[], combined: object[], hasData: boolean }}
 */
export default function useTracePoints(satId) {
  // TSDB-backed windowed data (set by timeSeriesClient.syncToTime)
  const visiblePts = useSelector(
    (s) => s.particles.visibleTracePoints?.[satId],
    shallowEqual
  );
  const lowResPts = useSelector(
    (s) => s.particles.lowResTimelines?.[satId],
    shallowEqual
  );

  // Legacy: full trace points array on the particle object
  const legacyPts = useSelector(
    (s) => s.particles.particles?.find?.((p) => p.id === satId)?.tracePoints,
    shallowEqual
  );

  // Choose data sources
  const highRes = visiblePts?.length ? visiblePts : (legacyPts || []);
  const lowRes = lowResPts?.length ? lowResPts : [];

  // Combined: merge low-res + high-res, dedupe by time, sorted
  const combined = useMemo(() => {
    if (!lowRes.length && !highRes.length) return legacyPts || [];
    if (!lowRes.length) return highRes;
    if (!highRes.length) return lowRes;

    // Merge: use a Map keyed by time to deduplicate (high-res wins)
    const byTime = new Map();
    for (const p of lowRes)  byTime.set(p.time, p);
    for (const p of highRes) byTime.set(p.time, p); // overwrite with high-res
    const merged = Array.from(byTime.values());
    merged.sort((a, b) => a.time - b.time);
    return merged;
  }, [highRes, lowRes, legacyPts]);

  const hasData = combined.length > 0;

  return { highRes, lowRes, combined, hasData };
}
