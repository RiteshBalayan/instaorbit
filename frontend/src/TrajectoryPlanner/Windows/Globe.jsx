import React from 'react';
import '../../Styles/simulator/Globe.css';
import GlobeRender from '../Render/GlobeRender';
import SlimTopBar from './Topbar/TopBar';
import GroundTrack from './GroundTrack';
import { Canvas } from '@react-three/fiber';
import LinkBudgetBoard from './Sidebar/LinkBudgetBoard';

function Globe() {
  return (     
    
    <div className='Globe-panel' style={{ position: 'relative' }}>  
        <SlimTopBar />
        <div className="globe-overlay">
          <LinkBudgetBoard />
        </div>
        <Canvas gl={{ preserveDrawingBuffer: true }}>
            <GlobeRender />
        </Canvas>
        {/*<GroundTrack />*/}
    </div> 
  );
}

export default Globe;
