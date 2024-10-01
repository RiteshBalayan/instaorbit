import React, { useRef, useEffect} from 'react';
import * as THREE from 'three';
import { useDispatch, useSelector } from 'react-redux';
import { addTracePoint, initializeParticles } from '../../Store/StateTimeSeries';
import { updateCoordinate } from '../../Store/CurrentState';
import { Shape } from 'three';
import {  trueToEccentricAnomaly, eccentricToMeanAnomaly, eccentricToTrueAnomaly, keplerianToCartesian, applyZ_X_Z_Rotation, cartesianToKeplerian, getTLE } from '../Simulation/Functions';


import { Sgp4, Satellite as sat } from 'ootk';
import { PositionPoint } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';


const Satellite = ({ particleId, inclination, semimajoraxis, eccentricity, argumentOfPeriapsis, assendingnode, trueanomly, propagator, time, burn, color }) => {
  const satelliteRef = useRef();
  const lineRef = useRef();
  const dispatch = useDispatch();
  const particle = useSelector(state => state.particles.particles.find(p => p.id === particleId));
  const RenderTime = useSelector((state) => state.timer.RenderTime);
  const satellitecurrentcoordinate = useSelector(state => state.CurrentState.satelite.find(p => p.id === particleId));

  const prevRenderTime = useRef(RenderTime);

  inclination = THREE.MathUtils.degToRad(inclination);//Angles in Radian
  argumentOfPeriapsis = THREE.MathUtils.degToRad(argumentOfPeriapsis);
  assendingnode = THREE.MathUtils.degToRad(assendingnode);
  trueanomly = THREE.MathUtils.degToRad(trueanomly);


  useEffect(() => {
    // Check if elapsedTime has changed
    if (RenderTime !== prevRenderTime.current) {

      if (satelliteRef.current) {
      
        if (satellitecurrentcoordinate){

          let lastPoint = particle.tracePoints.filter(p => p.time < RenderTime).slice(-1)[0];
        
          if (lastPoint) {
            satelliteRef.current.position.set(lastPoint.x, lastPoint.y, lastPoint.z);
          }

            const newTracePoints = particle.tracePoints.filter(p => p.time < RenderTime).flatMap(p => [p.x, p.y, p.z]);

            if (lineRef.current) {
              lineRef.current.geometry.setAttribute(
                'position',
                new THREE.Float32BufferAttribute(newTracePoints, 3)
              );
            }
          }
    }
      // Update previous elapsedTime
      prevRenderTime.current = RenderTime;
    }
  }, [RenderTime, particleId, particle, inclination, trueanomly ]);

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
      //Orbit Parameters
        //Conversion of units 
      //closestapproch /= 3185.5;//As render earth radius is 2 Unit in render so convert km to unit
      //const mu = 398600.4418; // Standard gravitational parameter for Earth in km^3/s^2
      //const t = RenderTime
      //const timeperiod = 2*Math.PI*Math.sqrt((semimajoraxis**3)/mu);
      //const perigeetoanomlytime = (trueanomly / ( 2*(Math.PI) ) )*timeperiod
      //const firstperigeetime = perigeetoanomlytime - timeperiod
      //const timesinceperigee = (0 + firstperigeetime) % timeperiod
      //const meananomly = (2*Math.PI*timesinceperigee )/timeperiod
      let eccentricanomly = trueToEccentricAnomaly(trueanomly, eccentricity);
      let meananomly = eccentricToMeanAnomaly(eccentricanomly, eccentricity);

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

  const elapsedTime = useSelector((state) => state.timer.elapsedTime);
  const prevElapsedTime = useRef(elapsedTime);
  const orbitalelements = useSelector(state => state.CurrentState.satelite.find(p => p.id === particleId));
  const burnlineRef = useRef();
  const previewBurn = satelliteconfig?.burns?.find(burn => burn.previewMode);


  useEffect(() => {
    if (orbitalelements && orbitalelements.elements && previewBurn && burnlineRef.current) {
      // Filter out the burn with previewMode set to true
      const previewBurn = satelliteconfig.burns?.find(burn => burn.previewMode);
      const mu = 398600.4418; // Standard gravitational parameter for Earth in km^3/s^2
  
      // Separate state for each Keplerian element
      let a = orbitalelements.elements.a;  
      let e = orbitalelements.elements.e;
      let i = orbitalelements.elements.i;
      let Ω = orbitalelements.elements.Ω;
      let ω = orbitalelements.elements.ω;
      let trueanomly = orbitalelements.elements.ν;
  
      // Calculate Mean anomaly

      let eccentricanomly = trueToEccentricAnomaly(trueanomly, e);
      let meananomly = eccentricToMeanAnomaly(eccentricanomly, e);
      let timeperiod = 2 * Math.PI * Math.sqrt((a ** 3) / mu);
      let Timefix = orbitalelements.timefix;
      let timesincePerigee = (elapsedTime + Timefix) % timeperiod;
      // Update mean anomaly based on elapsed time
      meananomly = (2 * Math.PI * timesincePerigee) / timeperiod;
      //Timefix = (((meananomly / (2 * Math.PI)) * timeperiod) - b.time)
  
      // Convert current orbital elements to Cartesian coordinates
      let [position, velocity] = keplerianToCartesian({ a, e, i, Ω, ω, M: meananomly });
      console.log('elements before feeding');
      console.log({ a, e, i, Ω, ω, M: meananomly })
      console.log(position)
      console.log(Math.sqrt(position[0]**2 + position[1]**2 + position[2]**2))
      console.log(velocity)
      console.log(Math.sqrt(velocity[0]**2 + velocity[1]**2 + velocity[2]**2))
      const ele = cartesianToKeplerian({ position, velocity });
      console.log('elements after feeding');
      console.log(ele)
      

      if (previewBurn) {
        velocity[0] += previewBurn.x;
        velocity[1] += previewBurn.y;
        velocity[2] += previewBurn.z;
      }
  
      // Convert updated Cartesian coordinates back to Keplerian elements
      const newElements = cartesianToKeplerian({ position, velocity });
  
      // Update coordinates
      a = newElements.a;  
      e = newElements.e;
      i = newElements.i;
      Ω = newElements.Ω;
      ω = newElements.ω;
      trueanomly = newElements.ν;
  
      // Recalculate Mean anomaly with updated elements
      {/** 
      timeperiod = 2 * Math.PI * Math.sqrt((a ** 3) / mu);
      perigeetoanomlytime = (trueanomly / (2 * Math.PI)) * timeperiod;
      firstperigeetime = perigeetoanomlytime - timeperiod;
      timesinceperigee = ((elapsedTime) + firstperigeetime) % timeperiod;
      meananomly = (2 * Math.PI * timesinceperigee) / timeperiod;
      M = meananomly;
      */}
  
      // Generate the updated orbit path
      const shape = new Shape();
      const SM = a / 3185.5;
      const semiminoraxis = SM * Math.sqrt(1 - e ** 2);
      const c = Math.sqrt(SM ** 2 - semiminoraxis ** 2);
      shape.absellipse(-c, 0, SM, semiminoraxis, 0, Math.PI * 2, false, 0);
  
      const points = shape.getPoints(100);
      const rotatedPoints = points.map(point => {
        return applyZ_X_Z_Rotation([point.x, point.y, 0], Ω, i, ω);
      });
  
      const geometry = new THREE.BufferGeometry().setFromPoints(rotatedPoints.map(p => new THREE.Vector3(p[0], p[1], p[2])));
      burnlineRef.current.geometry = geometry;
    }
  }, [dispatch, elapsedTime, particleId, satelliteconfig.burns, propagator]);


    

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
        <lineBasicMaterial color={color} linewidth={0.5} />
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
      {previewBurn && (
      <line ref={burnlineRef} >
        <lineBasicMaterial color="blue" linewidth={3} />
      </line>
      )}
    </>
  );
};

export default Satellite;
