import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSelector } from 'react-redux';
import 'vis-timeline/styles/vis-timeline-graph2d.min.css';
import '../../Styles/simulator/Timer.css';

// Import custom hooks
import {
  useSimulationTimer,
  useRenderTimer,
  useTimeline,
  useTimeFormatting,
} from './Timer/hooks';

// Import components
import {
  TimelinePanel,
} from './Timer/components';

const Timer = ({ analysisTab, onSwitchTab } = {}) => {
  // Redux state for endpoints
  const satellites = useSelector((s) => s.satellites?.satellitesConfig || []);
  const groundStations = useSelector((s) => s.groundStations?.groundStations || []);

  // Build endpoints list for filter dropdown
  const endpoints = useMemo(() => {
    const eps = [];
    satellites.forEach((sat) => {
      eps.push({
        id: `sat-${sat.id}`,
        type: 'sat',
        label: sat.name || `Satellite ${sat.id}`,
      });
    });
    groundStations.forEach((gs) => {
      eps.push({
        id: gs.id,
        type: 'gs',
        label: gs.name || gs.id,
      });
    });
    return eps;
  }, [satellites, groundStations]);

  // Custom hooks for timer logic (needed for timeline visualization)
  const simulation = useSimulationTimer(1);
  const render = useRenderTimer(1);
  const timeline = useTimeline();

  const handleZoomToFit = () => timeline.zoomToFit();
  const handleZoomIn = () => timeline.zoomIn();
  const handleZoomOut = () => timeline.zoomOut();

  // Track timeline panel height and update CSS variable
  const timelinePanelRef = useRef(null);
  
  useEffect(() => {
    const updateTimelineHeight = () => {
      if (timelinePanelRef.current) {
        const height = timelinePanelRef.current.offsetHeight;
        document.documentElement.style.setProperty('--timeline-height', `${height}px`);
      }
    };

    updateTimelineHeight();

    const resizeObserver = new ResizeObserver(updateTimelineHeight);
    if (timelinePanelRef.current) {
      resizeObserver.observe(timelinePanelRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className="exptimer-container">
      <TimelinePanel
        panelRef={timelinePanelRef}
        timelineRef={timeline.timelineRef}
        onZoomToFit={handleZoomToFit}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onRenderTimeUpdate={(newRenderTime) => render.setRenderTime(newRenderTime)}
        starttime={simulation.starttime}
        analysisTab={analysisTab}
        onSwitchTab={onSwitchTab}
        showSatBars={timeline.showSatBars}
        onToggleSatBars={timeline.toggleSatBars}
        filterEndpoint={timeline.filterEndpoint}
        onFilterChange={timeline.setFilterEndpoint}
        endpoints={endpoints}
      />
    </div>
  );
};

export default Timer;
