import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import Satellites from './Satellites';
import { useDispatch } from 'react-redux';
import { initializeParticles } from './StateTimeSeries';


const EarthScene = ({ elapsedTime}) => {
  const earthRef = useRef();

  const dispatch = useDispatch();

  const [tracePoints, setTracePoints] = useState([]);
  const satellitesConfig = [
    { id: 0, radius: 2.1, theta: 0.1 },
    { id: 1, radius: 2.2, theta: 1 },
    { id: 2, radius: 2.5, theta: 0.3 },
    // Add more satellite configurations as needed
  ];

  useEffect(() => {
    if (elapsedTime === 0) {
      dispatch(initializeParticles(satellitesConfig.map(s => ({ id: s.id, tracePoints: [] }))));
    }
  }, [elapsedTime, dispatch]);

  useFrame(() => {
    if (earthRef.current) {
      earthRef.current.rotation.y += 0.000;
    }
  });


  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[5, 3, 5]} />
      <Stars radius={300} depth={50} count={20000} factor={7} saturation={0} fade speed={1} />
      
      <mesh ref={earthRef}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshStandardMaterial
          map={new THREE.TextureLoader().load("./00_earthmap1k.jpg")}
        />
      </mesh>

      <Satellites
        satellitesConfig={satellitesConfig}
        elapsedTime={elapsedTime}
      />
      
      <OrbitControls enableZoom={true} />
    </>
  );
};

export default EarthScene;
