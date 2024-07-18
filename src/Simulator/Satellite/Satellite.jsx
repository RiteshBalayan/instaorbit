import React, { useRef, useEffect} from 'react';
import * as THREE from 'three';
import { useDispatch, useSelector } from 'react-redux';
import { addTracePoint, initializeParticles } from '../../Store/StateTimeSeries';
import { updateCoordinate } from '../../Store/CurrentState';
import { Shape } from 'three';
import { meanToEccentricAnomaly, eccentricToTrueAnomaly } from './Functions';


const Satellite = ({ particleId, elapsedTime, theta, closestapproch, eccentricity, argumentOfPeriapsis, nodalrotation, trueanomly }) => {
  const satelliteRef = useRef();
  const lineRef = useRef();
  const dispatch = useDispatch();
  const particle = useSelector(state => state.particles.particles.find(p => p.id === particleId));
  const prevElapsedTime = useRef(elapsedTime);

  //Conversion of units 
  closestapproch /= 3185.5;//As render earth radius is 2 Unit in render so convert km to unit
  const mu = 0.0443910270;  //Gravitation constant times mass factored to our unit, Orignal value is 3.98589196e14 m^3 s^-2, multiply by 60^2 and divide by 318500^3
  const t = elapsedTime/60;//Convert time
  theta = THREE.MathUtils.degToRad(theta);//Angles in Radian
  argumentOfPeriapsis = THREE.MathUtils.degToRad(argumentOfPeriapsis);
  nodalrotation = THREE.MathUtils.degToRad(nodalrotation);
  trueanomly = THREE.MathUtils.degToRad(trueanomly);

  //Orbit Parameters
  const closestapprochFromFocus = ((closestapproch) + 2);
  const c = ( eccentricity*closestapprochFromFocus )/( 1 - eccentricity);
  const semimazoraxis = (c + closestapprochFromFocus) ;
  const semiminoraxis = (Math.sqrt(semimazoraxis**2 - c**2)) ;
  const axisofset = semimazoraxis - closestapprochFromFocus;
  const timeperiod = 2*Math.PI*Math.sqrt((semimazoraxis**3)/mu);
  const phi = 7.2722e-2 * t; // Account for earth rotation

  useEffect(() => {
    // Check if elapsedTime has changed
    if (elapsedTime !== prevElapsedTime.current) {

      //Calculate Anomly
      const perigeetoanomlytime = (trueanomly / ( 2*(Math.PI) ) )*timeperiod
      const firstperigeetime = perigeetoanomlytime - timeperiod
      const timesinceperigee = (t + firstperigeetime) % timeperiod
      const meananomly = (2*Math.PI*timesinceperigee )/timeperiod
      const essentricanomly = meanToEccentricAnomaly(meananomly, eccentricity);
      const renderanomly = eccentricToTrueAnomaly(essentricanomly, eccentricity);

      //Calculate coordinates on ellipse
      const Xanomly = semiminoraxis * Math.sin(renderanomly)
      const Yanomly = 0
      const Zanomly = (semimazoraxis * Math.cos(renderanomly)) - axisofset;
      const vec = new THREE.Vector3(Xanomly, Yanomly, Zanomly)

      //Rotating transform of Ellipse in three space
      const euler = new THREE.Euler(theta, (argumentOfPeriapsis + phi), nodalrotation, 'XZY');
    
      if (satelliteRef.current) {

        const rotatedVector = vec.applyEuler(euler);
        const [newX, newY, newZ] = rotatedVector;

        satelliteRef.current.position.set(newX, newY, newZ);

        //Mapping 3D coordinates to 2D map
        const r = Math.sqrt((newX)**2 + (newY)**2 + (newZ)**2)
        const twoDphi = Math.atan2(-newZ, newX)
        const twoDTheta = Math.acos(newY/r)
        const twodX = (twoDphi/Math.PI)*7.5
        const twodY = ((-twoDTheta/Math.PI) + 0.5 )*7.5


        const tracePoint = {time: elapsedTime, x: newX, y: newY, z: newZ, mapX: twodX, mapY: twodY};
        dispatch(addTracePoint({ id: particleId, tracePoint })); //Append time series of satellite trajectory
        dispatch(updateCoordinate({id: particleId, coordinates: tracePoint })) //Update current coordinate

        //Maping trajectory in three JS
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


  //Quick Preview of ellipse for current parameter
  const ellipseRef = useRef();
  const shape = new Shape(); // Create the shape path
  shape.absellipse(0, -c, semiminoraxis, semimazoraxis, 0, Math.PI * 2, false, 0);

  // Create points from the shape
  const points = shape.getPoints(100);
  const geometry = new THREE.BufferGeometry().setFromPoints(points);

  // Apply rotations to the geometry
  geometry.rotateX(theta + Math.PI/2);
  geometry.rotateZ(nodalrotation);
  geometry.rotateY(argumentOfPeriapsis + phi);

  const preview = useSelector(state => state.CurrentState.satelite.find(p => p.id === particleId))|| false;
  // this function is in development
  //console.log(preview)

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
