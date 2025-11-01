import React from 'react';
import UtilityPanel from './Windows/Sidebar/UtilityPanel';
import '../Styles/simulator/Simulator.css';
import GlobeAndTimer from './Windows/GlobeAndTimer';
import CustomCursor from '../components/CustomCursor';

/**
 * 
 */
function TrajectoryPlanner() {

  return (
    <div className="simulator">
      <GlobeAndTimer />
      <UtilityPanel />

    </div>
  );
}

export default TrajectoryPlanner;
