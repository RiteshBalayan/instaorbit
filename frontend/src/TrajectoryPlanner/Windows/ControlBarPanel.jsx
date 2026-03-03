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
  DEFAULT_SIM_STEP,
  TIME_UNIT_CONFIG,
} from './Timer/constants';

import BulkSimControls from './BulkSimControls';

const ControlBarPanel = () => {
  const dispatch = useDispatch();
  const showControlPanel = useSelector((state) => state.view.showControlPanel);
  const [backendAvailable, setBackendAvailable] = useState(true);

  const [timeStep, setTimeStep] = useState(DEFAULT_TIME_STEP);
  const [simStep, setSimStep] = useState(DEFAULT_SIM_STEP);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const simulation = useSimulationTimer(timeStep);
  const render = useRenderTimer(simStep);
  const formatting = useTimeFormatting(simulation.elapsedTime, simulation.starttime);

  const handleStartPause = () => simulation.togglePlayPause();
  const handleReset = () => simulation.reset();

  const handleTimeStepChange = (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) setTimeStep(value);
  };
  const handleRenderStepChange = (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) setSimStep(value);
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

        <div className="control-bar__section" aria-label="Transport">
          <div className="control-bar__caption">TRANSPORT</div>
          <TimeControls
            isRunning={simulation.isRunning}
            onPlayPause={handleStartPause}
            onReset={handleReset}
            compact
          />
        </div>

        <div className="control-bar__caption">SIM STEP</div>
        <TimeStepControls
          simStep={timeStep}
          renderStep={simStep}
          coupled={simulation.coupled}
          onSimStepChange={handleTimeStepChange}
          onRenderStepChange={handleRenderStepChange}
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
