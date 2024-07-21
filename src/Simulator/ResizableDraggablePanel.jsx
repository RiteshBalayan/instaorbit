import React, { useState } from 'react';
import '../styles/simulator/ResizableDraggablePanel.css'; // Import CSS for styling
import MapRender from './Twomap/MapRender'

const ResizableDraggablePanel = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div
      className={`panel ${isExpanded ? 'expanded' : 'minimized'}`}
      onClick={toggleExpand}
    >
      <div className="content">
        {isExpanded ? 'Expanded Panel Content' : 'Minimized Panel Content'}
        <MapRender />
      </div>
    </div>
  );
};

export default ResizableDraggablePanel;
