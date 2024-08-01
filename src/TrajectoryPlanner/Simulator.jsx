import React  from 'react';
import Timer from './Windows/Timer';
import UtilityPanel from './Windows/UtilityPanel';
import Globe from './Windows/Globe';

function Simulator() {
  return (
    <>
    <Globe />
    <Timer />
    <UtilityPanel />
    </>
  );
}

export default Simulator;
