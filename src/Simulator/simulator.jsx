// src/App.jsx
import React, { useState }  from 'react';
import { Canvas } from '@react-three/fiber';
import { useSelector, useDispatch } from 'react-redux';
import Timer from './Timer';
import './Simulator.css';
import GlobeRender from './Satellite/GlobeRender';
import MapRender from './Twomap/MapRender';
import SlimTopBar from './SlimTopBar';
import UtilityPanel from './UtilityPanel';


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


  return (
    <>
    <SlimTopBar />
    <UtilityPanel />
    <div className="container">
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
    </>
  );
}

export default Simulator;

