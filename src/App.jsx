// src/App.jsx
import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import Timer from './Timer';
import './App.css';
import GlobeRender from './GlobeRender';


function App() {

  const [elapsedTime, setElapsedTime] = useState(0);

  const handleElapsedTimeChange = (newElapsedTime) => {
    setElapsedTime(newElapsedTime);
  };


  return (
    <div className="App">
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Timer onElapsedTimeChange={handleElapsedTimeChange} />
      <Canvas style={{ height: '1000px', width: '100%' }}>
        <GlobeRender elapsedTime={elapsedTime} />
      </Canvas>
    </div>
    </div>
  );
}

export default App;









