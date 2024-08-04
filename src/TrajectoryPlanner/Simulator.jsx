import React from 'react';
import Timer from './Windows/Timer';
import UtilityPanel from './Windows/UtilityPanel';
import Globe from './Windows/Globe';
import '../Styles/simulator/Simulator.css';

function Simulator() {

  return (
    <div className="simulator">
      <Globe />
      <Timer />
      <UtilityPanel />
    </div>
  );
}

export default Simulator;
