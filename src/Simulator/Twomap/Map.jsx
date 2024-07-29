import React, { useRef, useEffect } from 'react';
import {  useSelector } from 'react-redux';
import * as THREE from 'three';

const Map = ({  particleId }) => {

  //For current satelite position
  const Satelite = useSelector(state => state.CurrentState.satelite.find(p => p.id === particleId));
  //For Trajectory
  const particle = useSelector(state => state.particles.particles.find(p => p.id === particleId));
  const elapsedTime = useSelector((state) => state.timer.elapsedTime);
  const starttime = useSelector((state) => state.timer.starttime)

  // Refs for points and lines and sun
  const pointsRef = useRef();
  const lineRef = useRef();
  const sunRef = useRef();

  useEffect(() => {
    if (sunRef.current) {
      const initialtime = new Date(starttime);
      initialtime.setHours(0, 0, 0, 0);
      const phase = (starttime - initialtime) / (1000 * 60 * 60);
      const speed = (2 * Math.PI) / (24 * 60 * 60); // Speed of revolution

      const sunX = Math.cos((speed * elapsedTime) + (phase / 24) * 2 * Math.PI);
      const sunZ = Math.sin((speed * elapsedTime) + (phase / 24) * 2 * Math.PI);
      const sunY = 0;

      const r = Math.sqrt(sunX ** 2 + sunY ** 2 + sunZ ** 2);
      const twoDphi = Math.atan2(-sunZ, sunX); // Angle from positive x axis
      const twoDTheta = Math.acos(sunY / r); // Angle from positive z axis

      const suntwodX = (twoDphi / Math.PI) * 7.5;
      const suntwodY = ((-twoDTheta / Math.PI) + 0.5) * 7.5;

      sunRef.current.position.set(suntwodX, suntwodY, 1);
    }
  }, [elapsedTime, starttime]);

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
      <mesh ref={sunRef}>
        <sphereGeometry args={[0.1, 4, 4]} />
        <meshStandardMaterial color="orange" />
      </mesh>
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

