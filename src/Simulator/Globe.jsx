import React from 'react';
import { Canvas } from '@react-three/fiber';
import { useSelector } from 'react-redux';
import '../styles/simulator/Globe.css';
import GlobeRender from './Satellite/GlobeRender';
import SlimTopBar from './SlimTopBar';
import ResizableDraggablePanel from './ResizableDraggablePanel';

function Simulator() {

  const elapsedTime = useSelector((state) => state.timer.elapsedTime);

  return (
    <>      
    <div className='Globe-panel'>  
        <SlimTopBar />
          <Canvas>
              <GlobeRender elapsedTime={elapsedTime} />
          </Canvas>
        <ResizableDraggablePanel />
    </div> 
    </>
  );
}

export default Simulator;

