import React from 'react';
import RightToolbar from './Windows/Sidebar/RightToolbar';
import { useSelector } from 'react-redux';
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
      <RightToolbar />
    </div>
  );
}

export default TrajectoryPlanner;
