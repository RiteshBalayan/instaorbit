/**
 * TimeStepControls component
 * Horizontal slider for time step control
 */

import React from 'react';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

export const TimeStepControls = ({ 
  simStep, 
  renderStep, 
  coupled, 
  onSimStepChange, 
  onRenderStepChange,
  compact = false,
}) => {
  const handleSimSliderChange = (value) => {
    onSimStepChange({ target: { value } });
  };

  return (
    <div className={`step-slider-container ${compact ? 'step-slider-container--compact' : ''}`}>
      <div className="slider-header">
        <span className="slider-label">STEP</span>
        <span className="slider-value">{simStep}s</span>
      </div>
      <Slider
        min={1}
        max={50}
        value={simStep}
        onChange={handleSimSliderChange}
        vertical={false}
        style={{ width: compact ? '100%' : '100%' }}
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
