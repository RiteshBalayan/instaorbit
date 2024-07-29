import React, { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Datetime from 'react-datetime';
import moment from 'moment';
import 'react-datetime/css/react-datetime.css';
import {
  startPauseTimer,
  resetTimer,
  updateElapsedTime,
  addTimePoint,
  setstarttime,
} from '../../Store/timeSlice';
import { DataSet, Timeline } from 'vis-timeline/standalone';
import 'vis-timeline/styles/vis-timeline-graph2d.min.css';
import '../../Styles/simulator/Timer.css';
import { format } from 'date-fns';

const roundToThreeDecimals = (num) => Math.round(num * 1000) / 1000;

const Timer = () => {
  const dispatch = useDispatch();
  const isRunning = useSelector((state) => state.timer.isRunning);
  const elapsedTime = useSelector((state) => state.timer.elapsedTime);
  const timePoints = useSelector((state) => state.timer.timePoints);
  const starttime = useSelector((state) => state.timer.starttime);
  const formattedStartTime = format(starttime, "dd MMM yyyy hh:mm a");
  const particles = useSelector((state) => state.particles.particles);
  const intervalRef = useRef(null);
  const timelineRef = useRef(null);
  const [timeStep, setTimeStep] = useState(0.001);
  const [timeUnit, setTimeUnit] = useState('s'); // 's' for seconds, 'm' for minutes, 'h' for hours
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

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
    const now = starttime || Date.now();
    const minTime = now;
    const maxTime = now + (timePoints.length > 0 ? timePoints[timePoints.length - 1] * 1000 : 0);

  // Map particles to items
  const particleItems = particles
    .map((particle, index) => {
      const tracePoints = particle.tracePoints;
      
      // Check if tracePoints exist and have at least two points
      if (tracePoints && tracePoints.length >= 2) {
        const start = new Date(minTime + tracePoints[1].time * 1000);
        const end = new Date(minTime + tracePoints[tracePoints.length - 1].time * 1000);
        
        return {
          id: index + 1,
          content: particle.name,
          start: start,
          end: end,
          type: 'range',
        };
      }
      return undefined; // Return undefined if conditions are not met
    })
    .filter(item => item !== undefined); // Remove undefined values from the array

    const items = new DataSet(particleItems);

    const options = {
      stack: true,
      showCurrentTime: true,
      min: new Date(minTime),
      minHeight: "100px",
      horizontalScroll: true,
      verticalScroll: false,
      zoomable: true,
      zoomFriction: 20,
      editable: false,
      showMajorLabels: true,
      showMinorLabels: true,
      format: {
        minorLabels: {
          second: 's',
          minute: 'm',
          hour: 'h',
        },
        majorLabels: {
          second: 's',
          minute: 'm',
          hour: 'h',
        },
      },
      height: '150%',
    };
    if (timelineRef.current) {
      if (!timelineRef.current.timeline) {
        const newTimeline = new Timeline(timelineRef.current, items, options);
        timelineRef.current.timeline = newTimeline;
      } else {
        timelineRef.current.timeline.setItems(items);
        timelineRef.current.timeline.setOptions(options);
      }
    }
    return () => {
      if (timelineRef.current && timelineRef.current.timeline) {
        timelineRef.current.timeline.destroy();
        timelineRef.current.timeline = null;
      }
    };
  }, [timePoints, starttime, particles]);

  const handleStartPause = () => {
    dispatch(startPauseTimer());
  };

  const handleReset = () => {
    dispatch(resetTimer());
  };

  const handleTimeStepChange = (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      setTimeStep(value);
    }
  };

  const handleTimeUnitChange = (unit) => {
    setTimeUnit(unit);
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

  const handleSetStartTime = () => {
    dispatch(setstarttime(selectedDate.valueOf())); // Use moment's valueOf
    setShowDatePicker(false);
  };

  const handleSetCurrentTime = () => {
    setSelectedDate(moment()); // Update with current time
  };

  return (
    <div className="exptimer-container">
      <div className="time-controller">
        <div className="controller-content">
          <div className="time-display">
          <p style={{ color: 'white' }}>{formatElapsedTime()}</p>
            <div className="time-unit-controls">
              <button onClick={() => handleTimeUnitChange('s')} className="time-unit-btn">s</button>
              <button onClick={() => handleTimeUnitChange('m')} className="time-unit-btn">m</button>
              <button onClick={() => handleTimeUnitChange('h')} className="time-unit-btn">h</button>
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
            <p style={{ color: 'white' }}>Seconds/Step</p>
          </div>
        </div>
        <div className='starttime-container'>
          <p className="starttime-display"> {formattedStartTime} </p>
          <button className="starttime-btn" onClick={() => setShowDatePicker(true)}>Change Start Time</button>
        </div>
      </div>
      <div className="timeline-panel">
        <div ref={timelineRef} className="timeline-container"></div>
      </div>
      {showDatePicker && (
        <div className="datepicker-popup">
        <Datetime 
          value={selectedDate} 
          onChange={(date) => setSelectedDate(moment(date))} // Use moment for handling date
          dateFormat="YYYY-MM-DD" 
          timeFormat="HH:mm:ss"
          closeOnSelect={true}
          inputProps={{ placeholder: 'Select date and time' }}
        />
        <button onClick={handleSetStartTime}>Set Start Time</button>
        <button onClick={handleSetCurrentTime}>Set Time to Now</button>
        <button onClick={() => setShowDatePicker(false)}>Cancel</button>
      </div>
      )}
    </div>
  );
};

export default Timer;
