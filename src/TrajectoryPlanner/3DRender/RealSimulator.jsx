import React, { useRef, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addTracePoint } from '../../Store/StateTimeSeries';
import { updateCoordinate } from '../../Store/CurrentState';
import { keplerianToCartesian, keplerianToCartesianTrueAnomly, trueToEccentricAnomaly, cartesianToKeplerian, getTLE, eccentricToMeanAnomaly } from './Functions';
import * as THREE from 'three';
import { Sgp4 } from 'ootk';

const RealSimulator = ({ particleId, propagator, burn }) => {

  const dispatch = useDispatch();
  const particle = useSelector(state => state.particles.particles.find(p => p.id === particleId));
  const orbitalelements = useSelector(state => state.CurrentState.satelite.find(p => p.id === particleId))
  const elapsedTime = useSelector((state) => state.timer.elapsedTime);
  const prevElapsedTime = useRef(elapsedTime);
  let Timefix = orbitalelements.timefix;
  //const [Timefix, setTimefix] = useState(null);

  const mu = 398600.4418; // Standard gravitational parameter for Earth in km^3/s^2

  // Separate state for each Keplerian element
  let a = orbitalelements.elements.a;  
  let e = orbitalelements.elements.e;
  let i = orbitalelements.elements.i;
  let Ω = orbitalelements.elements.Ω;
  let ω = orbitalelements.elements.ω;
  let trueanomly = orbitalelements.elements.ν;
  //let M = null; // Mean anomaly, to be calculated


  useEffect(() => {
    // Check if elapsedTime has changed
    if (elapsedTime !== prevElapsedTime.current) {

      // Calculate Mean anomaly
      let eccentricanomly = trueToEccentricAnomaly(trueanomly, e);
      let meananomly = eccentricToMeanAnomaly(eccentricanomly, e);
      let timeperiod = 2 * Math.PI * Math.sqrt((a ** 3) / mu);

      // If Timefix is not set, calculate it and dispatch it to Redux
      if (!Timefix) {
        Timefix = (meananomly / (2 * Math.PI)) * timeperiod;
        console.log('Timefix is bening called')
        dispatch(updateCoordinate({
            id: particleId,
            timefix: Timefix,
        }));
      }

      let timesincePerigee = (elapsedTime + Timefix) % timeperiod;
      // Update mean anomaly based on elapsed time
      meananomly = (2 * Math.PI * timesincePerigee) / timeperiod;

      // Apply burns if any burn time is passed
      if (burn && burn.length > 0) {
        burn.forEach(b => {
          if (prevElapsedTime.current <= b.time && elapsedTime >= b.time) {
            // Apply burn by adjusting Keplerian parameters
            // Convert current orbital elements to Cartesian coordinates
            const [position, velocity] = keplerianToCartesian({ a, e, i, Ω, ω, M: meananomly });
            
            // Apply burn to velocity
            velocity[0] += b.x;
            velocity[1] += b.y;
            velocity[2] += b.z;

            // Convert updated Cartesian coordinates back to Keplerian elements
            const newElements = cartesianToKeplerian({ position, velocity });

            //Update coordonates in console
            a = newElements.a;  
            e = newElements.e;
            i = newElements.i;
            Ω = newElements.Ω;
            ω = newElements.ω;
            trueanomly = newElements.ν;

            //trueanomly = meanToTrueAnomaly(mean, e)

            //setTimefix(b.time)

            // Calculate Mean anomaly
            eccentricanomly = trueToEccentricAnomaly(trueanomly, e);
            meananomly = eccentricToMeanAnomaly(eccentricanomly, e);
            timeperiod = 2 * Math.PI * Math.sqrt((a ** 3) / mu);

            Timefix = (((meananomly / (2 * Math.PI)) * timeperiod) - b.time)

            timesincePerigee = (elapsedTime + Timefix) % timeperiod;
            // Update mean anomaly based on elapsed time
            meananomly = (2 * Math.PI * timesincePerigee) / timeperiod;

            // Update states with new elements
            dispatch(updateCoordinate({
              id: particleId,
              elements: {
                  a : newElements.a , 
                  e : newElements.e ,
                  i : newElements.i ,
                  Ω : newElements.Ω ,
                  ω : newElements.ω ,
                  ν : newElements.ν ,
                    },
              timefix: Timefix,
            }))
          }
        });
      }

      // Update Mean anomaly
      //setM(meananomly);

      let newX, newY, newZ;

      if (propagator === 'InstaOrbit') {
        const [position, velocity] = keplerianToCartesian({ a, e, i, Ω, ω, M: meananomly });
        [newX, newY, newZ] = position;
      } else if (propagator === 'SGP4') {
        const [tleLine1, tleLine2] = getTLE({ a, e, i, Ω, ω, M: meananomly }, elapsedTime);
        const satrec = Sgp4.createSatrec(tleLine1, tleLine2);
        const state = Sgp4.propagate(satrec, elapsedTime / 60);
        newX = state.position.x;
        newY = state.position.y;
        newZ = state.position.z;
      }

      newX /= 3185.5;
      newY /= 3185.5;
      newZ /= 3185.5;

      const r = Math.sqrt((newX) ** 2 + (newY) ** 2 + (newZ) ** 2);
      const twoDphi = Math.atan2(newY, newX);
      const twoDTheta = Math.acos(newZ / r);
      const twodX = (twoDphi / Math.PI) * 7.5;
      const twodY = ((-twoDTheta / Math.PI) + 0.5) * 7.5;

      const tracePoint = { time: elapsedTime, x: newX, y: newY, z: newZ, mapX: twodX, mapY: twodY };

      dispatch(addTracePoint({ id: particleId, tracePoint }));
      dispatch(updateCoordinate({ id: particleId, timefix: Timefix, coordinates: tracePoint, 
        elements: {
        a: a, // Semi-major axis in km
        e: e, // Eccentricity
        ν: trueanomly, 
        Ω: Ω, // Longitude of ascending node in degrees
        ω: ω, // Argument of periapsis in degrees
        i: i
      } }))

      // Update previous elapsedTime
      prevElapsedTime.current = elapsedTime;
    }
  }, [dispatch, elapsedTime, particleId, a, e, i, Ω, ω, burn, propagator]);

  return null;
};

export default RealSimulator;
