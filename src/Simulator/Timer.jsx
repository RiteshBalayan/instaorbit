// src/components/Timer.js
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
import './HorizontalSlider.css';

const roundToThreeDecimals = (num) => Math.round(num * 1000) / 1000;

const Timer = () => {
  const dispatch = useDispatch();
  const isRunning = useSelector((state) => state.timer.isRunning);
  const elapsedTime = useSelector((state) => state.timer.elapsedTime);
  const timePoints = useSelector((state) => state.timer.timePoints);
  const intervalRef = useRef(null);
  const [searchTime, setSearchTime] = useState('');
  const [timeStep, setTimeStep] = useState(0.001);

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

  const handleStartPause = () => {
    dispatch(startPauseTimer());
  };

  const handleReset = () => {
    dispatch(resetTimer());
  };

  const handleSearchChange = (e) => {
    setSearchTime(e.target.value);
  };

  const handleGoToTime = () => {
    const time = parseFloat(searchTime);
    if (!isNaN(time)) {
      const roundedTime = roundToThreeDecimals(time);
      if (timePoints.includes(roundedTime)) {
        dispatch(goToTimePoint(roundedTime));
      } else {
        alert('Time point not found');
      }
    } else {
      alert('Invalid time format');
    }
  };

  const handleSliderChange = (value) => {
    dispatch(setElapsedTime(value));
  };

  const handleTimeStepChange = (value) => {
    setTimeStep(value);
  };

  return (
    <div>
      <p>Elapsed Time: {elapsedTime.toFixed(3)}s ; {(elapsedTime/60).toFixed(3)}m ; {(elapsedTime/3600).toFixed(3)}h</p>
      <button onClick={handleStartPause}>
        {isRunning ? 'Pause' : 'Start'}
      </button>
      <button onClick={handleReset}>Reset</button>
      <div>
        <h4>Search Time Point:</h4>
        <input
          type="text"
          value={searchTime}
          onChange={handleSearchChange}
          placeholder="Enter time in seconds"
        />
        <button onClick={handleGoToTime}>Go</button>
      </div>

      <div className="horizontal-slider-container">
        <ReactSlider
          className="horizontal-slider"
          thumbClassName="thumb"
          trackClassName="track"
          value={elapsedTime}
          onChange={handleSliderChange}
          orientation="horizontal" // Set slider orientation to horizontal
          invert={false} // Adjust as needed
          min={0.001}
          max={Math.max(...timePoints)}
          step={0.001}
          marks={timePoints}
          renderThumb={(props, state) => <div {...props}>{state.valueNow.toFixed(3)}</div>}
        />
      </div>

      <div>
        <h4>Time Step: {timeStep}s</h4>
        <ReactSlider
          className="horizontal-slider"
          thumbClassName="thumb"
          trackClassName="track"
          value={timeStep}
          onChange={handleTimeStepChange}
          orientation="horizontal"
          invert={false}
          min={0}
          max={50}
          step={0.001}
        />
      </div>
    </div>
  );
};

export default Timer;
