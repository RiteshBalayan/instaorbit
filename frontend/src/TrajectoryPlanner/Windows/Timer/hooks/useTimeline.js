/**
 * Custom hook for timeline visualization management
 * Encapsulates vis-timeline initialization and updates
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Timeline } from 'vis-timeline/standalone';
import {
  createTimelineGroups,
  createTimelineOptions,
  createTimelineItems,
} from '../utils';

/**
 * Hook for managing vis-timeline instance
 * @returns {object} Timeline reference and control functions
 */
export const useTimeline = () => {
  const timelineRef = useRef(null);
  const lastUpdateRef = useRef({ renderTime: 0 });
  // Satellite bars hidden by default — links are more important
  const [showSatBars, setShowSatBars] = useState(false);
  const showSatBarsRef = useRef(showSatBars);
  showSatBarsRef.current = showSatBars;
  // Filter: '' = all links, or an endpoint id (sat-X or gs-X)
  const [filterEndpoint, setFilterEndpoint] = useState('');
  const filterEndpointRef = useRef(filterEndpoint);
  filterEndpointRef.current = filterEndpoint;
  // Refs to hold latest Redux values so the rebuild helper can always
  // read fresh data without needing them as effect dependencies.
  const contactWindowsRef = useRef([]);
  const linkHistoryRef = useRef([]);
  const satellitesRef = useRef([]);
  const groundStationsRef = useRef([]);

  // Redux state
  const particles = useSelector((state) => state.particles.particles);
  const starttime = useSelector((state) => state.timer.starttime);
  const elapsedTime = useSelector((state) => state.timer.elapsedTime);
  const renderTime = useSelector((state) => state.timer.RenderTime);
  const timePoints = useSelector((state) => state.timer.timePoints);
  const isRunning = useSelector((state) => state.timer.isRunning);
  const linkHistory = useSelector((state) => state.communication?.linkHistory || []);
  const contactWindows = useSelector((state) => state.communication?.contactWindows || []);
  const connectionWindows = useSelector((state) => state.communication?.connectionWindows || []);
  const linkDisplayMode = useSelector((state) => state.communication?.linkDisplayMode || 'connected');
  const satellites = useSelector((state) => state.satellites?.satellitesConfig || []);
  const groundStations = useSelector((state) => state.groundStations?.groundStations || []);

  const connectionWindowsRef = useRef([]);
  const linkDisplayModeRef = useRef('connected');

  // Keep refs in sync (cheap — no re-renders)
  contactWindowsRef.current = contactWindows;
  connectionWindowsRef.current = connectionWindows;
  linkHistoryRef.current = linkHistory;
  satellitesRef.current = satellites;
  groundStationsRef.current = groundStations;
  linkDisplayModeRef.current = linkDisplayMode;

  // ── Helper: full rebuild from current refs ──────────────────
  const rebuildTimeline = () => {
    const container = timelineRef.current;
    if (!container) return;

    const rawCw = contactWindowsRef.current;
    const rawConnW = connectionWindowsRef.current;
    const sats = satellitesRef.current;
    const gs = groundStationsRef.current;
    const lh = linkHistoryRef.current;
    const filter = filterEndpointRef.current;
    const st = starttime || Date.now();
    const displayMode = linkDisplayModeRef.current;

    // Respect linkDisplayMode:
    // 'connected' → prefer connectionWindows (connectivity solver output)
    // 'available' → use contactWindows (all line-of-sight links)
    let cw;
    if (displayMode === 'connected' && rawConnW.length > 0) {
      cw = rawConnW.map(w => ({
        ...w,
        txId: w.txParentId || w.txId,
        rxId: w.rxParentId || w.rxId,
        // Convert elapsed seconds → absolute timestamp (ms) if needed
        simStart: w.simStart < 1e9 ? st + w.simStart * 1000 : w.simStart,
        simEnd:   w.simEnd   < 1e9 ? st + w.simEnd   * 1000 : w.simEnd,
      }));
    } else {
      cw = rawCw;
    }

    // Filter contact windows by endpoint if filter is set
    const filteredCw = filter
      ? cw.filter((w) => w.txId === filter || w.rxId === filter)
      : cw;

    const groups = createTimelineGroups(particles, filteredCw, sats, gs, showSatBarsRef.current);
    const items = createTimelineItems(
      particles, starttime, elapsedTime, renderTime,
      lh, sats, gs, filteredCw, showSatBarsRef.current,
    );
    const minTime = starttime || Date.now();
    const options = createTimelineOptions(minTime, () => {});

    if (!container.timeline) {
      const tl = new Timeline(container, items, groups, options);
      container.timeline = tl;
    } else {
      container.timeline.setItems(items);
      container.timeline.setGroups(groups);
      container.timeline.setOptions(options);
    }
    lastUpdateRef.current = { renderTime };
  };

  // ── 1.  Initial build & structural changes ─────────────────
  // Rebuild when the number of satellites, start-time, or satellite
  // visibility toggle changes.
  // We intentionally do NOT depend on contactWindows / windowCount
  // here — link bars are added by the periodic refresh below.
  useEffect(() => {
    rebuildTimeline();
  }, [particles.length, starttime, showSatBars, filterEndpoint, connectionWindows.length, contactWindows.length, linkDisplayMode]);

  // ── 2.  Refresh link bars when simulation pauses ────────────
  // When the user stops the simulation (isRunning false → true → false),
  // rebuild so all accumulated contact windows appear at once.
  const prevRunningRef = useRef(isRunning);
  useEffect(() => {
    const wasPreviouslyRunning = prevRunningRef.current;
    prevRunningRef.current = isRunning;
    // Rebuild only on the transition running → paused
    if (wasPreviouslyRunning && !isRunning) {
      rebuildTimeline();
    }
  }, [isRunning]);

  // ── 3.  Periodic low-frequency refresh while running ────────
  // Every 5 seconds during live simulation, snapshot the current
  // contactWindows and rebuild so bars grow visibly.  This is far
  // less frequent than per-tick updates and avoids glitching.
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      rebuildTimeline();
    }, 5000);
    return () => clearInterval(id);
  }, [isRunning, particles.length, starttime]);

  // ── 4.  Playhead-only update ────────────────────────────────
  // Moves the render-time marker.  Never touches link or sat bars.
  useEffect(() => {
    const timeline = timelineRef.current?.timeline;
    if (!timeline) return;
    if (lastUpdateRef.current.renderTime === renderTime) return;
    lastUpdateRef.current = { renderTime };

    const minTime = starttime || Date.now();
    requestAnimationFrame(() => {
      try {
        const items = timeline.itemsData;
        items.updateOnly({ id: 'Render-time', start: new Date(minTime + renderTime * 1000) });
      } catch (_) { /* timeline not ready */ }
    });
  }, [renderTime, starttime]);

  // ── Control functions ───────────────────────────────────────
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

  const toggleSatBars = useCallback(() => {
    setShowSatBars(prev => !prev);
  }, []);

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
    timelineRef,
    zoomToFit,
    zoomIn,
    zoomOut,
    setWindow,
    moveTo,
    showSatBars,
    toggleSatBars,
    filterEndpoint,
    setFilterEndpoint,
  };
};
