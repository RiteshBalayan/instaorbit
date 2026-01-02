/**
 * StartTimeControl component - Premiere Pro style
 * Displays start time and button to open date picker
 */

import React from 'react';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

export const StartTimeControl = ({ 
  startTime, 
  onOpenPicker 
}) => {
  return (
    <div className='starttime-container'>
      <div className="starttime-label">Start Time <span style={{fontSize: '8px', color: '#666'}}>UTC</span></div>
      <div className="starttime-display">
        {startTime}
      </div>
      <button className="starttime-btn" onClick={onOpenPicker}>
        <CalendarTodayIcon sx={{ fontSize: 16 }} />
        Set Start Time
      </button>
    </div>
  );
};
