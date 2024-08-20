import React, { useRef, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addTracePoint } from '../../Store/StateTimeSeries';
import { updateCoordinate } from '../../Store/CurrentState';
import { keplerianToCartesian, cartesianToKeplerian, getTLE } from './Functions';
import * as THREE from 'three';
import { Sgp4 } from 'ootk';

const RealSimulator = ({ particleId, propagator, initialCoordinates, burn }) => {

  const dispatch = useDispatch();
  const particle = useSelector(state => state.particles.particles.find(p => p.id === particleId));
  const elapsedTime = useSelector((state) => state.timer.elapsedTime);
  const prevElapsedTime = useRef(elapsedTime);

  const mu = 398600.4418; // Standard gravitational parameter for Earth in km^3/s^2

  // Separate state for each Keplerian element
  let a = initialCoordinates.semimajoraxis;
  let e = initialCoordinates.eccentricity;
  let i = THREE.MathUtils.degToRad(initialCoordinates.inclination);
  let Ω = THREE.MathUtils.degToRad(initialCoordinates.assendingnode);
  let ω = THREE.MathUtils.degToRad(initialCoordinates.argumentOfPeriapsis);
  let M = null; // Mean anomaly, to be calculated

  let trueanomly = THREE.MathUtils.degToRad(initialCoordinates.trueanomly);

  useEffect(() => {
    // Check if elapsedTime has changed
    if (elapsedTime !== prevElapsedTime.current) {


      // Apply burns if any burn time is passed
      if (burn && burn.length > 0) {
        burn.forEach(b => {
          if (prevElapsedTime.current <= b.time && elapsedTime >= b.time) {
            // Apply burn by adjusting Keplerian parameters
            // Convert current orbital elements to Cartesian coordinates
            let [position, velocity] = keplerianToCartesian({ a, e, i, Ω, ω, M });
            
            // Apply burn to velocity
            velocity[0] += b.x;
            velocity[1] += b.y;
            velocity[2] += b.z;
            console.log('ko ko koota')
            console.log(velocity)

            // Convert updated Cartesian coordinates back to Keplerian elements
            const newElements = cartesianToKeplerian({ position, velocity });

            // Update states with new elements
            a = newElements.a;
            e = newElements.e;
            i = newElements.i;
            Ω = newElements.Ω;
            ω = newElements.ω;
            M = newElements.M;
          }
        });
      }

      // Calculate Mean anomaly
      const timeperiod = 2 * Math.PI * Math.sqrt((a ** 3) / mu);
      const perigeetoanomlytime = (trueanomly / (2 * Math.PI)) * timeperiod;
      const firstperigeetime = perigeetoanomlytime - timeperiod;
      const timesinceperigee = (elapsedTime + firstperigeetime) % timeperiod;
      const meananomly = (2 * Math.PI * timesinceperigee) / timeperiod;
      M = meananomly

      // Update Mean anomaly
      //setM(meananomly);

      let newX, newY, newZ;

      if (propagator === 'InstaOrbit') {
        const [position, velocity] = keplerianToCartesian({ a, e, i, Ω, ω, M: meananomly });
        [newX, newY, newZ] = position;
        console.log('Bhai Roi Rand')
        console.log({ a, e, i, Ω, ω, M: meananomly });
        console.log(initialCoordinates.semimajoraxis)
        console.log(perigeetoanomlytime);
        console.log(initialCoordinates);
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
      dispatch(updateCoordinate({ id: particleId, coordinates: tracePoint, elements: { a, e, i, Ω, ω, M } }));

      // Update previous elapsedTime
      prevElapsedTime.current = elapsedTime;
    }
  }, [dispatch, elapsedTime, particleId, a, e, i, Ω, ω, M, burn, propagator]);

  return null;
};

export default RealSimulator;
