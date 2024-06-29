import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import SateliteRender from './SateliteRender';

const GlobeRender = ({ elapsedTime}) => {
    const earthRef = useRef();
    const texture = useLoader(THREE.TextureLoader, './00_earthmap1k.jpg');

  
    useFrame(() => {
      if (earthRef.current) {
        earthRef.current.rotation.y += 0.000;
      }
    });
  
  
    return (
      <>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 3, 5]} />
        <Stars radius={300} depth={50} count={20000} factor={7} saturation={0} fade speed={1} />
        
        <mesh ref={earthRef}>
          <sphereGeometry args={[2, 32, 32]} />
          <meshStandardMaterial map={texture} />
        </mesh>
  
        <SateliteRender elapsedTime={elapsedTime} />
        
        <OrbitControls enableZoom={true} />
      </>
    );
  };
  
  export default GlobeRender;