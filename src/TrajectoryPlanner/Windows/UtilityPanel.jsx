import React, { useState } from 'react';
import '../../styles/simulator/UtilityPanel.css';
import SatelliteConfig from '../3DRender/ConfigSatellite';

const UtilityPanel = () => {
  const [topHeight, setTopHeight] = useState(50); // Default height for the top section

  const handleMouseDown = (e) => {
    const startY = e.clientY;
    const startTopHeight = topHeight;

    const onMouseMove = (e) => {
      const newHeight = startTopHeight + (e.clientY - startY);
      if (newHeight > 20 && newHeight < 500) {
        setTopHeight(newHeight);
      }
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div className="utility-panel">
      <div className="panel-top" style={{ height: `${topHeight}px` }}>
        {/* Top section content here */}
        <h2>Satellites</h2>
        <SatelliteConfig />
      </div>
      <div className="resize-line" onMouseDown={handleMouseDown}></div>
      <div className="panel-bottom">
        {/* Bottom section content here */}
        <p>Bottom Section Content</p>
      </div>
    </div>
  );
};

export default UtilityPanel;
