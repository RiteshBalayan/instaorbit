import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useDispatch, useSelector } from 'react-redux';
import { addTracePoint, initializeParticles } from '../Store/StateTimeSeries';
import { updateCoordinate } from '../Store/CurrentState';

const Satellite = ({ particleId, elapsedTime, radius, theta, closestapproch, eccentricity, argumentOfPerapsis }) => {
  const satelliteRef = useRef();
  const lineRef = useRef();
  const dispatch = useDispatch();

  const particle = useSelector(state => state.particles.particles.find(p => p.id === particleId));
  const prevElapsedTime = useRef(elapsedTime);

  
  useEffect(() => {
    // Check if elapsedTime has changed
    if (elapsedTime !== prevElapsedTime.current) {
      const closestapprochFromFocus = closestapproch + 2
      const c = ( eccentricity*closestapprochFromFocus )/( 1 - eccentricity)
      const semimazoraxis = c + closestapprochFromFocus
      const semiminoraxis = Math.sqrt(semimazoraxis**2 - c**2)
      const axisofset = semimazoraxis - closestapprochFromFocus
      const t = (elapsedTime / semimazoraxis)*100;
      const x = semiminoraxis * Math.cos(t);
      const y = 0;
      const z = (semimazoraxis * Math.sin(t) ) + axisofset;
      const phi = 0.05 * t;


      const rotateXMatrix = (theta) => [
          [1, 0, 0],
          [0, Math.cos(theta), -Math.sin(theta)],
          [0, Math.sin(theta), Math.cos(theta)]
      ];
      
      const rotateYMatrix = (theta) => [
          [Math.cos(theta), 0, Math.sin(theta)],
          [0, 1, 0],
          [-Math.sin(theta), 0, Math.cos(theta)]
      ];
      
      const rotateZMatrix = (theta) => [
          [Math.cos(theta), -Math.sin(theta), 0],
          [Math.sin(theta), Math.cos(theta), 0],
          [0, 0, 1]
      ];
      
      const multiplyMatrixVector = (matrix, vector) => {
          let [x, y, z] = vector;
          return [
              matrix[0][0] * x + matrix[0][1] * y + matrix[0][2] * z,
              matrix[1][0] * x + matrix[1][1] * y + matrix[1][2] * z,
              matrix[2][0] * x + matrix[2][1] * y + matrix[2][2] * z
          ];
      };

      const rotatex = rotateXMatrix(theta)
      const rotatey = rotateYMatrix(phi) 
      const vector = [x,y,z]

     
      if (satelliteRef.current) {

        // First rotate with rotatex
        const vectorAfterXRotation = multiplyMatrixVector(rotatex, vector);

        // Then rotate with rotatey
        const vectorAfterXYRotation = multiplyMatrixVector(rotatey, vectorAfterXRotation);

        const [newX, newY, newZ] = vectorAfterXYRotation;
      

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
  }, [dispatch, elapsedTime, particleId, particle, theta]);

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
