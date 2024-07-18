// src/App.jsx
import React, { useState }  from 'react';
import { Canvas } from '@react-three/fiber';
import { useSelector, useDispatch } from 'react-redux';
import Timer from './Timer';
import './Simulator.css';
import GlobeRender from './Satellite/GlobeRender';
import MapRender from './Twomap/MapRender';
import SatelliteConfig from './Satellite/SatelliteConfig';
import { uploadState, downloadState } from '../firebase/firebaseUtils';


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

  //For Save to cloud Functionality
  const dispatch = useDispatch();
  const state = useSelector((state) => state);

  const handleUpload = async () => {
    await uploadState(state);
  };

  const handleDownload = async () => {
    const downloadedState = await downloadState();
    if (downloadedState) {
      // Dispatch actions to set the Redux store state with the downloaded data
      Object.keys(downloadedState).forEach((key) => {
        dispatch({ type: `SET_${key.toUpperCase()}`, payload: downloadedState[key] });
      });
    }
  };

  return (
    <div className="container">
      <button onClick={handleUpload}>Upload</button>
      <button onClick={handleDownload}>Download</button>

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

