import React from 'react';
import '../../Styles/simulator/Globe.css';
import GlobeRender from '../3DRender/GlobeRender';
import SlimTopBar from './TopBar';
import ResizableDraggablePanel from './ResizableDraggablePanel';
import { Canvas } from '@react-three/fiber';

function Globe() {
  return (     
    <div className='Globe-panel'>  
        <SlimTopBar />
        <Canvas>
            <GlobeRender />
        </Canvas>
        <ResizableDraggablePanel />
    </div> 
  );
}

export default Globe;

