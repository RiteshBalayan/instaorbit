import React, { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Datetime from 'react-datetime';
import moment from 'moment';
import { FaClock, FaCalendarAlt, FaHourglassStart, FaRegCalendarCheck } from 'react-icons/fa';
import { AccessAlarm, AccessTime, HourglassFull } from '@mui/icons-material';
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
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ReplayIcon from '@mui/icons-material/Replay';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';

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
  const [coupled, setCoupled] = useState(true); // New state to track if times are coupled

  const [zoomStartTime, setZoomStartTime] = useState(null);
  const [zoomEndTime, setZoomEndTime] = useState(null);

  const currentTime = new Date(starttime + elapsedTime * 1000);
  const formattedCurrentTime = format(currentTime, "dd MMM yyyy hh:mm a");

  const formatFancyTime = (time) => {
    const day = format(time, 'dd');
    const month = format(time, 'MMM');
    const year = format(time, 'yyyy');
    const hour = format(time, 'HH');
    const minute = format(time, 'mm');
    const second = format(time, 'ss');

    return (
      <div style={{ display: 'flex', alignItems: 'center', color: 'white', justifyContent: 'center' }}>
        <FaRegCalendarCheck style={{ fontSize: '16px', marginRight: '8px' }} />
        <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{`${day} ${month} ${year}`}</span>
        <FaClock style={{ fontSize: '16px', margin: '0 8px' }} />
        <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{`${hour}:${minute}:${second}`}</span>
      </div>
    );
  };

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        const newTime = roundToThreeDecimals(elapsedTime + timeStep);
        dispatch(updateElapsedTime(newTime));
        dispatch(addTimePoint(newTime));
      }, 100);

      if (coupled) {
        renderIntervalRef.current = setInterval(() => {
          const newTime = roundToThreeDecimals(elapsedTime + timeStep);
          dispatch(updateRenderTime(newTime));
        }, 1000 / simStep);
      }
    } else {
      clearInterval(intervalRef.current);
      clearInterval(renderIntervalRef.current);
    }

    return () => {
      clearInterval(intervalRef.current);
      clearInterval(renderIntervalRef.current);
    };
  }, [isRunning, elapsedTime, timeStep, simStep, RenderTime, dispatch, coupled]);

  useEffect(() => {
    if (!coupled && RenderRunning) {
      renderIntervalRef.current = setInterval(() => {
        const newTime = roundToThreeDecimals(RenderTime + simStep);
        dispatch(updateRenderTime(newTime));
      }, 1000 / simStep);
    } else if (!RenderRunning && renderIntervalRef.current) {
      clearInterval(renderIntervalRef.current);
    }
    return () => clearInterval(renderIntervalRef.current);
  }, [RenderRunning, RenderTime, simStep, dispatch, coupled]);

  // Timeline effect remains the same
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
      className: 'render-time-point',
      editable: {
        remove: false,
        updateTime: true,
        updateGroup: true,
      },
      selectable: true,
      group: 2,
      onMove: (item, callback) => {
        const newRenderTime = (item.start - now) / 1000;
        dispatch(updateRenderTime(newRenderTime));
        console.log('hi rime shifted')
        callback(item); // Apply the move
      },
      onMoving: (item, callback) => {
        const newRenderTime = (item.start - now) / 1000;
        dispatch(updateRenderTime(newRenderTime));
        console.log('hi time is shifting')
        callback(item); // Continue the move
      },
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
      editable: {
        remove: false,
        updateTime: true,
        updateGroup: true,
      },
      selectable: true,
      showMajorLabels: true,
      showMinorLabels: true,
      onMove: (item, callback) => {
        const newRenderTime = (item.start - now) / 1000;
        dispatch(updateRenderTime(newRenderTime));
        console.log('hi rime shifted')
        callback(item); // Apply the move
      },
      onMoving: (item, callback) => {
        const newRenderTime = (item.start - now) / 1000;
        dispatch(updateRenderTime(newRenderTime));
        console.log('hi time is shifting')
        callback(item); // Continue the move
      },
      //start: zoomStartTime,
      //end: zoomEndTime,
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

    };

    if (timelineRef.current) {
      const currentTimeline = timelineRef.current.timeline;

      if (!currentTimeline) {
        const newTimeline = new Timeline(timelineRef.current, items, groups, options);
        timelineRef.current.timeline = newTimeline;


      } else {
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
    if (!coupled) {
      setRenderRunning(prevState => !prevState);
    }
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

  const handleRenderStepChange = (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      setSimStep(value);
    }
  };

  const handleTimeUnitChange = (unit) => {
    setTimeUnit(unit);
  };

  const handleCoupleToggle = () => {
    setCoupled(prevState => !prevState);
    if (coupled) {
      setRenderRunning(false);
    }
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
            {formatFancyTime(currentTime)}
          <div className="time-display">
          <div style={{ textAlign: 'left', fontFamily: 'Arial, sans-serif', display: 'flex', alignItems: 'center', gap: '15px' }}>
              <p style={{ color: 'white', fontSize: '14px', margin: '0' }}>
                Elapsed time: 
                <span style={{ fontSize: '18px', fontWeight: 'bold', background: '#333', padding: '2px 8px', borderRadius: '4px' }}>
                  {formatElapsedTime()}
                </span>
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ textAlign: 'center' }}>
                  <button onClick={() => handleTimeUnitChange('h')} className="time-unit-btn" style={{ fontSize: '16px', fontWeight: 'bold', color: 'white', background: 'none', border: 'none' }}>
                    H
                  </button>
                  <p style={{ fontSize: '10px', color: 'white', margin: '0' }}>hour</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <button onClick={() => handleTimeUnitChange('m')} className="time-unit-btn" style={{ fontSize: '16px', fontWeight: 'bold', color: 'white', background: 'none', border: 'none' }}>
                    M
                  </button>
                  <p style={{ fontSize: '10px', color: 'white', margin: '0' }}>minute</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <button onClick={() => handleTimeUnitChange('s')} className="time-unit-btn" style={{ fontSize: '16px', fontWeight: 'bold', color: 'white', background: 'none', border: 'none' }}>
                    S
                  </button>
                  <p style={{ fontSize: '10px', color: 'white', margin: '0' }}>second</p>
                </div>
              </div>
            </div>

          </div>
          <div className="control-buttons-container">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', color: 'white' }}>Play/Pause</span>
              <button className="control-btn" onClick={handleStartPause}>
                {isRunning ? <PauseIcon /> : <PlayArrowIcon />}
              </button>
            </div>
            {!coupled && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', color: 'white' }}>Play Render</span>
              <button className="control-btn" onClick={handleRenderStartPause}>
                {RenderRunning ? <PauseIcon /> : <PlayArrowIcon />}
              </button>
            </div> 
            )}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', color: 'white' }}>Reset</span>
                <button className="control-btn" onClick={handleReset}>
                  <ReplayIcon />
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', color: 'white' }}>Decouple</span>
              <button className="control-btn" onClick={handleCoupleToggle}>
                {coupled ? <LinkOffIcon /> : <LinkIcon />}
              </button>
            </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', color: 'white' }}>Seconds/Step</span>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="50"
                  value={timeStep}
                  onChange={handleTimeStepChange}
                  className="time-step-input"
                  style={{ width: '50px', textAlign: 'center' }}
                />
                <span style={{ fontSize: '8px', color: 'white' }}>Sim Steps</span>
              </div>
              {!coupled && (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <span style={{ fontSize: '10px', color: 'white' }}>Seconds/Step</span>
                                <input
                                  type="number"
                                  step="1"
                                  min="0"
                                  max="50"
                                    value={simStep}
                                  onChange={handleRenderStepChange}
                                  className="time-step-input"
                                  style={{ width: '50px', textAlign: 'center' }}
                                />
                                <span style={{ fontSize: '8px', color: 'white' }}>Render Steps</span>
                              </div>
              )}
          </div>
        </div>
        <div className='starttime-container'>
          <p className="starttime-display"> {formatFancyTime(formattedStartTime)} </p>
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
