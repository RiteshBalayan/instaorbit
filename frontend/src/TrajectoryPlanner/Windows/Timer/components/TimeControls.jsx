/**
 * TimeControls component - Premiere Pro style
 * Play/Pause and Reset buttons for simulation control
 */

import React from 'react';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ReplayIcon from '@mui/icons-material/Replay';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';

export const TimeControls = ({ 
  isRunning, 
  onPlayPause, 
  onReset,
  renderRunning,
  coupled,
  onRenderPlayPause,
  onCouplingToggle
}) => {
  return (
    <div className="transport-controls">
      <button 
        className={`control-btn ${isRunning ? 'primary' : ''}`}
        onClick={onPlayPause}
        title={isRunning ? 'Pause Sim (Space)' : 'Play Sim (Space)'}
      >
        {isRunning ? <PauseIcon /> : <PlayArrowIcon />}
      </button>
      <button 
        className={`control-btn ${coupled ? 'disabled' : ''} ${renderRunning ? 'primary' : ''}`}
        onClick={onRenderPlayPause}
        disabled={coupled}
        title={coupled ? 'Render disabled (coupled)' : (renderRunning ? 'Pause Render' : 'Play Render')}
        style={{
          opacity: coupled ? 0.3 : 1,
          cursor: coupled ? 'not-allowed' : 'pointer'
        }}
      >
        {renderRunning ? <PauseIcon /> : <PlayArrowIcon />}
      </button>
      <button 
        className="control-btn danger" 
        onClick={onReset}
        title="Reset Timeline"
      >
        <ReplayIcon />
      </button>
      <div style={{ width: '1px', height: '30px', background: 'rgba(100, 100, 100, 0.4)', margin: '0 4px' }}></div>
      <button 
        className={`control-btn ${coupled ? '' : 'primary'}`}
        onClick={onCouplingToggle}
        title={coupled ? 'Decouple Timeline' : 'Couple Timeline'}
      >
        {coupled ? <LinkIcon /> : <LinkOffIcon />}
      </button>
    </div>
  );
};
