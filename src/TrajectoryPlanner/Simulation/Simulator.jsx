import React, { useRef, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addTracePoint } from '../../Store/StateTimeSeries';
import { updateCoordinate } from '../../Store/CurrentState';

const RealSimulator = ({ particleId, propagator, burn }) => {

  const dispatch = useDispatch();
  const particle = useSelector(state => state.particles.particles.find(p => p.id === particleId));
  const orbitalelements = useSelector(state => state.CurrentState.satelite.find(p => p.id === particleId))
  const elapsedTime = useSelector((state) => state.timer.elapsedTime);
  const referenceSystem = useSelector((state) => state.view.ReferenceSystem);
  const orignalomega = useSelector(state => state.satellites.satellitesConfig.find(p => p.id === particleId)).InitialCondition.assendingnode

  const prevElapsedTime = useRef(elapsedTime);
  let Timefix = orbitalelements.timefix;
  const starttime = useSelector((state) => state.timer.starttime);
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
  const currentTime = new Date(starttime + elapsedTime * 1000);
  // Calculate angular rate for Ω to complete 360 degrees in 24 hours
  // Calculate angular rate for Ω to complete 2π radians in 24 hours
  const radiansPerSecond = 2 * Math.PI / (24 * 60 * 60);  // Radians per second for a 24-hour cycle
  const radiansPerMicrosecond = radiansPerSecond;   // Convert to radians per microsecond

  if (referenceSystem == 'EarthFixed') {
      // Update Ω by the elapsed time in microseconds
      let dΩ;

        dΩ = (radiansPerMicrosecond * elapsedTime)% (2 * Math.PI);

      // Wrap Ω within the range [0, 2π] to ensure it stays within a single cycle
      Ω = -(dΩ - orignalomega)% (2 * Math.PI);
  }
  console.log('earth system is: ', referenceSystem )




  useEffect(() => {
    // Check if elapsedTime has changed
    if (elapsedTime !== prevElapsedTime.current) {

          // Send request to backend simulation server
          (async () => {
            try {
              const resp = await fetch('http://localhost:3001/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  propagator,
                  orbitalelements,
                  burn,
                  elapsedTime,
                  referenceSystem,
                  originalomega: orignalomega,
                }),
              });

              if (!resp.ok) throw new Error(`Simulate error ${resp.status}`);
              const json = await resp.json();

              const { tracePoint, timefix, velocity, kineticEnergy, potentialEnergy, totalEnergy, elements } = json;

              dispatch(addTracePoint({ id: particleId, tracePoint }));
              dispatch(updateCoordinate({ id: particleId, timefix: timefix, coordinates: tracePoint,
                velocity: velocity,
                kineticEnergy,
                potentialEnergy,
                totalEnergy,
                elements: elements,
              }));

              prevElapsedTime.current = elapsedTime;
            } catch (err) {
              console.error('Simulation fetch failed', err);
            }
          })();
    }
  }, [dispatch, elapsedTime, particleId, a, e, i, Ω, ω, burn, propagator]);

  return null;
};

export default RealSimulator;
