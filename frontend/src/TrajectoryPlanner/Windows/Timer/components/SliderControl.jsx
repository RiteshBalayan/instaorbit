/**
 * SliderControl - Premium slider with value display
 */
import React from 'react';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

export const SliderControl = ({ 
  label, 
  value, 
  onChange, 
  min = 0, 
  max = 50, 
  unit = 'sec',
  icon,
  disabled = false
}) => {
  return (
    <div className={`slider-control ${disabled ? 'disabled' : ''}`}>
      <div className="slider-header">
        <span className="slider-label">
          {icon && <span className="slider-icon">{icon}</span>}
          {label}
        </span>
        <span className="slider-value">{value}{unit}</span>
      </div>
      <Slider
        min={min}
        max={max}
        value={value}
        onChange={onChange}
        disabled={disabled}
        railStyle={{ 
          backgroundColor: 'rgba(100, 150, 200, 0.2)', 
          height: 6,
          borderRadius: 3
        }}
        trackStyle={{ 
          backgroundColor: '#5a9fd4', 
          height: 6,
          borderRadius: 3
        }}
        handleStyle={{
          backgroundColor: '#5a9fd4',
          border: '2px solid #fff',
          width: 18,
          height: 18,
          marginTop: -6,
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
          opacity: 1
        }}
      />
    </div>
  );
};
