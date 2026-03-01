/**
 * Custom hook for timeline visualization management
 * Encapsulates vis-timeline initialization and updates
 */

import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Timeline } from 'vis-timeline/standalone';
import {
  createTimelineGroups,
  createTimelineOptions,
  createTimelineItems,
} from '../utils';

/**
 * Hook for managing vis-timeline instance
 * @param {Function} onRenderTimeUpdate - Callback when render time is moved
 * @returns {object} Timeline reference and control functions
 */
export const useTimeline = () => {
  const timelineRef = useRef(null);
  const lastUpdateRef = useRef({ renderTime: 0, elapsedTime: 0 });
  
  // Redux state
  const particles = useSelector((state) => state.particles.particles);
  const starttime = useSelector((state) => state.timer.starttime);
  const elapsedTime = useSelector((state) => state.timer.elapsedTime);
  const renderTime = useSelector((state) => state.timer.RenderTime);
  const timePoints = useSelector((state) => state.timer.timePoints);
  const isRunning = useSelector((state) => state.timer.isRunning);
  const linkHistory = useSelector((state) => state.communication?.linkHistory || []);
  const contactWindows = useSelector((state) => state.communication?.contactWindows || []);
  const satellites = useSelector((state) => state.satellites?.satellitesConfig || []);
  const groundStations = useSelector((state) => state.groundStations?.groundStations || []);

  // Derive a stable count of contact windows so we only rebuild the
  // timeline when a window is opened or closed — not every time an
  // existing window's end-time is extended.
  const windowCount = contactWindows.length;

  // Timeline initialization - only create once and on major changes
  useEffect(() => {
    if (!timelineRef.current) return;

    const currentTimeline = timelineRef.current.timeline;
    const groups = createTimelineGroups(particles, contactWindows, satellites, groundStations);
    
    const items = createTimelineItems(
      particles,
      starttime,
      elapsedTime,
      renderTime,
      linkHistory,
      satellites,
      groundStations,
      contactWindows
    );
    
    // Options — playhead drag is handled by our custom mouse handler below,
    // so we disable vis-timeline's built-in item dragging entirely.
    const minTime = starttime || Date.now();
    const options = createTimelineOptions(minTime, () => {});

    // Initialize timeline if it doesn't exist
    if (!currentTimeline) {
      const newTimeline = new Timeline(timelineRef.current, items, groups, options);
      timelineRef.current.timeline = newTimeline;
      lastUpdateRef.current = { renderTime, elapsedTime };
    } else {
      // Rebuild items when satellites or contact windows change
      currentTimeline.setItems(items);
      currentTimeline.setGroups(groups);
      currentTimeline.setOptions(options);
    }
  }, [particles.length, starttime, isRunning, windowCount]);

  // Extend open contact-window bars during LIVE SIMULATION only.
  // This runs when elapsedTime advances (simulation is running forward)
  // and stretches any still-open window's end edge.  It does NOT run
  // when the user scrubs renderTime backward.
  const prevElapsedRef = useRef(0);
  useEffect(() => {
    const timeline = timelineRef.current?.timeline;
    if (!timeline || !isRunning) return;
    // Only extend when simulation moves forward
    if (elapsedTime <= prevElapsedRef.current) {
      prevElapsedRef.current = elapsedTime;
      return;
    }
    prevElapsedRef.current = elapsedTime;

    requestAnimationFrame(() => {
      try {
        const items = timeline.itemsData;
        contactWindows.forEach((w, index) => {
          if (!w.closed && w.simEnd) {
            try {
              items.updateOnly({ id: `link-cw-${index}`, end: new Date(w.simEnd) });
            } catch (_) {
              // Item may not exist yet
            }
          }
        });
      } catch (_) { /* ignore */ }
    });
  }, [elapsedTime, isRunning, contactWindows]);

  // Smoothly update ONLY the playhead position.
  // Contact-window bars and satellite bars are STATIC — they are set once
  // in the initialization effect and only rebuilt when windowCount or
  // particles.length changes.  Touching them here caused broken /
  // overlapping bars when the user scrubbed the playhead backward.
  useEffect(() => {
    const timeline = timelineRef.current?.timeline;
    if (!timeline) return;

    if (lastUpdateRef.current.renderTime === renderTime) return;
    lastUpdateRef.current = { renderTime, elapsedTime };

    const minTime = starttime || Date.now();

    requestAnimationFrame(() => {
      try {
        const items = timeline.itemsData;
        const currentRenderTime = new Date(minTime + renderTime * 1000);
        items.updateOnly({ id: 'Render-time', start: currentRenderTime });
      } catch (_) {
        // Timeline may not be ready yet
      }
    });
  }, [renderTime, starttime]);

  // Control functions
  const zoomToFit = () => {
    if (timelineRef.current?.timeline) {
      timelineRef.current.timeline.fit();
    }
  };

  const zoomIn = () => {
    if (timelineRef.current?.timeline) {
      const timeline = timelineRef.current.timeline;
      const range = timeline.getWindow();
      const interval = range.end - range.start;
      const newInterval = interval * 0.7;
      const center = (range.start.valueOf() + range.end.valueOf()) / 2;
      
      timeline.setWindow(
        new Date(center - newInterval / 2),
        new Date(center + newInterval / 2),
        { animation: { duration: 200, easingFunction: 'easeInOutQuad' } }
      );
    }
  };

  const zoomOut = () => {
    if (timelineRef.current?.timeline) {
      const timeline = timelineRef.current.timeline;
      const range = timeline.getWindow();
      const interval = range.end - range.start;
      const newInterval = interval * 1.4;
      const center = (range.start.valueOf() + range.end.valueOf()) / 2;
      
      timeline.setWindow(
        new Date(center - newInterval / 2),
        new Date(center + newInterval / 2),
        { animation: { duration: 200, easingFunction: 'easeInOutQuad' } }
      );
    }
  };

  const setWindow = (start, end) => {
    if (timelineRef.current?.timeline) {
      timelineRef.current.timeline.setWindow(start, end);
    }
  };

  const moveTo = (time) => {
    if (timelineRef.current?.timeline) {
      timelineRef.current.timeline.moveTo(time);
    }
  };

  // Mouse wheel zoom support - ALWAYS enabled without Alt key
  useEffect(() => {
    const timelineElement = timelineRef.current;
    if (!timelineElement) return;

    const handleWheel = (event) => {
      event.preventDefault();
      
      if (event.deltaY < 0) {
        zoomIn();
      } else {
        zoomOut();
      }
    };

    timelineElement.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      timelineElement.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return {
    // Refs
    timelineRef,
    
    // Actions
    zoomToFit,
    zoomIn,
    zoomOut,
    setWindow,
    moveTo,
  };
};
