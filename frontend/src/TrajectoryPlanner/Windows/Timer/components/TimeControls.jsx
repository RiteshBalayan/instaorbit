/**
 * TimeControls component - Premiere Pro style
 * SIM button for starting/pausing simulation
 */

import React from 'react';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';

export const TimeControls = ({ 
  isRunning, 
  onPlayPause, 
  compact = false,
}) => {
  return (
    <div className="transport-controls">
      <div className="cc-btn">
        <button 
          className={`control-btn ${isRunning ? 'primary' : ''}`}
          onClick={onPlayPause}
          title={isRunning ? 'Pause Simulation' : 'Run Simulation'}
          aria-label={isRunning ? 'Pause simulation' : 'Run simulation'}
        >
          {isRunning ? <PauseIcon /> : <PlayArrowIcon />}
        </button>
        <div className="cc-btn-label">SIM</div>
      </div>
    </div>
  );
};
