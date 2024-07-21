import React, { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  startPauseTimer,
  resetTimer,
  updateElapsedTime,
  addTimePoint,
  goToTimePoint,
  setElapsedTime,
} from '../Store/timeSlice';
import ReactSlider from 'react-slider';
import '../styles/simulator/ExpTimer.css';

const roundToThreeDecimals = (num) => Math.round(num * 1000) / 1000;

const ExpTimer = () => {
  const dispatch = useDispatch();
  const isRunning = useSelector((state) => state.timer.isRunning);
  const elapsedTime = useSelector((state) => state.timer.elapsedTime);
  const timePoints = useSelector((state) => state.timer.timePoints);
  const intervalRef = useRef(null);
  const [timeStep, setTimeStep] = useState(0.001);
  const [timelineLength, setTimelineLength] = useState(1000); // Default timeline length
  const [timeUnit, setTimeUnit] = useState('s'); // 's' for seconds, 'm' for minutes, 'h' for hours

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        const newTime = roundToThreeDecimals(elapsedTime + timeStep);
        dispatch(updateElapsedTime(newTime));
        dispatch(addTimePoint(newTime));
      }, 1); // Update every 1ms for accurate timing
    } else if (!isRunning && intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, elapsedTime, timeStep, dispatch]);

  useEffect(() => {
    // Update the timeline length based on time points
    const maxTime = Math.max(...timePoints, 1); // Default to 1 if no time points
    setTimelineLength(maxTime);
  }, [timePoints]);

  const handleStartPause = () => {
    dispatch(startPauseTimer());
  };

  const handleReset = () => {
    dispatch(resetTimer());
  };

  const handleSliderChange = (value) => {
    dispatch(setElapsedTime(value));
  };

  const handleTimeStepChange = (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      setTimeStep(value);
    }
  };

  const handleTimeUnitChange = (e) => {
    setTimeUnit(e.target.value);
  };

  const formatElapsedTime = () => {
    switch (timeUnit) {
      case 'm':
        return `${(elapsedTime / 60).toFixed(3)}m`;
      case 'h':
        return `${(elapsedTime / 3600).toFixed(3)}h`;
      default:
        return `${elapsedTime.toFixed(3)}s`;
    }
  };

  return (
    <div className="exptimer-container">
      <div className="time-controller">
        <div className="controller-content">
          <div className="time-display">
            <p>{formatElapsedTime()}</p>
            <div className="time-unit-controls">
              <button onClick={() => setTimeUnit('s')} className="time-unit-btn">s</button>
              <button onClick={() => setTimeUnit('m')} className="time-unit-btn">m</button>
              <button onClick={() => setTimeUnit('h')} className="time-unit-btn">h</button>
            </div>
          </div>
          <div className="control-buttons-container">
            <button className="control-btn" onClick={handleStartPause}>
              {isRunning ? '⏸️' : '▶️'}
            </button>
            <button className="control-btn" onClick={handleReset}>🔄</button>
            <input
              type="number"
              step="0.001"
              min="0"
              max="50"
              value={timeStep}
              onChange={handleTimeStepChange}
              className="time-step-input"
            />
            <p>Seconds/Step</p>
          </div>
        </div>
      </div>
      <div className="timeline-panel">
        <div className="slider-container">
          <ReactSlider
            className="horizontal-slider"
            thumbClassName="thumb"
            trackClassName="track"
            value={elapsedTime}
            onChange={handleSliderChange}
            orientation="horizontal"
            min={0.001}
            max={timelineLength}
            step={0.001}
            marks={timePoints}
            renderThumb={(props, state) => <div {...props}>{state.valueNow.toFixed(3)}</div>}
          />
        </div>
      </div>
    </div>
  );
};

export default ExpTimer;
