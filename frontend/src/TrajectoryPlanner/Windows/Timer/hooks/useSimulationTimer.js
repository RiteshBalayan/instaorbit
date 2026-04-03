/**
 * Custom hook for simulation timer logic
 * Manages simulation time progression and control
 *
 * HARD RULE: simulation always advances in 1-second increments.
 * The `speed` parameter controls how many 1-second steps are
 * batched per real-time tick (render speed multiplier).
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

/**
 * Hook for managing simulation timer
 * @param {number} speed - Render speed multiplier (how many sim-seconds per tick)
 * @returns {object} Timer state and control functions
 */
export const useSimulationTimer = (speed = 1) => {
  const dispatch = useDispatch();
  const intervalRef = useRef(null);
  
  // Redux state
  const isRunning = useSelector((state) => state.timer.isRunning);
  const elapsedTime = useSelector((state) => state.timer.elapsedTime);
  const starttime = useSelector((state) => state.timer.starttime);
  const coupled = useSelector((state) => state.timer.coupled);
  const timePoints = useSelector((state) => state.timer.timePoints);

  // Timer effect — ticks once per real second, jumps `speed` sim-seconds per tick.
  // At speed=1  → 1 sim-sec / real-sec  (real time)
  // At speed=20 → 20 sim-secs / real-sec (fast forward)
  // The Simulator will fill in every 1-second step between ticks.
  useEffect(() => {
    if (!isRunning) {
      clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      const jump = Math.max(1, Math.round(speed));
      const newTime = roundToThreeDecimals(elapsedTime + jump);
      dispatch(updateElapsedTime(newTime));
      dispatch(addTimePoint(newTime));
    }, 1000); // 1 tick per real second

    return () => {
      clearInterval(intervalRef.current);
    };
  }, [isRunning, elapsedTime, speed, dispatch]);

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
