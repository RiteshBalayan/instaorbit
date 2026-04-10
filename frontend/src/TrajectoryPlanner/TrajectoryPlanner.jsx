import React from 'react';
import RightToolbar from './Windows/Sidebar/RightToolbar';
import { useSelector } from 'react-redux';
import '../Styles/simulator/Simulator.css';
import GlobeAndTimer from './Windows/GlobeAndTimer';
import CustomCursor from '../components/CustomCursor';
import useTSDB from '../hooks/useTSDB';

/**
 * 
 */
function TrajectoryPlanner() {
  /* Initialise TSDB session & keep windowed data in sync with RenderTime */
  useTSDB();

  return (
    <div className="simulator">
      <GlobeAndTimer />
      <RightToolbar />
    </div>
  );
}

export default TrajectoryPlanner;
