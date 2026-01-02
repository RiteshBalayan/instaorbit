/**
 * Custom hook for time formatting and unit management
 * Manages time unit state and provides formatted time values
 */

import { useState, useMemo } from 'react';
import { formatElapsedTime, formatStandardTime } from '../utils';
import { DEFAULT_TIME_UNIT } from '../constants';

/**
 * Hook for managing time formatting and unit selection
 * @param {number} elapsedTime - Elapsed time in seconds
 * @param {number} startTime - Start timestamp
 * @returns {object} Formatting state and helpers
 */
export const useTimeFormatting = (elapsedTime, startTime) => {
  const [timeUnit, setTimeUnit] = useState(DEFAULT_TIME_UNIT);

  // Calculate current time
  const currentTime = useMemo(() => {
    return new Date(startTime + elapsedTime * 1000);
  }, [startTime, elapsedTime]);

  // Format elapsed time with current unit
  const formattedElapsedTime = useMemo(() => {
    return formatElapsedTime(elapsedTime, timeUnit);
  }, [elapsedTime, timeUnit]);

  // Format current time (standard display)
  const standardCurrentTime = useMemo(() => {
    return formatStandardTime(currentTime);
  }, [currentTime]);

  // Format start time (standard display)
  const standardStartTime = useMemo(() => {
    return formatStandardTime(startTime);
  }, [startTime]);

  return {
    // State
    timeUnit,
    currentTime,
    startTime,
    
    // Formatted values
    formattedElapsedTime,
    standardCurrentTime,
    standardStartTime,
    
    // Actions
    setTimeUnit,
  };
};
