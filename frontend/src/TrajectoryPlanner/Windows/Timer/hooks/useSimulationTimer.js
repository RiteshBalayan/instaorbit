/**
 * Custom hook for simulation timer logic
 * Manages simulation time progression and control
 */

import { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  startPauseTimer,
  resetTimer,
  updateElapsedTime,
  addTimePoint,
} from '../../../../Store/timeSlice';
import { roundToThreeDecimals } from '../utils';
import { TIMER_UPDATE_INTERVAL } from '../constants';

/**
 * Hook for managing simulation timer
 * @param {number} timeStep - Time increment per step (seconds)
 * @returns {object} Timer state and control functions
 */
export const useSimulationTimer = (timeStep) => {
  const dispatch = useDispatch();
  const intervalRef = useRef(null);
  
  // Redux state
  const isRunning = useSelector((state) => state.timer.isRunning);
  const elapsedTime = useSelector((state) => state.timer.elapsedTime);
  const starttime = useSelector((state) => state.timer.starttime);
  const coupled = useSelector((state) => state.timer.coupled);
  const timePoints = useSelector((state) => state.timer.timePoints);

  // Timer effect
  useEffect(() => {
    if (!isRunning) {
      clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      const newTime = roundToThreeDecimals(elapsedTime + timeStep);
      dispatch(updateElapsedTime(newTime));
      dispatch(addTimePoint(newTime));
    }, TIMER_UPDATE_INTERVAL);

    return () => {
      clearInterval(intervalRef.current);
    };
  }, [isRunning, elapsedTime, timeStep, dispatch]);

  // Control functions
  const togglePlayPause = () => {
    dispatch(startPauseTimer());
  };

  const reset = () => {
    dispatch(resetTimer());
  };

  return {
    // State
    isRunning,
    elapsedTime,
    starttime,
    coupled,
    timePoints,
    
    // Actions
    togglePlayPause,
    reset,
  };
};
