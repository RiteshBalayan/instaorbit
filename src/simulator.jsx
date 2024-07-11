// src/App.jsx
import React, { useState }  from 'react';
import { Canvas } from '@react-three/fiber';
import { useSelector } from 'react-redux';
import Timer from './Timer';
import './Simulator.css';
import GlobeRender from './Satellite/GlobeRender';
import MapRender from './Twomap/MapRender';
import SatelliteConfig from './Satellite/SatelliteConfig';
import Login from './firebase/login';
import SignUp from './firebase/signup';
import SignOut from './firebase/signout';
import GoogleAuth from './firebase/googleauth';


function Simulator() {
  const [isOpen, setIsOpen] = useState(true);
  const [height, setHeight] = useState(800);
  const [width, setWidth] = useState(1100);

  const elapsedTime = useSelector((state) => state.timer.elapsedTime);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleHeightDrag = (e) => {
    setHeight(e.clientY);
  };

  const handleWidthDrag = (e) => {
    setWidth(e.clientX);
  };

  const user = useSelector((state) => state.auth.user);

  return (
    <div className="container">



    <div>
      <h1>Firebase Auth with React</h1>
      {user ? (
        <div>
          <h2>Hello, {user.displayName || user.email}</h2>
          <SignOut />
        </div>
      ) : (
        <div>
          <Login />
          <GoogleAuth />
        </div>
      )}
    </div>



      <div className="panel">
        <div className="main-panel" style={{ height: `${height}px` }}>  
          <div className="primary" style={{ width: `${width}px` }}> 
          
          <Canvas>
              <GlobeRender elapsedTime={elapsedTime} />
          </Canvas>

          </div>

          <div
            className="resizer-vertical"
            onMouseDown={(e) => {
              e.preventDefault();
              document.addEventListener('mousemove', handleWidthDrag);
              document.addEventListener('mouseup', () => {
                document.removeEventListener('mousemove', handleWidthDrag);
              });
            }}
          />
      
          <div className="secontary"> 
          
            <SatelliteConfig />
            <MapRender />
          
          </div>

          <div
            className="resizer-horizontal"
            onMouseDown={(e) => {
              e.preventDefault();
              document.addEventListener('mousemove', handleHeightDrag);
              document.addEventListener('mouseup', () => {
                document.removeEventListener('mousemove', handleHeightDrag);
              });
            }}
          />
        </div>
        <div className="bottom-panel">
          <div className="content">
              <Timer />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Simulator;

