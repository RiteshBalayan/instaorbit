import React, { useRef, useEffect, useState } from 'react';
import { useFrame, extend } from '@react-three/fiber';
import * as THREE from 'three';
import { useDispatch, useSelector } from 'react-redux';
import { addTracePoint, initializeParticles } from '../Store/StateTimeSeries';
import { updateCoordinate } from '../Store/CurrentState';
import { Shape } from 'three';


const Satellite = ({ particleId, elapsedTime, theta, closestapproch, eccentricity, argumentOfPeriapsis, nodalrotation, trueanomly }) => {
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
      const x = semiminoraxis * Math.cos(t + THREE.MathUtils.degToRad(trueanomly));
      const y = 0;
      const z = (semimazoraxis * Math.sin(t + THREE.MathUtils.degToRad(trueanomly))) + axisofset;
      const phi = 0.05 * t;

      //Anomly calculations
      const mu = 1;
      const timeperiod = 2*Math.PI*Math.sqrt((semimazoraxis**3)/mu);

      // Other Transformations
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

      const rotatex = rotateXMatrix(THREE.MathUtils.degToRad(theta))
      const rotateNodal = rotateZMatrix(THREE.MathUtils.degToRad(nodalrotation))
      const rotatey = rotateYMatrix(phi) 
      const rotateargumentOfPeriapsis = rotateYMatrix(THREE.MathUtils.degToRad(argumentOfPeriapsis))

      const vector = [x,y,z]
    
      if (satelliteRef.current) {

        // Orbit inclination
        const inclinationTransform = multiplyMatrixVector(rotatex, vector);

        // Orbit nodal rotation
        const nodalTransform = multiplyMatrixVector(rotateNodal, inclinationTransform);

        // Then rotate of earth surface (dynamic)
        const vectorAfterXYRotation = multiplyMatrixVector(rotatey, nodalTransform);

        //Fixed rotation (argumentOfPeriapsis)

        const finalposition = multiplyMatrixVector(rotateargumentOfPeriapsis, vectorAfterXYRotation)

        const [newX, newY, newZ] = finalposition;
      
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


  const ellipseRef = useRef();

  const closestapprochFromFocus = closestapproch + 2
  const c = ( eccentricity*closestapprochFromFocus )/( 1 - eccentricity)
  const semimazoraxis = c + closestapprochFromFocus
  const semiminoraxis = Math.sqrt(semimazoraxis**2 - c**2)

  // Create the shape path
  const shape = new Shape();
  shape.absellipse(0, c, semiminoraxis, semimazoraxis, 0, Math.PI * 2, false, 0);


  // Create points from the shape
  const points = shape.getPoints(100);
  const geometry = new THREE.BufferGeometry().setFromPoints(points);

  // Apply rotations to the geometry
  geometry.rotateX(THREE.MathUtils.degToRad(theta) + Math.PI/2);
  geometry.rotateZ(THREE.MathUtils.degToRad(nodalrotation));
  geometry.rotateY(THREE.MathUtils.degToRad(argumentOfPeriapsis));

  const preview = useSelector(state => state.CurrentState.satelite.find(p => p.id === particleId))|| false;;
  console.log(preview)

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
      {preview.visibility &&
        <line ref={ellipseRef} geometry={geometry}>
          <lineBasicMaterial color="red" linewidth={3} />
        </line>
      }
    </>
  );
};

export default Satellite;
