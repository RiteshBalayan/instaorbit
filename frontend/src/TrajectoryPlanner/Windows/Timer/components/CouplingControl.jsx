/**
 * CouplingControl component - Premiere Pro style
 * Toggle button for coupling/decoupling simulation and render timers
 */

import React from 'react';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';

export const CouplingControl = ({ 
  coupled, 
  onToggle 
}) => {
  return (
    <div className="control-section">
      <div className="section-label">Timeline Mode</div>
      <button 
        className={`control-btn ${coupled ? '' : 'primary'}`}
        onClick={onToggle}
        title={coupled ? 'Decouple Timeline' : 'Couple Timeline'}
      >
        {coupled ? <LinkIcon /> : <LinkOffIcon />}
      </button>
      <div className="mode-indicator">
        {coupled ? 'Coupled' : 'Decoupled'}
      </div>
    </div>
  );
};
