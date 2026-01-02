/**
 * CircularClock - Premium circular progress clock display
 */
import React from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

export const CircularClock = ({ currentTime, elapsedSeconds }) => {
  // Calculate percentage for circular display (0-60 seconds cycle)
  const percentage = (elapsedSeconds % 60) / 60 * 100;

  return (
    <div style={{ 
      width: '65px', 
      height: '65px', 
      margin: '0 auto'
    }}>
      <CircularProgressbar
        value={percentage}
        text={currentTime}
        styles={buildStyles({
          textSize: '9px',
          pathColor: '#00e5ff',
          textColor: '#00e5ff',
          trailColor: 'rgba(0, 229, 255, 0.1)',
          pathTransitionDuration: 0.5,
        })}
        strokeWidth={6}
      />
    </div>
  );
};
