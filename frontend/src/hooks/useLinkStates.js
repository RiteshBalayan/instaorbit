/**
 * useLinkStates — Unified hook for accessing link-state data.
 *
 * Provides a single interface for components to get active links at a given time,
 * choosing the best data source:
 *
 *   1. TSDB visibleLinkStates (windowed) — preferred
 *   2. Legacy activeLinksAtTime (pre-computed full map) — fallback
 *
 * Returns:
 *   { getLinksAtTime, visibleStates, hasData }
 */

import { useMemo, useCallback } from 'react';
import { useSelector, shallowEqual } from 'react-redux';

/**
 * @returns {{
 *   getLinksAtTime: (time: number) => object[],
 *   visibleStates: Array<{ time_s: number, active_links: object[] }>,
 *   hasData: boolean
 * }}
 */
export default function useLinkStates() {
  // TSDB-backed windowed link states
  const visibleStates = useSelector(
    (s) => s.communication.visibleLinkStates,
    shallowEqual
  ) || [];

  // Legacy: full pre-computed map
  const activeLinksAtTime = useSelector(
    (s) => s.communication.activeLinksAtTime
  );

  const hasData = visibleStates.length > 0 || activeLinksAtTime != null;

  /**
   * Look up active links at a given simulation time.
   * Prefers TSDB data, falls back to legacy map.
   */
  const getLinksAtTime = useCallback((time) => {
    // 1. Try TSDB visible states (find closest time)
    if (visibleStates.length > 0) {
      const t = Math.round(time);
      // Binary search or linear scan (array is small — windowed)
      let best = null;
      let bestDist = Infinity;
      for (const s of visibleStates) {
        const dist = Math.abs(s.time_s - t);
        if (dist < bestDist) {
          bestDist = dist;
          best = s;
        }
      }
      if (best && bestDist <= 1) {
        return best.active_links || [];
      }
    }

    // 2. Fall back to legacy pre-computed map
    if (activeLinksAtTime) {
      const key = String(Math.round(time));
      return activeLinksAtTime[key] || [];
    }

    return [];
  }, [visibleStates, activeLinksAtTime]);

  return { getLinksAtTime, visibleStates, hasData };
}
