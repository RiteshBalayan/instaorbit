import React, { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Datetime from 'react-datetime';
import moment from 'moment';
import 'react-datetime/css/react-datetime.css';
import {
  startPauseTimer,
  resetTimer,
  updateElapsedTime,
  updateRenderTime,
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
  const [RenderRunning, setRenderRunning] = useState(false);
  const RenderTime = useSelector((state) => state.timer.RenderTime);
  const timePoints = useSelector((state) => state.timer.timePoints);
  const starttime = useSelector((state) => state.timer.starttime);
  const formattedStartTime = format(starttime, "dd MMM yyyy hh:mm a");
  const particles = useSelector((state) => state.particles.particles);
  const intervalRef = useRef(null);
  const timelineRef = useRef(null);
  const renderIntervalRef = useRef(null);
  const [timeStep, setTimeStep] = useState(30);
  const [simStep, setSimStep] = useState(30);
  const [timeUnit, setTimeUnit] = useState('s');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // State to store zoom start and end times
  const [zoomStartTime, setZoomStartTime] = useState(null);
  const [zoomEndTime, setZoomEndTime] = useState(null);

  const currentTime = new Date(starttime + elapsedTime * 1000);
  const formattedCurrentTime = format(currentTime, "dd MMM yyyy hh:mm a");

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        const newTime = roundToThreeDecimals(elapsedTime + timeStep);
        dispatch(updateElapsedTime(newTime));
        dispatch(addTimePoint(newTime));
      }, 100);
    } else if (!isRunning && intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, elapsedTime, timeStep, dispatch]);

  useEffect(() => {
    if (RenderRunning) {
      renderIntervalRef.current = setInterval(() => {
        const newTime = roundToThreeDecimals(RenderTime + simStep);
        dispatch(updateRenderTime(newTime));
      }, 1000 / simStep);
    } else if (!RenderRunning && renderIntervalRef.current) {
      clearInterval(renderIntervalRef.current);
    }
    return () => clearInterval(renderIntervalRef.current);
  }, [RenderRunning, RenderTime, simStep, dispatch]);

  useEffect(() => {
    const now = starttime || Date.now();
    const minTime = now;
    const maxTime = now + (timePoints.length > 0 ? timePoints[timePoints.length - 1] * 1000 : 0);
    const currentTime = new Date(now + elapsedTime * 1000);
    const currentRenderTime = new Date(now + RenderTime * 1000);

    const groups = new DataSet([
      { id: 1, content: 'Satellite', className: 'events-group' },
      { id: 2, content: 'Events', className: 'Satellite-group' }
    ]);

    const particleItems = particles
      .map((particle, index) => {
        const tracePoints = particle.tracePoints;
        if (tracePoints && tracePoints.length >= 2) {
          const start = new Date(minTime + tracePoints[1].time * 1000);
          const end = new Date(minTime + tracePoints[tracePoints.length - 1].time * 1000);
          return {
            id: index + 1,
            content: particle.name,
            start: start,
            end: end,
            type: 'range',
            group: 1,
          };
        }
        return undefined;
      })
      .filter(item => item !== undefined);

    const currentTimePoint = {
      id: 'current-time',
      content: 'Simulated Time',
      start: minTime,
      end: currentTime,
      type: 'background',
      className: 'current-time-point',
      editable: false,
      group: 2,
    };

    const RenderTimePoint = {
      id: 'Render-time',
      content: 'O',
      start: currentRenderTime,
      type: 'box',
      className: 'current-time-point',
      editable: true,
      group: 2,
    };

    const items = new DataSet([...particleItems, currentTimePoint, RenderTimePoint]);

    const options = {
      stack: true,
      align: 'centre',
      showCurrentTime: false,
      autoResize: true,
      minHeight: '200px',
      orientation: 'top',
      horizontalScroll: true,
      verticalScroll: true,
      zoomable: true,
      zoomFriction: 20,
      editable: false,
      showMajorLabels: true,
      showMinorLabels: true,
      start: zoomStartTime, // Apply zoom start time
      end: zoomEndTime, // Apply zoom end time
      format: {
        minorLabels: {
          second: 's',
          minute: 'm',
          hour: 'h',
        },
        majorLabels: {
          millisecond: 'HH:mm:ss',
          second: 'D MMMM HH:mm',
          minute: 'ddd D MMMM',
          hour: 'ddd D MMMM',
          weekday: 'MMMM YYYY',
          day: 'MMMM YYYY',
          week: 'MMMM YYYY',
          month: 'YYYY',
          year: ''
        },
      },
      onRangeChange: (properties) => {
        // Update the state when the user zooms or scrolls
        setZoomStartTime(properties.start);
        setZoomEndTime(properties.end);
      }
    };

    if (timelineRef.current) {
      const currentTimeline = timelineRef.current.timeline;

      if (!currentTimeline) {
        const newTimeline = new Timeline(timelineRef.current, items, groups, options);
        timelineRef.current.timeline = newTimeline;
      } else {
        // Update the timeline with new items and options
        currentTimeline.setItems(items);
        currentTimeline.setGroups(groups);
        currentTimeline.setOptions(options);
      }
    }

  }, [timePoints, starttime, particles, RenderTime, elapsedTime, zoomStartTime, zoomEndTime]);

  const handleStartPause = () => {
    dispatch(startPauseTimer());
  };

  const handleRenderStartPause = () => {
    setRenderRunning(prevState => !prevState);
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
    dispatch(setstarttime(selectedDate.valueOf()));
    setShowDatePicker(false);
  };

  const handleSetCurrentTime = () => {
    setSelectedDate(moment());
  };

  return (
    <div className="exptimer-container">
      <div className="time-controller">
        <div className="controller-content">
          <p style={{ color: 'white', textAlign: 'center', margin: 0, padding: 0 }}>{formattedCurrentTime}</p>
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
            <button className="control-btn" onClick={handleRenderStartPause}>
              {RenderRunning ? '⏸️' : '▶️'}
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
            onChange={(date) => setSelectedDate(moment(date))}
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
