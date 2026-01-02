/**
 * TimeDisplay component - Premium with circular clock
 * Displays current time with circular progress and elapsed time
 */

import React from 'react';
import { CircularClock } from './CircularClock';

export const TimeDisplay = ({ 
  currentTime, 
  elapsedTime, 
  timeUnit, 
  onUnitChange,
  timeUnitConfig 
}) => {
  // Format currentTime if it's a Date object
  const formattedCurrentTime = currentTime instanceof Date 
    ? currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : String(currentTime || '');

  return (
    <div className="premiere-time-display">
      <div className="time-display-grid">
        {/* Compact Rectangular Time Display */}
        <div className="clock-section">
          <div className="compact-time-label">SIMULATION TIME <span style={{fontSize: '8px', color: '#666'}}>UTC</span></div>
          <div className="compact-time-display">{formattedCurrentTime}</div>
        </div>

        {/* Elapsed time info */}
        <div className="elapsed-section">
          <div className="elapsed-label">ELAPSED</div>
          <div className="elapsed-value">{elapsedTime}</div>
        </div>
      </div>
      
      {/* Unit selector buttons */}
      <div className="time-units">
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
