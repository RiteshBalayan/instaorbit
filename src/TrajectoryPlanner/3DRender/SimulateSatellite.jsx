import React, { useRef, useEffect} from 'react';
import * as THREE from 'three';
import { useDispatch, useSelector } from 'react-redux';
import { addTracePoint, initializeParticles } from '../../Store/StateTimeSeries';
import { updateCoordinate } from '../../Store/CurrentState';
import { Shape } from 'three';
import { meanToEccentricAnomaly, eccentricToTrueAnomaly, keplerianToCartesian, applyZ_X_Z_Rotation, cartesianToKeplerian, getTLE } from './Functions';


import { Sgp4, Satellite as sat } from 'ootk';


const Satellite = ({ particleId, inclination, semimajoraxis, eccentricity, argumentOfPeriapsis, assendingnode, trueanomly, propagator, time }) => {
  const satelliteRef = useRef();
  const lineRef = useRef();
  const dispatch = useDispatch();
  const particle = useSelector(state => state.particles.particles.find(p => p.id === particleId));
  const elapsedTime = useSelector((state) => state.timer.elapsedTime);
  const prevElapsedTime = useRef(elapsedTime);

  //Conversion of units 
  //closestapproch /= 3185.5;//As render earth radius is 2 Unit in render so convert km to unit
  const mu = 398600.4418; // Standard gravitational parameter for Earth in km^3/s^2
  const t = elapsedTime
  inclination = THREE.MathUtils.degToRad(inclination);//Angles in Radian
  argumentOfPeriapsis = THREE.MathUtils.degToRad(argumentOfPeriapsis);
  assendingnode = THREE.MathUtils.degToRad(assendingnode);
  trueanomly = THREE.MathUtils.degToRad(trueanomly);
  console.log(semimajoraxis)

  //Orbit Parameters
  const timeperiod = 2*Math.PI*Math.sqrt((semimajoraxis**3)/mu);
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
      //const renderanomly = eccentricToTrueAnomaly(essentricanomly, eccentricity);

      if (satelliteRef.current) {

        const elements = {
          a: semimajoraxis, // Semi-major axis in km
          e: eccentricity, // Eccentricity
          M: meananomly, // Mean anomaly in radians
          Ω: assendingnode, // Longitude of ascending node in degrees
          ω: argumentOfPeriapsis, // Argument of periapsis in degrees
          i: inclination // Inclination in degrees
          };

          let newX, newY, newZ;

          if (propagator === 'InstaOrbit') {
            const [position, velocity] = keplerianToCartesian(elements);
            [newX, newY, newZ] = position;
          } else if (propagator === 'SGP4') {
            var [tleLine1, tleLine2] = getTLE(elements, time);
            const satrec = Sgp4.createSatrec(tleLine1, tleLine2);
            const state = Sgp4.propagate(satrec, elapsedTime / 60);
            newX = state.position.x;
            newY = state.position.y;
            newZ = state.position.z;
          }
          
          newX /= 3185.5;
          newY /= 3185.5;
          newZ /= 3185.5;

        satelliteRef.current.position.set(newX, newY, newZ);
        //satelliteRef.current.position.set(a, b, c);

        //Mapping 3D coordinates to 2D map
        //North pole is at (0,2,0)
        const r = Math.sqrt((newX)**2 + (newY)**2 + (newZ)**2)
        const twoDphi = Math.atan2(newY, newX) //atan2 is angle measured from positive x axis,range: -180 - 180
        const twoDTheta = Math.acos(newZ/r) //cos inverse, range: 0 to 180
        const twodX = (twoDphi/Math.PI)*7.5
        const twodY = ((-twoDTheta/Math.PI) + 0.5 )*7.5 //0.5 is added to account as angle on sphere start from top


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
  }, [dispatch, elapsedTime, particleId, particle, inclination, trueanomly ]);

  const satelliteconfig = useSelector(state => state.satellites.satellitesConfig.find(p => p.id === particleId));
  const ellipseRef = useRef();
  const satellitepreviewRef = useRef();

  useEffect(() => {
    if (ellipseRef.current && satellitepreviewRef.current && satelliteconfig) {
      // Quick Preview of ellipse for current parameter
      const shape = new Shape();
      const SM = semimajoraxis/3185.5;
      const semiminoraxis = SM * Math.sqrt(1 - eccentricity ** 2);
      const c = Math.sqrt(SM ** 2 - semiminoraxis ** 2);
      shape.absellipse(-c, 0, SM, semiminoraxis, 0, Math.PI * 2, false, 0);

      const points = shape.getPoints(100);
      const rotatedPoints = points.map(point => {
        return applyZ_X_Z_Rotation([point.x, point.y, 0], assendingnode, inclination, argumentOfPeriapsis);
      });

      const geometry = new THREE.BufferGeometry().setFromPoints(rotatedPoints.map(p => new THREE.Vector3(p[0], p[1], p[2])));
      ellipseRef.current.geometry = geometry;

      //Preview of Satellite
      //Calculate Anomly
      const perigeetoanomlytime = (trueanomly / ( 2*(Math.PI) ) )*timeperiod
      const firstperigeetime = perigeetoanomlytime - timeperiod
      const timesinceperigee = (t + firstperigeetime) % timeperiod
      const meananomly = (2*Math.PI*timesinceperigee )/timeperiod
      console.log(trueanomly)
      console.log(meananomly)
      const elements = {
        a: semimajoraxis, // Semi-major axis in km
        e: eccentricity, // Eccentricity
        M: meananomly, // Mean anomaly in radians
        Ω: assendingnode, // Longitude of ascending node in degrees
        ω: argumentOfPeriapsis, // Argument of periapsis in degrees
        i: inclination // Inclination in degrees
        };
      const [position, velocity] = keplerianToCartesian(elements);
      let preX, preY, preZ;
      [preX, preY, preZ] = position;
      preX /= 3185.5;
      preY /= 3185.5;
      preZ /= 3185.5;

      satellitepreviewRef.current.position.set(preX, preY, preZ);

    }
  }, [semimajoraxis, eccentricity, assendingnode, inclination, argumentOfPeriapsis, trueanomly]);

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
      {satelliteconfig.preview &&
        <line ref={ellipseRef} >
          <lineBasicMaterial color="red" linewidth={3} />
        </line>
      }
      {satelliteconfig.preview &&      
      <mesh ref={satellitepreviewRef}>
        <sphereGeometry args={[0.05, 4, 4]} />
        <meshStandardMaterial color="red" />
      </mesh>}
    </>
  );
};

export default Satellite;
