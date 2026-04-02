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
  useTimelineKeyboard,
} from './Timer/hooks';

// Import components
import {
  TimelinePanel,
} from './Timer/components';

// Import constants
import {
  DEFAULT_TIME_STEP,
  DEFAULT_SIM_STEP,
} from './Timer/constants';

const Timer = ({ analysisTab, onSwitchTab } = {}) => {
  // Local state
  const [timeStep, setTimeStep] = useState(DEFAULT_TIME_STEP);
  const [simStep, setSimStep] = useState(DEFAULT_SIM_STEP);

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

  // Custom hooks for timer logic
  const simulation = useSimulationTimer(timeStep);
  const render = useRenderTimer(simStep);
  const formatting = useTimeFormatting(simulation.elapsedTime, simulation.starttime);
  const timeline = useTimeline();

  // Event handlers
  const handleStartPause = () => {
    simulation.togglePlayPause();
  };

  const handleReset = () => {
    simulation.reset();
  };

  const handleZoomToFit = () => {
    timeline.zoomToFit();
  };

  const handleZoomIn = () => {
    timeline.zoomIn();
  };

  const handleZoomOut = () => {
    timeline.zoomOut();
  };

  const handleStepForward = () => {
    const newRenderTime = render.renderTime + 1; // Step forward 1 second
    render.setRenderTime(newRenderTime);
  };

  const handleStepBackward = () => {
    const newRenderTime = Math.max(0, render.renderTime - 1); // Step backward 1 second
    render.setRenderTime(newRenderTime);
  };

  const handleFastForward = () => {
    const newRenderTime = render.renderTime + 10; // Fast forward 10 seconds
    render.setRenderTime(newRenderTime);
  };

  const handleFastBackward = () => {
    const newRenderTime = Math.max(0, render.renderTime - 10); // Fast backward 10 seconds
    render.setRenderTime(newRenderTime);
  };

  // Keyboard shortcuts - Premiere Pro style (with Shift for fast transport)
  useTimelineKeyboard({
    onPlayPause: handleStartPause,
    onStepForward: handleStepForward,
    onStepBackward: handleStepBackward,
    onFastForward: handleFastForward,
    onFastBackward: handleFastBackward,
    onZoomIn: handleZoomIn,
    onZoomOut: handleZoomOut,
    onZoomToFit: handleZoomToFit,
  });

  // Track timeline panel height and update CSS variable
  const timelinePanelRef = useRef(null);
  
  useEffect(() => {
    const updateTimelineHeight = () => {
      if (timelinePanelRef.current) {
        const height = timelinePanelRef.current.offsetHeight;
        document.documentElement.style.setProperty('--timeline-height', `${height}px`);
      }
    };

    // Initial update
    updateTimelineHeight();

    // Create ResizeObserver to watch for timeline height changes
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
        onStepBackward={handleStepBackward}
        onStepForward={handleStepForward}
        onFastBackward={handleFastBackward}
        onFastForward={handleFastForward}
        onPlayPause={handleStartPause}
        isPlaying={simulation.isRunning}
        showSatBars={timeline.showSatBars}
        onToggleSatBars={timeline.toggleSatBars}
        onRenderTimeUpdate={(newRenderTime) => render.setRenderTime(newRenderTime)}
        starttime={simulation.starttime}
        analysisTab={analysisTab}
        onSwitchTab={onSwitchTab}
        filterEndpoint={timeline.filterEndpoint}
        onFilterChange={timeline.setFilterEndpoint}
        endpoints={endpoints}
      />

    </div>
  );
};

export default Timer;
