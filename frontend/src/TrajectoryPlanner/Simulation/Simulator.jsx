import React, { useRef, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addTracePoint } from '../../Store/StateTimeSeries';
import { updateCoordinate } from '../../Store/CurrentState';

const RealSimulator = ({ particleId, propagator, burns }) => {

  const dispatch = useDispatch();
  const particle = useSelector(state => state.particles.particles.find(p => p.id === particleId));
  const orbitalelements = useSelector(state => state.CurrentState.satelite.find(p => p.id === particleId));
  const elapsedTime = useSelector((state) => state.timer.elapsedTime);
  const renderTime = useSelector((state) => state.timer.RenderTime);
  const referenceSystem = useSelector((state) => state.view.ReferenceSystem);
  const satelliteConfig = useSelector(state => state.satellites.satellitesConfig.find(p => p.id === particleId));
  const orignalomega = satelliteConfig?.InitialCondition?.assendingnode;

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
        
        // Use initial elements for first simulation call
        const adjustedOmega = referenceSystem === 'EarthFixed' && orignalomega !== undefined
          ? initialElements.Ω
          : initialElements.Ω;
        
        (async () => {
          try {
            const resp = await fetch('http://localhost:3001/simulate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                propagator,
                orbitalelements: {
                  timefix: null,
                  elements: {
                    ...initialElements,
                    Ω: adjustedOmega,
                  },
                },
                burn: undefined,
                elapsedTime: renderTime,
                referenceSystem,
                originalomega: orignalomega,
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

      // Calculate EarthFixed Ω (ascending node) adjustment
      let adjustedOmega = orbitalelements.elements.Ω;
      if (referenceSystem === 'EarthFixed' && orignalomega !== undefined) {
        // In EarthFixed frame, the reference frame rotates with Earth
        // The orbital plane must counter-rotate to maintain inertial orientation
        const radiansPerSecond = 2 * Math.PI / (24 * 60 * 60); // Earth rotation rate
        const dΩ = (radiansPerSecond * renderTime) % (2 * Math.PI);
        adjustedOmega = -(dΩ - orignalomega) % (2 * Math.PI);
      }

      // Send request to backend simulation server
      (async () => {
        try {
          const resp = await fetch('http://localhost:3001/simulate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              propagator,
              orbitalelements: {
                ...orbitalelements,
                elements: {
                  ...orbitalelements.elements,
                  Ω: adjustedOmega,
                },
              },
              burn: burnToUse,
              elapsedTime: renderTime,
              referenceSystem,
              originalomega: orignalomega,
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
  }, [dispatch, renderTime, particleId, orbitalelements, burns, propagator, referenceSystem, orignalomega, satelliteConfig]);

  return null;
};

export default RealSimulator;
