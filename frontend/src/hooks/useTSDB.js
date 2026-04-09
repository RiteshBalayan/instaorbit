/**
 * useTSDB — Hook that manages the TSDB client lifecycle.
 *
 * Responsibilities:
 *   1. Initialise the TSDB session on mount (create or resume).
 *   2. Call tsClient.syncToTime() whenever RenderTime changes,
 *      keeping the windowed Redux slices (visibleTracePoints, lowResTimelines,
 *      visibleLinkStates) up to date.
 *   3. Clean up on unmount (flush buffers, keep session alive).
 *
 * Mounting this hook once high up in the tree (e.g. TrajectoryPlanner)
 * is sufficient — all child components read via Redux selectors or
 * the useTracePoints / useLinkStates hooks.
 */

import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import tsClient from '../services/timeSeriesClient';

/**
 * @param {Object} [opts]
 * @param {boolean} [opts.enabled=true] - Disable to skip TSDB entirely
 */
export default function useTSDB(opts = {}) {
  const { enabled = true } = opts;
  const dispatch = useDispatch();

  // Redux state we need for sync
  const uid = useSelector((s) => s.auth?.user?.uid);
  const particles = useSelector((s) => s.particles.particles) || [];
  const renderTime = useSelector((s) => s.timer.RenderTime);

  // Refs so the effect callbacks always see latest values without re-subscribing
  const particlesRef = useRef(particles);
  const renderTimeRef = useRef(renderTime);
  particlesRef.current = particles;
  renderTimeRef.current = renderTime;

  /* ── 1. Init TSDB session on mount ─────────────────────── */
  const initDoneRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (initDoneRef.current) return;
    initDoneRef.current = true;

    const userId = uid || `anon-${crypto.randomUUID()}`;
    const savedSession = (() => {
      try { return localStorage.getItem('instaorbit_tsdb_session'); }
      catch { return null; }
    })();

    tsClient.init({
      userId,
      projectId: 'default',
      dispatch,
      sessionId: savedSession || undefined,
    }).catch(err => {
      console.warn('[useTSDB] TSDB init failed — running without TSDB:', err.message);
      initDoneRef.current = false; // allow retry
    });

    return () => {
      // On unmount, flush but don't destroy (session survives page nav)
      tsClient.flush().catch(() => {});
    };
  }, [enabled, uid, dispatch]);

  /* ── 2. Sync windowed data whenever RenderTime changes ── */
  useEffect(() => {
    if (!enabled) return;
    if (!tsClient.sessionId) return;

    const satIds = particlesRef.current.map((p) => p.id);
    if (!satIds.length) return;

    tsClient.syncToTime(renderTime, satIds);
  }, [renderTime, enabled]);
}
