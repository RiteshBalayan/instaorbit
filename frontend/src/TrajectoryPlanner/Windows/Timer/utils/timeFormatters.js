/**
 * Time formatting utilities for Timer component
 * Handles display formatting for various time representations
 */

import { format } from 'date-fns';
import { convertTimeUnit, roundToThreeDecimals } from './timeConversions';

/**
 * Formats elapsed time with specified unit
 * @param {number} elapsedTime - Time in seconds
 * @param {string} unit - Display unit ('s', 'm', 'h')
 * @returns {string} Formatted time string with unit suffix
 */
export const formatElapsedTime = (elapsedTime, unit = 's') => {
  const convertedTime = convertTimeUnit(elapsedTime, unit);
  const roundedTime = roundToThreeDecimals(convertedTime);
  return `${roundedTime.toFixed(3)}${unit}`;
};

/**
 * Formats a date/time into component parts for display
 * @param {Date|number} time - Date object or timestamp
 * @returns {object} Object with formatted date/time parts
 */
export const getFancyTimeParts = (time) => {
  const timeObj = typeof time === 'number' ? new Date(time) : time;
  
  return {
    day: format(timeObj, 'dd'),
    month: format(timeObj, 'MMM'),
    year: format(timeObj, 'yyyy'),
    hour: format(timeObj, 'HH'),
    minute: format(timeObj, 'mm'),
    second: format(timeObj, 'ss'),
  };
};

/**
 * Formats a timestamp to standard date-time string
 * @param {number} timestamp - Unix timestamp
 * @returns {string} Formatted date-time string
 */
export const formatStandardTime = (timestamp) => {
  return format(timestamp, "dd MMM yyyy hh:mm a");
};

/**
 * Formats time for timeline display
 * @param {Date} date - Date object
 * @returns {string} Formatted time for timeline
 */
export const formatTimelineTime = (date) => {
  return format(date, 'HH:mm:ss');
};

/**
 * Creates time display configuration for different scales
 * @returns {object} Format configuration for timeline labels
 */
export const getTimelineFormatConfig = () => ({
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
});
