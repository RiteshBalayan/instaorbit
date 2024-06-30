// src/App.jsx
import React from 'react';
import { Canvas } from '@react-three/fiber';
import { useSelector } from 'react-redux';
import Timer from './Timer';
import './App.css';
import GlobeRender from './GlobeRender';
import MapRender from './MapRender';


function App() {
  const elapsedTime = useSelector((state) => state.timer.elapsedTime);

  return (
    <div className="App">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Timer />
        <MapRender />
        <Canvas style={{ height: '400px', width: '50%' }}>
          <GlobeRender elapsedTime={elapsedTime} />
        </Canvas>
        
      </div>
      
    </div>
  );
}

export default App;
