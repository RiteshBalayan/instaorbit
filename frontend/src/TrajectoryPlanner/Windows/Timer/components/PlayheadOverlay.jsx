/**
 * PlayheadOverlay — a transparent drag-handle that sits ON TOP of the
 * vis-timeline DOM, guaranteeing the user can always grab the playhead
 * regardless of how many group rows exist underneath.
 *
 * It renders as a thin (28 px wide) absolutely-positioned strip inside
 * the timeline-panel.  Drag events on this strip are converted to
 * render-time updates via the timeline's visible window range.
 */

import React, { useRef, useCallback, useEffect, useState } from 'react';

const HANDLE_WIDTH = 28; // px — total clickable width of the drag strip

const PlayheadOverlay = ({ timelineRef, onRenderTimeUpdate, starttime }) => {
  const isDragging = useRef(false);
  const [offsetPx, setOffsetPx] = useState(0); // px from left edge of center panel
  const [centerLeft, setCenterLeft] = useState(0); // left edge of center panel relative to timeline-panel
  const [centerWidth, setCenterWidth] = useState(0);

  const minTime = starttime || Date.now();

  // ── Helpers ─────────────────────────────────────────────────
  /** Return the `.vis-panel.vis-center` element. */
  const getCenterEl = useCallback(() => {
    const container = timelineRef?.current;
    if (!container) return null;
    return container.querySelector('.vis-panel.vis-center');
  }, [timelineRef]);

  /** Return the vis-timeline instance stored on the container div. */
  const getTimeline = useCallback(() => {
    return timelineRef?.current?.timeline ?? null;
  }, [timelineRef]);

  /** Convert a page-X coordinate to render-time in seconds. */
  const pageXToRenderTime = useCallback(
    (pageX) => {
      const timeline = getTimeline();
      const centerEl = getCenterEl();
      if (!timeline || !centerEl) return null;
      const rect = centerEl.getBoundingClientRect();
      if (rect.width === 0) return null;
      const fraction = (pageX - rect.left) / rect.width;
      const range = timeline.getWindow();
      const timeMs =
        range.start.valueOf() +
        fraction * (range.end.valueOf() - range.start.valueOf());
      return Math.max(0, (timeMs - minTime) / 1000);
    },
    [getTimeline, getCenterEl, minTime],
  );

  // ── Keep the overlay strip aligned with the playhead ────────
  useEffect(() => {
    let rafId;
    const tick = () => {
      const timeline = getTimeline();
      const centerEl = getCenterEl();
      const panelEl = timelineRef?.current?.parentElement; // timeline-panel
      if (timeline && centerEl && panelEl) {
        const panelRect = panelEl.getBoundingClientRect();
        const centerRect = centerEl.getBoundingClientRect();
        setCenterLeft(centerRect.left - panelRect.left);
        setCenterWidth(centerRect.width);

        const range = timeline.getWindow();
        const items = timeline.itemsData;
        let playheadMs;
        try {
          const rtItem = items.get('Render-time');
          playheadMs = rtItem?.start?.valueOf?.() ?? rtItem?.start;
        } catch {
          playheadMs = null;
        }
        if (playheadMs != null) {
          const windowStart = range.start.valueOf();
          const windowEnd = range.end.valueOf();
          const fraction = (playheadMs - windowStart) / (windowEnd - windowStart);
          setOffsetPx(fraction * centerRect.width);
        }
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [getTimeline, getCenterEl, timelineRef]);

  // ── Drag handlers ───────────────────────────────────────────
  const handleMouseDown = useCallback(
    (e) => {
      if (e.button !== 0) return; // only left click
      isDragging.current = true;
      e.preventDefault();
      e.stopPropagation();

      const rt = pageXToRenderTime(e.pageX);
      if (rt != null) onRenderTimeUpdate(rt);
    },
    [pageXToRenderTime, onRenderTimeUpdate],
  );

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!isDragging.current) return;
      e.preventDefault();
      const rt = pageXToRenderTime(e.pageX);
      if (rt != null) onRenderTimeUpdate(rt);
    };

    const onMouseUp = () => {
      isDragging.current = false;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [pageXToRenderTime, onRenderTimeUpdate]);

  // ── Render ──────────────────────────────────────────────────
  // Position: absolute inside timeline-panel (which must be position:relative).
  // Left = center panel's left offset + playhead fraction offset − half handle width.
  const left = centerLeft + offsetPx - HANDLE_WIDTH / 2;

  return (
    <div
      className="playhead-drag-overlay"
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        left,
        top: 0,
        width: HANDLE_WIDTH,
        height: '100%',
        cursor: 'ew-resize',
        zIndex: 9999,
        background: 'transparent',
        pointerEvents: 'auto',
      }}
    />
  );
};

export default PlayheadOverlay;
