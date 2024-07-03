// src/App.jsx
import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import Maps from './Maps';
import { useLoader, useFrame } from '@react-three/fiber';
import '../App.css';
import { TextureLoader } from 'three';

function MapRender() {
// Load the texture from the provided URL
  const url = "/00_earthmap1k.jpg"
  const texture = useLoader(TextureLoader, url);
  const aspectRatio = texture.image.width / texture.image.height;
  const width = 15;
  const height = width / aspectRatio;

  return (
    <div style={{ width: '40vw', height: '50vh' }}>
      <Canvas style={{ width: '100%', height: '100%' }}>
        {/* Set up an orthographic camera for 2D rendering */}
        <OrthographicCamera makeDefault position={[0, 0, 10]} zoom={50} />
        <ambientLight />

        <mesh>
          <planeGeometry args={[width, height]} />
          <meshBasicMaterial map={texture} />
        </mesh>

        {/* Use the Map component to display the image */}
        <Maps />
      </Canvas>
    </div>

  );
}

export default MapRender;
