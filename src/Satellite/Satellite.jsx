import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useDispatch, useSelector } from 'react-redux';
import { addTracePoint, initializeParticles } from '../Store/StateTimeSeries';
import { updateCoordinate } from '../Store/CurrentState';

const Satellite = ({ particleId, elapsedTime, radius, theta }) => {
  const satelliteRef = useRef();
  const lineRef = useRef();
  const dispatch = useDispatch();

  const particle = useSelector(state => state.particles.particles.find(p => p.id === particleId));
  const prevElapsedTime = useRef(elapsedTime);

  
  useEffect(() => {
    // Check if elapsedTime has changed
    if (elapsedTime !== prevElapsedTime.current) {
      const t = elapsedTime * radius * 2;
      const x = radius * Math.cos(t * 5);
      const z = radius * Math.sin(t * 5);
      const phi = 0.05 * t;

      if (satelliteRef.current) {
        const newX = x * Math.cos(theta) * Math.cos(phi) + z * Math.sin(phi);
        const newY = x * Math.sin(theta);
        const newZ = -x * Math.cos(theta) * Math.sin(phi) + z * Math.cos(phi);

        satelliteRef.current.position.set(newX, newY, newZ);

        const r = Math.sqrt((newX)**2 + (newY)**2 + (newZ)**2)
        const newPhi = Math.atan(newX/newZ)
        const newTheta = Math.acos(newY/r)
        const twodY = newX
        const twodX = (newPhi/(Math.PI/2))*5

        const tracePoint = {time: elapsedTime, x: newX, y: newY, z: newZ, mapX: twodX, mapY: twodY};
        dispatch(addTracePoint({ id: particleId, tracePoint }));
        dispatch(updateCoordinate({id: particleId, coordinates: tracePoint }))

        const newTracePoints = particle.tracePoints.flatMap(p => [p.x, p.y, p.z]);

        if (lineRef.current) {
          lineRef.current.geometry.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(newTracePoints, 3)
          );
        }
      }

      // Update previous elapsedTime
      prevElapsedTime.current = elapsedTime;
    }
  }, [dispatch, elapsedTime, particleId, particle, radius, theta]);

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
            array={new Float32Array(particle ? particle.tracePoints.flatMap(p => [p.x, p.y, p.z]) : [])}
            count={particle ? particle.tracePoints.length : 0}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="yellow" linewidth={0.5} />
      </line>
    </>
  );
};

export default Satellite;
