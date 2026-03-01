/**
 * Custom hook for render timer logic
 * Manages render time progression independently from simulation time
 */

import { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateRenderTime, setElapsedTime } from '../../../../Store/timeSlice';
import { roundToThreeDecimals } from '../utils';

// Minimum interval to prevent performance issues
const MIN_INTERVAL_MS = 10;

/**
 * Calculate proper interval in milliseconds from step size in seconds
 * @param {number} stepSeconds - Step size in seconds
 * @returns {number} Interval in milliseconds
 */
const calculateIntervalMs = (stepSeconds) => {
  // Convert seconds to milliseconds, with a minimum floor
  return Math.max(MIN_INTERVAL_MS, 1000 / Math.max(1, stepSeconds));
};

/**
 * Hook for managing render timer (decoupled mode)
 * @param {number} renderStep - Render time increment per step (seconds)
 * @returns {object} Render timer state and controls
 */
export const useRenderTimer = (renderStep) => {
  const dispatch = useDispatch();
  const renderIntervalRef = useRef(null);
  const [renderRunning, setRenderRunning] = useState(false);
  
  // Redux state
  const RenderTime = useSelector((state) => state.timer.RenderTime);
  const coupled = useSelector((state) => state.timer.coupled);
  const isSimRunning = useSelector((state) => state.timer.isRunning);
  const elapsedTime = useSelector((state) => state.timer.elapsedTime);

  // Coupled mode: render time directly follows simulation time
  // No interval needed - just sync whenever elapsedTime changes
  useEffect(() => {
    if (coupled) {
      // In coupled mode, RenderTime should always equal elapsedTime
      dispatch(updateRenderTime(elapsedTime));
    }
  }, [coupled, elapsedTime, dispatch]);

  // Decoupled mode: independent render timer with its own interval
  useEffect(() => {
    // Only run independent timer when decoupled AND renderRunning
    if (coupled || !renderRunning) {
      clearInterval(renderIntervalRef.current);
      return;
    }

    const intervalMs = calculateIntervalMs(renderStep);
    renderIntervalRef.current = setInterval(() => {
      const newTime = roundToThreeDecimals(RenderTime + renderStep);
      dispatch(updateRenderTime(newTime));
    }, intervalMs);

    return () => {
      clearInterval(renderIntervalRef.current);
    };
  }, [coupled, renderRunning, RenderTime, renderStep, dispatch]);

  // Control functions
  const togglePlayPause = () => {
    if (!coupled) {
      setRenderRunning((prev) => !prev);
    }
  };

  const setRenderTime = (time) => {
    // Update render time (visual playhead position / playhead)
    dispatch(updateRenderTime(time));
    // Only advance the simulation frontier (elapsedTime) when scrubbing
    // FORWARD past the current frontier.  Scrubbing backward is pure
    // playback — the trace data already exists, so no new simulation is
    // needed and elapsedTime must stay at its high-water mark.
    if (time > elapsedTime) {
      dispatch(setElapsedTime(time));
    }
  };

  return {
    // State
    renderTime: RenderTime,
    renderRunning,
    coupled,
    
    // Actions
    togglePlayPause,
    setRenderTime,
  };
};
