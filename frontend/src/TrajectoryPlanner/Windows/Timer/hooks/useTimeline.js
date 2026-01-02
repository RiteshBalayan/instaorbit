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
export const useTimeline = (onRenderTimeUpdate) => {
  const timelineRef = useRef(null);
  const isDraggingRef = useRef(false);
  const lastUpdateRef = useRef({ renderTime: 0, elapsedTime: 0 });
  const dragThrottleRef = useRef(null);
  const onRenderTimeUpdateRef = useRef(onRenderTimeUpdate);
  
  // Keep callback ref updated
  useEffect(() => {
    onRenderTimeUpdateRef.current = onRenderTimeUpdate;
  }, [onRenderTimeUpdate]);
  
  // Redux state
  const particles = useSelector((state) => state.particles.particles);
  const starttime = useSelector((state) => state.timer.starttime);
  const elapsedTime = useSelector((state) => state.timer.elapsedTime);
  const renderTime = useSelector((state) => state.timer.RenderTime);
  const timePoints = useSelector((state) => state.timer.timePoints);
  const isRunning = useSelector((state) => state.timer.isRunning);
  const linkHistory = useSelector((state) => state.communication?.linkHistory || []);
  const satellites = useSelector((state) => state.satellites?.satellitesConfig || []);
  const groundStations = useSelector((state) => state.groundStations?.groundStations || []);

  // Timeline initialization - only create once and on major changes
  useEffect(() => {
    if (!timelineRef.current) return;

    const currentTimeline = timelineRef.current.timeline;
    const groups = createTimelineGroups();
    const dragCallback = (newRenderTime) => {
      isDraggingRef.current = true;
      onRenderTimeUpdateRef.current(newRenderTime);
      setTimeout(() => {
        isDraggingRef.current = false;
      }, 100);
    };
    
    // Recreate items when:
    // 1. Satellite count changes (satellites added/removed)
    // 2. Link history updates (communication windows added)
    // 3. Play button is pressed (isRunning changes) - updates satellite end times
    
    const items = createTimelineItems(
      particles,
      starttime,
      elapsedTime,
      renderTime,
      linkHistory,
      satellites,
      groundStations
    );
    
    // Options WITH global callbacks that filter by item.id
    const minTime = starttime || Date.now();
    const options = createTimelineOptions(minTime, dragCallback);

    // Initialize timeline if it doesn't exist
    if (!currentTimeline) {
      const newTimeline = new Timeline(timelineRef.current, items, groups, options);
      timelineRef.current.timeline = newTimeline;
      lastUpdateRef.current = { renderTime, elapsedTime };
    } else {
      // Update timeline when particles change (satellites added/removed) or play/pause
      currentTimeline.setItems(items);
      currentTimeline.setGroups(groups);
      // Re-set options to ensure callbacks are active
      currentTimeline.setOptions(options);
    }
  }, [particles.length, starttime, isRunning, linkHistory.length]); // Re-run when satellite count, link history, or play/pause changes

  // Update timeline positions smoothly without recreation
  useEffect(() => {
    const timeline = timelineRef.current?.timeline;
    if (!timeline || isDraggingRef.current) return;

    // Throttle updates - only update if values actually changed
    if (
      lastUpdateRef.current.renderTime === renderTime &&
      lastUpdateRef.current.elapsedTime === elapsedTime
    ) {
      return;
    }

    lastUpdateRef.current = { renderTime, elapsedTime };

    const minTime = starttime || Date.now();
    
    // Update positions in a single batch to prevent flickering
    requestAnimationFrame(() => {
      try {
        const items = timeline.itemsData;
        
        // Update render time marker (playhead)
        const currentRenderTime = new Date(minTime + renderTime * 1000);
        items.updateOnly({ id: 'Render-time', start: currentRenderTime });
        
        // Note: current-time item removed - only show draggable playhead
      } catch (error) {
        // Ignore errors during update
      }
    });
  }, [renderTime, elapsedTime, starttime]);

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
      const newInterval = interval * 0.7; // Zoom in by 30%
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
      const newInterval = interval * 1.4; // Zoom out by 40%
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
