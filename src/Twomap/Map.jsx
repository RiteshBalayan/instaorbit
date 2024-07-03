import React, { useRef } from 'react';
import {  useSelector } from 'react-redux';
import * as THREE from 'three';

const Map = ({  particleId }) => {


  const Satelite = useSelector(state => state.CurrentState.satelite.find(p => p.id === particleId));
  const particle = useSelector(state => state.particles.particles.find(p => p.id === particleId));

  // Refs for points and lines
  const pointsRef = useRef();
  const lineRef = useRef();

  
  // Set position of the mesh when coordinates are available
  if (pointsRef.current && Satelite) {
    const x = Satelite.coordinates.mapX
    const y = Satelite.coordinates.mapY
    pointsRef.current.position.set(x, y, 1);
  }
  
  if (pointsRef.current) {
    const newTracePoints = particle.tracePoints.flatMap(p => [p.mapX, p.mapY, 0]);
    if (lineRef.current) {
        lineRef.current.geometry.setAttribute(
          'position',
          new THREE.Float32BufferAttribute(newTracePoints, 3)
        );
      }
  }

  return (
    <>
      <mesh ref={pointsRef}>
        <sphereGeometry args={[0.05, 4, 4]} />
        <meshStandardMaterial color="red" />
      </mesh>
      <line ref={lineRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={new Float32Array(particle ? particle.tracePoints.flatMap(p => [p.x, p.y, p.z]) : [])}
            count={particle ? particle.tracePoints.length : 0}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="yellow" linewidth={0.5} />
      </line>
    </>
  );
}

export default Map;

