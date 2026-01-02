/**
 * Time conversion utilities for Timer component
 * Handles unit conversions and rounding operations
 */

/**
 * Rounds a number to three decimal places
 * @param {number} num - Number to round
 * @returns {number} Rounded number
 */
export const roundToThreeDecimals = (num) => Math.round(num * 1000) / 1000;

/**
 * Converts time in seconds to the specified unit
 * @param {number} timeInSeconds - Time value in seconds
 * @param {string} unit - Target unit ('s', 'm', 'h')
 * @returns {number} Converted time value
 */
export const convertTimeUnit = (timeInSeconds, unit) => {
  switch (unit) {
    case 'm':
      return timeInSeconds / 60;
    case 'h':
      return timeInSeconds / 3600;
    case 's':
    default:
      return timeInSeconds;
  }
};

/**
 * Converts time from specified unit back to seconds
 * @param {number} time - Time value
 * @param {string} unit - Current unit ('s', 'm', 'h')
 * @returns {number} Time in seconds
 */
export const convertToSeconds = (time, unit) => {
  switch (unit) {
    case 'm':
      return time * 60;
    case 'h':
      return time * 3600;
    case 's':
    default:
      return time;
  }
};

/**
 * Gets unit label for display
 * @param {string} unit - Unit code ('s', 'm', 'h')
 * @returns {string} Full unit name
 */
export const getUnitLabel = (unit) => {
  switch (unit) {
    case 'm':
      return 'minute';
    case 'h':
      return 'hour';
    case 's':
    default:
      return 'second';
  }
};

/**
 * Gets unit abbreviation for display
 * @param {string} unit - Unit code ('s', 'm', 'h')
 * @returns {string} Unit abbreviation
 */
export const getUnitAbbreviation = (unit) => {
  switch (unit) {
    case 'm':
      return 'M';
    case 'h':
      return 'H';
    case 's':
    default:
      return 'S';
  }
};
