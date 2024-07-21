import React from 'react';
import './Viewer.css';
import SlimTopBar from './SlimTopBar';
import LeafletMap from './LeafletMap';
import ThreeDView from './ThreeDView';

function Viewer() {
  return (
    <div className='Constelation-panel'>
      <div className='top-bar'>
        <SlimTopBar />
      </div>
      <div className='panel-container'>
        <div className='panel-left'>
          <ThreeDView />
        </div>
        <div className='panel-right'>
          <LeafletMap />
        </div>
      </div>
    </div>
  );
}

export default Viewer;
