import React, { useState } from 'react';
import './Layers.css';
import GroupsComponent from './GroundMap';


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
        <h2>Layers</h2>
        <GroupsComponent />

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
