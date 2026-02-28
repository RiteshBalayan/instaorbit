import React, { useRef, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addTracePoint } from '../../Store/StateTimeSeries';
import { updateCoordinate } from '../../Store/CurrentState';

/**
 * RealSimulator – calls the backend /simulate endpoint every time RenderTime
 * changes, then stores the result (ECI position + geodetic lat/lon) in Redux.
 *
 * IMPORTANT: All propagation is now always in ECI.  No Ω adjustment is
 * applied before sending to the backend.  Frame conversion (ECI→ECEF) is
 * done by the backend using GMST, and returned as { lat, lon, alt }.
 */
const RealSimulator = ({ particleId, propagator, burns }) => {

  const dispatch = useDispatch();
  const particle = useSelector(state => state.particles.particles.find(p => p.id === particleId));
  const orbitalelements = useSelector(state => state.CurrentState.satelite.find(p => p.id === particleId));
  const elapsedTime = useSelector((state) => state.timer.elapsedTime);
  const renderTime = useSelector((state) => state.timer.RenderTime);
  const satelliteConfig = useSelector(state => state.satellites.satellitesConfig.find(p => p.id === particleId));

  const prevRenderTime = useRef(undefined);
  const starttime = useSelector((state) => state.timer.starttime);

  // Early return if satellite config is missing (but allow if orbitalelements not yet initialized)
  if (!satelliteConfig) {
    return null;
  }

  const mu = 398600.4418; // Standard gravitational parameter for Earth in km^3/s^2




  useEffect(() => {
    // Run simulation when renderTime changes (for timeline scrubbing)
    // Only run simulation if renderTime actually changed
    if (renderTime === prevRenderTime.current) {
      return;
    }
    
    // Update prevRenderTime immediately to prevent duplicate runs
    prevRenderTime.current = renderTime;
    
    if (true) {
      // If orbitalelements not initialized yet, initialize with initial conditions
      if (!orbitalelements || !orbitalelements.elements || !orbitalelements.elements.a) {
        const initialElements = {
          a: satelliteConfig.InitialCondition.semimajoraxis,
          e: satelliteConfig.InitialCondition.eccentricity,
          i: satelliteConfig.InitialCondition.inclination * (Math.PI / 180),
          Ω: satelliteConfig.InitialCondition.assendingnode * (Math.PI / 180),
          ω: satelliteConfig.InitialCondition.argumentOfPeriapsis * (Math.PI / 180),
          ν: satelliteConfig.InitialCondition.trueanomly * (Math.PI / 180),
        };
        
        // Initialize orbitalelements in CurrentState
        dispatch(updateCoordinate({
          id: particleId,
          timefix: null,
          coordinates: { x: 0, y: 0, z: 0 },
          elements: initialElements,
        }));
        
        (async () => {
          try {
            const resp = await fetch('http://localhost:3001/simulate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                propagator,
                orbitalelements: {
                  timefix: null,
                  elements: initialElements,  // always true inertial Ω
                },
                burn: undefined,
                elapsedTime: renderTime,
                starttime,                    // epoch for GMST computation
              }),
            });

            if (!resp.ok) throw new Error(`Simulate error ${resp.status}`);
            const json = await resp.json();
            const { tracePoint, timefix, velocity, kineticEnergy, potentialEnergy, totalEnergy, elements } = json;

            if (tracePoint && elements) {
              dispatch(addTracePoint({ id: particleId, tracePoint }));
              dispatch(updateCoordinate({
                id: particleId,
                timefix: timefix,
                coordinates: tracePoint,
                velocity: velocity,
                kineticEnergy,
                potentialEnergy,
                totalEnergy,
                elements: elements,
              }));
            }
          } catch (err) {
            console.error('Initial simulation fetch failed', err);
          }
        })();
        return;
      }
      
      // Normal simulation update
      if (orbitalelements?.elements) {
      const burnToUse = Array.isArray(burns)
        ? burns.find((b) => renderTime >= (b.time ?? 0))
        : undefined;

      // No Ω adjustment — always send true inertial elements.
      // The backend computes GMST and returns proper lat/lon.

      // Send request to backend simulation server
      (async () => {
        try {
          const resp = await fetch('http://localhost:3001/simulate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              propagator,
              orbitalelements,              // true inertial elements, unmodified
              burn: burnToUse,
              elapsedTime: renderTime,
              starttime,                    // epoch for GMST computation
            }),
          });

          if (!resp.ok) throw new Error(`Simulate error ${resp.status}`);
          const json = await resp.json();

          const { tracePoint, timefix, velocity, kineticEnergy, potentialEnergy, totalEnergy, elements } = json;

          if (tracePoint && elements) {
            dispatch(addTracePoint({ id: particleId, tracePoint }));
            dispatch(updateCoordinate({ 
              id: particleId, 
              timefix: timefix, 
              coordinates: tracePoint,
              velocity: velocity,
              kineticEnergy,
              potentialEnergy,
              totalEnergy,
              elements: elements,
            }))
          }
        } catch (err) {
          console.error('Simulation fetch failed', err);
        }
      })();
      }
    }
  }, [dispatch, renderTime, particleId, orbitalelements, burns, propagator, satelliteConfig, starttime]);

  return null;
};

export default RealSimulator;
