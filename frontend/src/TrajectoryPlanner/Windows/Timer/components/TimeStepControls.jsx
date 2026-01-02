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
  onRenderStepChange 
}) => {
  const handleSimSliderChange = (value) => {
    onSimStepChange({ target: { value } });
  };

  return (
    <div className="step-slider-container">
      <div className="slider-header">
        <span className="slider-label">Step Size</span>
        <span className="slider-value">{simStep}s</span>
      </div>
      <Slider
        min={1}
        max={50}
        value={simStep}
        onChange={handleSimSliderChange}
        railStyle={{ backgroundColor: 'rgba(80, 80, 80, 0.4)', height: 4 }}
        trackStyle={{ backgroundColor: '#0078d4', height: 4 }}
        handleStyle={{
          backgroundColor: '#0078d4',
          border: '2px solid #005a9e',
          width: 16,
          height: 16,
          marginTop: -6,
          boxShadow: '0 2px 8px rgba(0, 120, 212, 0.4)'
        }}
      />
    </div>
  );
};
