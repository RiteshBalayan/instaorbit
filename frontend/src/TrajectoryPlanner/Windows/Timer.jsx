import React, { useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import moment from 'moment';
import { toggleCoupled, setstarttime } from '../../Store/timeSlice';
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
  TimeDisplay,
  TimeControls,
  RenderControls,
  CouplingControl,
  TimeStepControls,
  StartTimeControl,
  DatePickerModal,
  TimelinePanel,
} from './Timer/components';
import { CircularClock } from './Timer/components/CircularClock';

// Import constants
import {
  DEFAULT_TIME_STEP,
  DEFAULT_SIM_STEP,
  TIME_UNIT_CONFIG,
} from './Timer/constants';

const Timer = () => {
  const dispatch = useDispatch();
  
  // Local state
  const [timeStep, setTimeStep] = useState(DEFAULT_TIME_STEP);
  const [simStep, setSimStep] = useState(DEFAULT_SIM_STEP);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Custom hooks for timer logic
  const simulation = useSimulationTimer(timeStep);
  const render = useRenderTimer(simStep);
  const formatting = useTimeFormatting(simulation.elapsedTime, simulation.starttime);
  const timeline = useTimeline((newRenderTime) => {
    render.setRenderTime(newRenderTime);
  });

  // Event handlers
  const handleStartPause = () => {
    simulation.togglePlayPause();
  };

  const handleRenderStartPause = () => {
    render.togglePlayPause();
  };

  const handleReset = () => {
    simulation.reset();
  };

  const handleTimeStepChange = (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      setTimeStep(value);
    }
  };

  const handleRenderStepChange = (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      setSimStep(value);
    }
  };

  const handleTimeUnitChange = (unit) => {
    formatting.setTimeUnit(unit);
  };

  const handleCoupleToggle = () => {
    dispatch(toggleCoupled());
  };

  const handleSetStartTime = () => {
    dispatch(setstarttime(selectedDate.valueOf()));
    setShowDatePicker(false);
  };

  const handleSetCurrentTime = () => {
    setSelectedDate(moment());
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
      <div className="time-controller">
        <div className="control-panel-title">Control Panel</div>
        <div className="controller-content">
          {/* Time Display Section */}
          <TimeDisplay
            currentTime={formatting.currentTime}
            elapsedTime={formatting.formattedElapsedTime}
            timeUnit={formatting.timeUnit}
            onUnitChange={handleTimeUnitChange}
            timeUnitConfig={TIME_UNIT_CONFIG}
          />
          
          {/* All Transport Controls in one horizontal line */}
          <TimeControls
            isRunning={simulation.isRunning}
            onPlayPause={handleStartPause}
            onReset={handleReset}
            renderRunning={render.renderRunning}
            coupled={simulation.coupled}
            onRenderPlayPause={handleRenderStartPause}
            onCouplingToggle={handleCoupleToggle}
          />
          
          {/* Start Time Control */}
          <StartTimeControl
            startTime={formatting.standardStartTime}
            onOpenPicker={() => setShowDatePicker(true)}
          />
          
          {/* Playback Speed Controls */}
          <TimeStepControls
            simStep={timeStep}
            renderStep={simStep}
            coupled={simulation.coupled}
            onSimStepChange={handleTimeStepChange}
            onRenderStepChange={handleRenderStepChange}
          />
        </div>
      </div>

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
      />

      <DatePickerModal
        isOpen={showDatePicker}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        onConfirm={handleSetStartTime}
        onSetNow={handleSetCurrentTime}
        onCancel={() => setShowDatePicker(false)}
      />
    </div>
  );
};

export default Timer;
