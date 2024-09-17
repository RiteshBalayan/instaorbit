import React, { useState } from 'react';
import '../../Styles/simulator/GroundTrack.css';
import MapRender from '../Render/2DMapRender'

const GroundTrack = () => {
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

export default GroundTrack;
