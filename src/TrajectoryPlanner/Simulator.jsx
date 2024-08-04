import React from 'react';
import UtilityPanel from './Windows/UtilityPanel';
import '../Styles/simulator/Simulator.css';
import GlobeAndTimer from './Windows/GlobeAndTimer';

function Simulator() {

  return (
    <div className="simulator">
      <GlobeAndTimer />
      <UtilityPanel />
    </div>
  );
}

export default Simulator;
