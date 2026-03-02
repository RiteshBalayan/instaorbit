/**
 * LinkEngine — headless component that continuously computes link budgets
 * and dispatches activeLinks + contactWindows to Redux.
 *
 * In BULK mode (activeLinksAtTime exists in Redux), it simply looks up
 * the pre-computed activeLinks for the current RenderTime — zero computation.
 *
 * In LIVE mode (normal sim), it computes links on-the-fly as before.
 *
 * Must stay mounted at all times (see Globe.jsx).
 */

import { useEffect, useMemo, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setActiveLinks, updateContactWindows } from '../../../Store/communicationSlice';
import { computeLink, getEndpointPos } from './linkComputation';
import { SCALE_FACTOR } from '../../../transforms';

const LinkEngine = () => {
  const dispatch = useDispatch();
  const links = useSelector((s) => s.communication.links) || [];
  const currentStates = useSelector((s) => s.CurrentState.satelite) || [];
  const groundStations = useSelector((s) => s.groundStations.groundStations) || [];
  const particles = useSelector((s) => s.particles?.particles || []);
  const renderTime = useSelector((s) => s.timer.RenderTime);
  const starttime = useSelector((s) => s.timer.starttime);
  const lastWindowUpdateRef = useRef(0);

  // ── Bulk pre-computed data (null when in live mode) ────────
  const activeLinksAtTime = useSelector((s) => s.communication.activeLinksAtTime);

  // ── BULK PATH: just look up pre-computed activeLinks ───────
  useEffect(() => {
    if (!activeLinksAtTime) return; // live mode — handled below

    // Find the closest time key <= renderTime
    const timeKey = Math.floor(renderTime);
    const precomputed = activeLinksAtTime[timeKey] || activeLinksAtTime[String(timeKey)] || [];
    dispatch(setActiveLinks(precomputed));
  }, [activeLinksAtTime, renderTime, dispatch]);

  // ── LIVE PATH: compute on-the-fly (original behavior) ─────
  // Build the context object that computeLink expects
  const ctx = useMemo(
    () => ({ currentStates, groundStations, particles, renderTime, starttime }),
    [currentStates, groundStations, particles, renderTime, starttime],
  );

  // A key that changes when satellite positions meaningfully change
  const satPosKey = useMemo(
    () =>
      `rt-${renderTime}-` +
      currentStates
        .map((s) => `${s.id}-${s.coordinates?.x?.toFixed?.(4)}`)
        .join('|'),
    [currentStates, renderTime],
  );

  // Compute link results (reuses shared linkComputation.js)
  const linkResults = useMemo(
    () => {
      if (activeLinksAtTime) return []; // skip computation in bulk mode
      return links.map((cfg) => computeLink(cfg, ctx));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [links, renderTime, satPosKey, activeLinksAtTime],
  );

  // Dispatch activeLinks (3D line geometry) + contactWindows — LIVE mode only
  useEffect(() => {
    if (activeLinksAtTime) return; // bulk mode — already handled above
    if (!linkResults.length && !links.length) return;

    // ── Active links for 3D / 2D rendering ───────────────────
    const active = linkResults
      .filter((r) => r.ready && r.inLink)
      .map((r) => {
        const from = getEndpointPos(r.txId, currentStates, groundStations, particles, renderTime, starttime);
        const to = getEndpointPos(r.rxId, currentStates, groundStations, particles, renderTime, starttime);
        if (!from || !to) return null;
        // Convert km → scene units
        const f = { x: from.x / SCALE_FACTOR, y: from.y / SCALE_FACTOR, z: from.z / SCALE_FACTOR };
        const t = { x: to.x / SCALE_FACTOR, y: to.y / SCALE_FACTOR, z: to.z / SCALE_FACTOR };
        if (![f.x, f.y, f.z, t.x, t.y, t.z].every(Number.isFinite)) return null;
        return { id: `${r.txId}-${r.rxId}`, from: f, to: t, txId: r.txId, rxId: r.rxId };
      })
      .filter(Boolean);

    dispatch(setActiveLinks(active));

    // ── Coalesced contact-window update (throttled to 1 Hz) ──
    const now = Date.now();
    if (now - lastWindowUpdateRef.current >= 1000) {
      lastWindowUpdateRef.current = now;
      const activeLinkIds = linkResults
        .filter((r) => r.ready && r.inLink)
        .map((r) => `${r.txId}→${r.rxId}`);
      const simTimeMs = starttime + renderTime * 1000;
      dispatch(updateContactWindows({ activeLinkIds, simTimeMs }));
    }
  }, [linkResults, currentStates, particles, groundStations, dispatch, renderTime, starttime, activeLinksAtTime, links]);

  // Headless — renders nothing
  return null;
};

export default LinkEngine;
