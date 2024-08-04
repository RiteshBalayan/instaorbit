import React, { useState } from 'react';
import '../../Styles/simulator/UtilityPanel.css';
import SatelliteConfig from '../3DRender/ConfigSatellite';
import UtilityControl from './UtilityControl';

const UtilityPanel = () => {
  const [topHeight, setTopHeight] = useState(60);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleDrag = (e) => {
    const newTopHeight = (e.clientY / window.innerHeight) * 100;
    if (newTopHeight > 10 && newTopHeight < 90) { // Limit panel size to prevent collapsing
      setTopHeight(newTopHeight);
    }
  };

  const togglePanel = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div>
      {isCollapsed ? (
        <button className="toggle-button" onClick={togglePanel}>
          Utility Panel
        </button>
      ) : (
        <div className="resizable-panels">
          <button className="collapse-button" onClick={togglePanel}>
            Collapse
          </button>
          <div className="top-panel" style={{ height: `${topHeight}%` }}>
            <SatelliteConfig />
          </div>
          <div
            className="drag-line"
            onMouseDown={(e) => {
              e.preventDefault();
              window.addEventListener('mousemove', handleDrag);
              window.addEventListener('mouseup', () => {
                window.removeEventListener('mousemove', handleDrag);
              }, { once: true });
            }}
          />
          <div className="bottom-panel" style={{ height: `${100 - topHeight}%` }}>
            <UtilityControl />
          </div>
        </div>
      )}
    </div>
  );
};

export default UtilityPanel;
