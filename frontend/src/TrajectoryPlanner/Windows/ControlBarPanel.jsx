/**
 * ControlBarPanel — Always-visible left control bar.
 * Extracted from Timer so it persists across AnalysisBar tab switches.
 */

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import moment from 'moment';
import { toggleCoupled, setstarttime } from '../../Store/timeSlice';
import '../../Styles/simulator/Timer.css';

import {
  useSimulationTimer,
  useRenderTimer,
  useTimeFormatting,
} from './Timer/hooks';

import {
  TimeDisplay,
  TimeControls,
  TimeStepControls,
  StartTimeControl,
  DatePickerModal,
} from './Timer/components';
import LeftControlBar from './Timer/components/LeftControlBar';

import {
  DEFAULT_TIME_STEP,
  TIME_UNIT_CONFIG,
} from './Timer/constants';

import BulkSimControls from './BulkSimControls';

const ControlBarPanel = () => {
  const dispatch = useDispatch();
  const showControlPanel = useSelector((state) => state.view.showControlPanel);
  const [backendAvailable, setBackendAvailable] = useState(true);

  // Render speed multiplier: how many 1-second sim steps per tick (1×..50×)
  const [speed, setSpeed] = useState(DEFAULT_TIME_STEP);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const simulation = useSimulationTimer(speed);
  const render = useRenderTimer(1); // render step always 1s (unused in coupled)
  const formatting = useTimeFormatting(simulation.elapsedTime, simulation.starttime);

  const handleStartPause = () => simulation.togglePlayPause();

  const handleSpeedChange = (value) => {
    const v = typeof value === 'number' ? value : parseFloat(value);
    if (!isNaN(v) && v >= 1) setSpeed(Math.round(v));
  };
  const handleTimeUnitChange = (unit) => formatting.setTimeUnit(unit);

  const handleSetStartTime = () => {
    dispatch(setstarttime(selectedDate.valueOf()));
    setShowDatePicker(false);
  };
  const handleSetCurrentTime = () => setSelectedDate(moment());

  // Backend health polling
  useEffect(() => {
    let intervalId;
    const checkBackend = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        await fetch('http://localhost:3001/health', { signal: controller.signal });
        clearTimeout(timeout);
        setBackendAvailable(true);
      } catch (e) {
        setBackendAvailable(false);
      }
    };
    checkBackend();
    intervalId = setInterval(checkBackend, 15000);
    return () => clearInterval(intervalId);
  }, []);

  if (!showControlPanel) return null;

  return (
    <>
      <LeftControlBar>
        <div className="control-bar__header">
          <div className="control-bar__title">CTRL</div>
          <div
            className={`cc-backend ${backendAvailable ? 'ok' : 'bad'}`}
            title={backendAvailable ? 'Backend connected' : 'Backend offline'}
          >
            <span className="cc-dot" aria-hidden="true" />
          </div>
        </div>

        {!backendAvailable && (
          <div className="backend-warning control-bar__warn">Offline</div>
        )}

        <TimeDisplay
          currentTime={formatting.currentTime}
          elapsedTime={formatting.formattedElapsedTime}
          timeUnit={formatting.timeUnit}
          onUnitChange={handleTimeUnitChange}
          timeUnitConfig={TIME_UNIT_CONFIG}
          compact
        />

        <div className="control-bar__section" aria-label="Simulate">
          <div className="control-bar__caption">SIMULATE</div>
          <TimeControls
            isRunning={simulation.isRunning}
            onPlayPause={handleStartPause}
            compact
          />
        </div>

        <div className="control-bar__caption">SIM SPEED</div>
        <TimeStepControls
          speed={speed}
          onSpeedChange={handleSpeedChange}
          compact
        />

        <div className="control-bar__caption">BULK SIM</div>
        <BulkSimControls compact />

        <div className="control-bar__caption">START TIME</div>
        <StartTimeControl
          startTime={formatting.standardStartTime}
          onOpenPicker={() => setShowDatePicker(true)}
          compact
        />
      </LeftControlBar>

      <DatePickerModal
        isOpen={showDatePicker}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        onConfirm={handleSetStartTime}
        onSetNow={handleSetCurrentTime}
        onCancel={() => setShowDatePicker(false)}
      />
    </>
  );
};

export default ControlBarPanel;
