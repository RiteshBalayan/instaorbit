/**
 * StartTimeControl component - Premiere Pro style
 * Displays start time and button to open date picker
 */

import React from 'react';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

export const StartTimeControl = ({ 
  startTime, 
  onOpenPicker,
  compact = false,
}) => {
  return (
    <div className={`starttime-container ${compact ? 'starttime-container--compact' : ''}`}>
      <div className="starttime-label">START (UTC)</div>
      <div className="starttime-display" title={startTime}>
        {startTime}
      </div>
      <button className={`starttime-btn ${compact ? 'starttime-btn--icon' : ''}`} onClick={onOpenPicker} aria-label="Set start time" title="Set start time">
        <CalendarTodayIcon sx={{ fontSize: 16 }} />
        {!compact && 'Set Start Time'}
      </button>
    </div>
  );
};
