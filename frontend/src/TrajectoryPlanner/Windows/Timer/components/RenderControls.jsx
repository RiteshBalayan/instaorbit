/**
 * RenderControls component
 * Play/Pause button for render time control (visible only when decoupled)
 */

import React from 'react';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';

export const RenderControls = ({ 
  renderRunning, 
  coupled, 
  onPlayPause 
}) => {
  return (
    <button 
      className={`control-btn ${coupled ? 'disabled' : ''}`}
      onClick={onPlayPause}
      disabled={coupled}
      title={coupled ? 'Render controls disabled (coupled mode)' : (renderRunning ? 'Pause Render' : 'Play Render')}
      style={{
        opacity: coupled ? 0.3 : 1,
        cursor: coupled ? 'not-allowed' : 'pointer',
        transition: 'opacity 0.3s ease'
      }}
    >
      {renderRunning ? <PauseIcon /> : <PlayArrowIcon />}
    </button>
  );
};
