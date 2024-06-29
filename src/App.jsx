// src/App.jsx
import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import Earth from './Earth'; // Separate EarthScene component
import Timer from './Timer';
import './App.css';


function App() {

  const [elapsedTime, setElapsedTime] = useState(0);

  const handleElapsedTimeChange = (newElapsedTime) => {
    setElapsedTime(newElapsedTime);
  };


  return (
    <div className="App">
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Timer onElapsedTimeChange={handleElapsedTimeChange} />
      <Canvas style={{ height: '500px', width: '100%' }}>
        <Earth elapsedTime={elapsedTime} />
      </Canvas>
    </div>
    </div>
  );
}

export default App;









