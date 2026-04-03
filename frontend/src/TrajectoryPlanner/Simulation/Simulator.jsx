import React, { useRef, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addTracePoint } from '../../Store/StateTimeSeries';
import { updateCoordinate } from '../../Store/CurrentState';
import { keplerianToCartesian, keplerianToCartesianTrueAnomly } from '../Simulation/Functions';

/**
 * RealSimulator – calls the backend /simulate endpoint for every 1-second
 * step between the previous frontier and the current RenderTime.
 *
 * HARD RULE: simulation is always computed at 1-second resolution,
 * regardless of render speed.  When the speed multiplier is N, the
 * timer jumps RenderTime by N seconds per tick, and this component
 * fires N sequential backend calls (one for each second) to fill in
 * all intermediate trace points.
 */
const RealSimulator = ({ particleId, propagator, burns }) => {

  const dispatch = useDispatch();
  const particle = useSelector(state => state.particles.particles.find(p => p.id === particleId));
  const orbitalelements = useSelector(state => state.CurrentState.satelite.find(p => p.id === particleId));
  const elapsedTime = useSelector((state) => state.timer.elapsedTime);
  const renderTime = useSelector((state) => state.timer.RenderTime);
  const satelliteConfig = useSelector(state => state.satellites.satellitesConfig.find(p => p.id === particleId));

  // Track the last simulated time so we can fill gaps
  const lastSimTimeRef = useRef(undefined);
  const starttime = useSelector((state) => state.timer.starttime);
  const groundStations = useSelector((state) => state.groundStations.groundStations) || [];
  const allSatellites = useSelector((state) => state.CurrentState.satelite) || [];

  // Guard against concurrent fill-in runs
  const fillingRef = useRef(false);

  // Early return if satellite config is missing
  if (!satelliteConfig) {
    return null;
  }

  const mu = 398600.4418;

  useEffect(() => {
    // Only run simulation if renderTime actually changed
    if (renderTime === lastSimTimeRef.current) {
      return;
    }

    // Playback guard — don't re-simulate already-computed data
    if (renderTime < elapsedTime) {
      return;
    }

    // ── Initialization (first call — no elements yet) ────────
    if (!orbitalelements || !orbitalelements.elements || !orbitalelements.elements.a) {
      const initialElements = {
        a: satelliteConfig.InitialCondition.semimajoraxis,
        e: satelliteConfig.InitialCondition.eccentricity,
        i: satelliteConfig.InitialCondition.inclination * (Math.PI / 180),
        Ω: satelliteConfig.InitialCondition.assendingnode * (Math.PI / 180),
        ω: satelliteConfig.InitialCondition.argumentOfPeriapsis * (Math.PI / 180),
        ν: satelliteConfig.InitialCondition.trueanomly * (Math.PI / 180),
      };

      const [initPos] = keplerianToCartesianTrueAnomly(initialElements);
      dispatch(updateCoordinate({
        id: particleId,
        timefix: null,
        coordinates: { x: initPos[0] / 3185.5, y: initPos[1] / 3185.5, z: initPos[2] / 3185.5 },
        elements: initialElements,
      }));

      (async () => {
        try {
          const allSatPositions = {};
          allSatellites.forEach(s => {
            if (s.coordinates && s.coordinates.x != null) {
              allSatPositions[s.id] = {
                x: s.coordinates.x * 3185.5,
                y: s.coordinates.y * 3185.5,
                z: s.coordinates.z * 3185.5,
              };
            }
          });

          const resp = await fetch('http://localhost:3001/simulate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              propagator,
              orbitalelements: { timefix: null, elements: initialElements },
              burn: undefined,
              elapsedTime: renderTime,
              starttime,
              bodyFrame: satelliteConfig.bodyFrame || null,
              prevAttitude: null,
              dt: 1,
              allSatPositions,
              groundStations,
            }),
          });

          if (!resp.ok) throw new Error(`Simulate error ${resp.status}`);
          const json = await resp.json();
          const { tracePoint, timefix, velocity, kineticEnergy, potentialEnergy, totalEnergy, elements, attitude } = json;

          if (tracePoint && elements) {
            let enrichedTrace = { ...tracePoint };
            if (velocity) {
              enrichedTrace.vx = velocity[0];
              enrichedTrace.vy = velocity[1];
              enrichedTrace.vz = velocity[2];
            }
            if (attitude) {
              enrichedTrace.qx = attitude.quaternion[0];
              enrichedTrace.qy = attitude.quaternion[1];
              enrichedTrace.qz = attitude.quaternion[2];
              enrichedTrace.qw = attitude.quaternion[3];
            }
            dispatch(addTracePoint({ id: particleId, tracePoint: enrichedTrace }));
            dispatch(updateCoordinate({
              id: particleId,
              timefix,
              coordinates: tracePoint,
              velocity,
              kineticEnergy,
              potentialEnergy,
              totalEnergy,
              elements,
              attitude: attitude || undefined,
            }));
            lastSimTimeRef.current = renderTime;
          }
        } catch (err) {
          console.error('Initial simulation fetch failed', err);
        }
      })();
      return;
    }

    // ── Normal update: fill every 1-second step ──────────────
    if (!orbitalelements?.elements) return;

    // Determine which seconds need computing
    const prevTime = lastSimTimeRef.current ?? renderTime - 1;
    const startSec = Math.floor(prevTime) + 1;
    const endSec = Math.floor(renderTime);
    const stepsNeeded = [];
    for (let t = startSec; t <= endSec; t++) {
      stepsNeeded.push(t);
    }
    // If renderTime has a fractional part and we haven't included it
    if (renderTime > endSec) {
      stepsNeeded.push(renderTime);
    }
    if (stepsNeeded.length === 0) {
      stepsNeeded.push(renderTime);
    }

    // Prevent overlapping fill-in runs
    if (fillingRef.current) return;
    fillingRef.current = true;

    (async () => {
      try {
        for (const t of stepsNeeded) {
          // Re-read latest orbital elements from Redux for each step
          // (they update after each dispatch). For the first iteration
          // we use the current snapshot; subsequent reads come from the
          // closure-captured `orbitalelements` which gets the last dispatch.
          const burnToUse = Array.isArray(burns)
            ? burns.find((b) => t >= (b.time ?? 0))
            : undefined;

          const allSatPositionsMap = {};
          allSatellites.forEach(s => {
            if (s.coordinates && s.coordinates.x != null) {
              allSatPositionsMap[s.id] = {
                x: s.coordinates.x * 3185.5,
                y: s.coordinates.y * 3185.5,
                z: s.coordinates.z * 3185.5,
              };
            }
          });

          const resp = await fetch('http://localhost:3001/simulate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              propagator,
              orbitalelements,
              burn: burnToUse,
              elapsedTime: t,
              starttime,
              bodyFrame: satelliteConfig.bodyFrame || null,
              prevAttitude: orbitalelements.attitude?.quaternion || null,
              dt: 1,
              allSatPositions: allSatPositionsMap,
              groundStations,
            }),
          });

          if (!resp.ok) throw new Error(`Simulate error ${resp.status}`);
          const json = await resp.json();
          const { tracePoint, timefix, velocity, kineticEnergy, potentialEnergy, totalEnergy, elements, attitude } = json;

          if (tracePoint && elements) {
            let enrichedTrace = { ...tracePoint };
            if (velocity) {
              enrichedTrace.vx = velocity[0];
              enrichedTrace.vy = velocity[1];
              enrichedTrace.vz = velocity[2];
            }
            if (attitude) {
              enrichedTrace.qx = attitude.quaternion[0];
              enrichedTrace.qy = attitude.quaternion[1];
              enrichedTrace.qz = attitude.quaternion[2];
              enrichedTrace.qw = attitude.quaternion[3];
            }
            dispatch(addTracePoint({ id: particleId, tracePoint: enrichedTrace }));
            dispatch(updateCoordinate({
              id: particleId,
              timefix,
              coordinates: tracePoint,
              velocity,
              kineticEnergy,
              potentialEnergy,
              totalEnergy,
              elements,
              attitude: attitude || undefined,
            }));
          }
        }
        lastSimTimeRef.current = renderTime;
      } catch (err) {
        console.error('Simulation fetch failed', err);
      } finally {
        fillingRef.current = false;
      }
    })();
  }, [dispatch, renderTime, elapsedTime, particleId, orbitalelements, burns, propagator, satelliteConfig, starttime]);

  return null;
};

export default RealSimulator;
