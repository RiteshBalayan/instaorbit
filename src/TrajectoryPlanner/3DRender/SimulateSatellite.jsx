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
            const newX = satellitecurrentcoordinate.coordinates.x
            const newY = satellitecurrentcoordinate.coordinates.y
            const newZ = satellitecurrentcoordinate.coordinates.z
            const newTracePoint = particle.tracePoints.filter(p => p.time < RenderTime)
            .sort((a, b) => b.time - a.time) // Sort in descending order by time

            satelliteRef.current.position.set(newX, newY, newZ);

            const tracePoint = {time: RenderTime, x: newX, y: newY, z: newZ, mapX: 0, mapY: 0};
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
      const mu = 398600.4418; // Standard gravitational parameter for Earth in km^3/s^2
      const t = RenderTime
      const timeperiod = 2*Math.PI*Math.sqrt((semimajoraxis**3)/mu);
      const perigeetoanomlytime = (trueanomly / ( 2*(Math.PI) ) )*timeperiod
      const firstperigeetime = perigeetoanomlytime - timeperiod
      const timesinceperigee = (0 + firstperigeetime) % timeperiod
      const meananomly = (2*Math.PI*timesinceperigee )/timeperiod

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
