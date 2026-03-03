/**
 * TimeControls component - Premiere Pro style
 * Play/Pause and Reset buttons for simulation control
 */

import React from 'react';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ReplayIcon from '@mui/icons-material/Replay';

export const TimeControls = ({ 
  isRunning, 
  onPlayPause, 
  onReset,
  compact = false,
}) => {
  return (
    <div className="transport-controls">
      <div className="cc-btn">
        <button 
          className={`control-btn ${isRunning ? 'primary' : ''}`}
          onClick={onPlayPause}
          title={isRunning ? 'Pause Sim (Space)' : 'Play Sim (Space)'}
          aria-label={isRunning ? 'Pause simulation' : 'Play simulation'}
        >
          {isRunning ? <PauseIcon /> : <PlayArrowIcon />}
        </button>
        <div className="cc-btn-label">PLAY</div>
      </div>

      <div className="cc-btn">
        <button 
          className="control-btn danger" 
          onClick={onReset}
          title="Reset Timeline"
          aria-label="Reset"
        >
          <ReplayIcon />
        </button>
        <div className="cc-btn-label">RESET</div>
      </div>
    </div>
  );
};
