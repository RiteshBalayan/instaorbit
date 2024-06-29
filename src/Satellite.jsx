import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const Satellite = ({ elapsedTime, radius, theta }) => {
  const satelliteRef = useRef();
  const lineRef = useRef();
  const [tracePoints, setTracePoints] = useState([]);

  useEffect(() => {
    if (elapsedTime === 0) {
      setTracePoints([]);
    }
  }, [elapsedTime]);

  useFrame(() => {
    const t = elapsedTime*radius*0.2;
    const x = radius * Math.cos(t * 5);
    const z = radius * Math.sin(t * 5);
    const phi = 0.05 * t;

    if (satelliteRef.current) {
      satelliteRef.current.position.x = x * Math.cos(theta) * Math.cos(phi) + z * Math.sin(phi);
      satelliteRef.current.position.y = x * Math.sin(theta);
      satelliteRef.current.position.z = -x * Math.cos(theta) * Math.sin(phi) + z * Math.cos(phi);

      setTracePoints(prevPoints => [
        ...prevPoints,
        satelliteRef.current.position.x,
        satelliteRef.current.position.y,
        satelliteRef.current.position.z
      ]);

      if (lineRef.current) {
        lineRef.current.geometry.setAttribute(
          'position',
          new THREE.Float32BufferAttribute(tracePoints, 3)
        );
      }
    }
  });

  return (
    <>
      <mesh ref={satelliteRef}>
        <sphereGeometry args={[0.05, 4, 4]} />
        <meshStandardMaterial color="red" />
      </mesh>
      <line ref={lineRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={new Float32Array(tracePoints)}
            count={tracePoints.length / 3}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="yellow" linewidth={0.5} />
      </line>
    </>
  );
};

export default Satellite;
