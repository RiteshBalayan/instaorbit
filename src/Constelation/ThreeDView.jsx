import React, { useRef } from 'react';
import { useLoader, Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useSelector } from 'react-redux';
import { GeoJsonGeometry } from 'three-geojson-geometry';

const ThreeDView = () => {
  const earthRef = useRef();
  const texture = useLoader(THREE.TextureLoader, './00_earthmap1k.jpg');
  const groups = useSelector(state => state.groups.groups);

  return (
    <Canvas>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 3, 5]} />
      <Stars radius={300} depth={50} count={20000} factor={7} saturation={0} fade speed={1} />
      
      <mesh ref={earthRef}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshStandardMaterial map={texture} />
      </mesh>

      {groups.map(group =>
        group.visible && group.layers.map(layer => {
          if (layer.geometry.type === 'Point') {
            const [lng, lat] = layer.geometry.coordinates;
            //lng range: -180 to 180   lat range -90 to 90
            const phi = (90 - lat) * (Math.PI / 180); //pi/180 converts degree to radian
            const theta = (0 - lng) * (Math.PI / 180);
            const radius = 2; // Radius of the globe

            const position = [
              radius * Math.sin(phi) * Math.cos(theta),
              radius * Math.cos(phi),
              radius * Math.sin(phi) * Math.sin(theta),
            ];

            return (
              <mesh key={layer.id} position={position}>
                <sphereGeometry args={[0.01, 16, 16]} />
                <meshBasicMaterial color="red" />
              </mesh>
            );
          } 
          return null;
        })
      )}
      
      <OrbitControls enableZoom={true} />
    </Canvas>
  );
};

export default ThreeDView;
