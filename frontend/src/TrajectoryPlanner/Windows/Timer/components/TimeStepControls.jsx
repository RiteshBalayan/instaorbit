/**
 * TimeStepControls component
 * Horizontal slider for render speed multiplier.
 *
 * Simulation always runs at 1-second steps.
 * This slider controls how many sim-seconds are batched per
 * real-time tick (render speed: 1× … 50×).
 */

import React from 'react';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

export const TimeStepControls = ({
  speed,
  onSpeedChange,
  compact = false,
}) => {
  const handleSliderChange = (value) => {
    onSpeedChange(value);
  };

  return (
    <div className={`step-slider-container ${compact ? 'step-slider-container--compact' : ''}`}>
      <div className="slider-header">
        <span className="slider-label">SPEED</span>
        <span className="slider-value">{speed}×</span>
      </div>
      <Slider
        min={1}
        max={50}
        value={speed}
        onChange={handleSliderChange}
        vertical={false}
        style={{ width: '100%' }}
        railStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.10)', height: 4 }}
        trackStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.24)', height: 4 }}
        handleStyle={{
          backgroundColor: 'rgba(255, 255, 255, 0.55)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          width: 12,
          height: 12,
          marginTop: -4,
          boxShadow: 'none'
        }}
      />
    </div>
  );
};
