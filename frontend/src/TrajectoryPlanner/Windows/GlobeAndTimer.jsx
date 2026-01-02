import React, { useState } from 'react';
import '../../Styles/simulator/GlobeAndTimer.css';
import Globe from './Globe';
import Timer from './Timer';

const GlobeAndTimer = () => {
  const [topHeight, setTopHeight] = useState(75);

  const handleDrag = (e) => {
    const newTopHeight = (e.clientY / window.innerHeight) * 100;
    if (newTopHeight > 10 && newTopHeight < 90) { // Limit panel size to prevent collapsing
      setTopHeight(newTopHeight);
    }
  };

  return (
    <div className="GlobeAndTimer-panels">
      <div className="Globeview-panel" style={{ height: `${topHeight}%` }}>
        <Globe />
      </div>
      <div
        className="dragGlobeTime-line"
        onMouseDown={(e) => {
          e.preventDefault();
          window.addEventListener('mousemove', handleDrag);
          window.addEventListener('mouseup', () => {
            window.removeEventListener('mousemove', handleDrag);
          }, { once: true });
        }}
      />
      <div className="Timer-panel" style={{ height: `${100 - topHeight}%` }}>
        <Timer />
      </div>
    </div>
  );
};

export default GlobeAndTimer;
