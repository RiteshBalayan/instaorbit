import React from 'react';
import '../../Styles/simulator/Globe.css';
import GlobeRender from '../3DRender/GlobeRender';
import SlimTopBar from './TopBar';
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

