import React, { useRef } from 'react';
import { useFrame, extend } from '@react-three/fiber';
import * as THREE from 'three';
import './cad.css';


// Extend the THREE namespace to include the necessary geometries
extend({ BoxGeometry: THREE.BoxGeometry, SphereGeometry: THREE.SphereGeometry });

const Shape = ({ type, dimensions, position, rotation }) => {
  const ref = useRef();

  useFrame(() => {
    if (ref.current) {
      ref.current.rotation.x = rotation.x;
      ref.current.rotation.y = rotation.y;
      ref.current.rotation.z = rotation.z;
    }
  });

  return (
    <>
    <mesh ref={ref} position={position}>
      {type === 'cube' && (
        <boxGeometry args={[dimensions.width, dimensions.height, dimensions.breadth]} />
      )}
      {type === 'sphere' && (
        <sphereGeometry args={[dimensions.radius, 32, 32]} />
      )}
      <meshStandardMaterial color="orange" />
    </mesh>
    </>
  );
};

export default Shape;