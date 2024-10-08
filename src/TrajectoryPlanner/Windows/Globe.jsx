import React from 'react';
import '../../Styles/simulator/Globe.css';
import GlobeRender from '../Render/GlobeRender';
import SlimTopBar from './Topbar/TopBar';
import GroundTrack from './GroundTrack';
import { Canvas } from '@react-three/fiber';

function Globe() {
  return (     
    
    <div className='Globe-panel'>  
        <SlimTopBar />
        <Canvas>
            <GlobeRender />
        </Canvas>
        {/*<GroundTrack />*/}
    </div> 
  );
}

export default Globe;

