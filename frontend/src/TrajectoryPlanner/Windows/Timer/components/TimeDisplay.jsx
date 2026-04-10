/**
 * TimeDisplay component - Premium with circular clock
 * Displays current time with circular progress and elapsed time
 */

import React from 'react';

export const TimeDisplay = ({ 
  currentTime, 
  elapsedTime, 
  timeUnit, 
  onUnitChange,
  timeUnitConfig,
  compact = false,
}) => {
  const date = currentTime instanceof Date ? currentTime : new Date(currentTime);
  const safeDate = Number.isNaN(date?.valueOf?.()) ? new Date() : date;

  const formattedCurrentTime = safeDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    hourCycle: 'h23',
    timeZone: 'UTC',
  });

  return (
    <div className={`premiere-time-display cc-time ${compact ? 'cc-time--compact' : ''}`}>
      <div className="cc-time__stack">
        <div className="cc-time__miniLabel">SIM TIME (UTC)</div>
        <div className="cc-time__value">{formattedCurrentTime}</div>
        <div className="cc-time__elapsedValue">T+ {elapsedTime}</div>
      </div>

      <div className="time-units cc-time__units" aria-label="Time unit">
        {timeUnitConfig.map(({ value, abbreviation }) => (
          <button
            key={value}
            onClick={() => onUnitChange(value)}
            className={`unit-btn ${timeUnit === value ? 'active' : ''}`}
            title={abbreviation}
          >
            {abbreviation}
          </button>
        ))}
      </div>
    </div>
  );
};
