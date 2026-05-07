import { useRef, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { useDispatch, useSelector, useStore } from 'react-redux';
import {  trueToEccentricAnomaly, eccentricToMeanAnomaly, keplerianToCartesian, applyZ_X_Z_Rotation, cartesianToKeplerian } from '../Simulation/Functions';
import { Shape, TubeGeometry } from 'three'; 

import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { computeGMST, computeGMSTFromSim, SCALE_FACTOR, geodeticToSceneECI } from '../../transforms';
import SatelliteBodyModel from './SatelliteBodyModel';
import useTracePoints from '../../hooks/useTracePoints';

/* ── Connectivity-driven laser pointing helpers ─────────────── */

/**
 * Binary search for the entry with time ≤ renderTime in a sorted array.
 */
function findStepAtTime(timeSeries, renderTime) {
  if (!timeSeries || timeSeries.length === 0) return null;
  let lo = 0, hi = timeSeries.length - 1;
  if (renderTime <= timeSeries[0].time) return timeSeries[0];
  if (renderTime >= timeSeries[hi].time) return timeSeries[hi];
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (timeSeries[mid].time <= renderTime) lo = mid;
    else hi = mid - 1;
  }
  return timeSeries[lo];
}

/** Quaternion conjugate (inverse for unit quaternions) */
function quatConj([qx, qy, qz, qw]) { return [-qx, -qy, -qz, qw]; }

/** Rotate vector v by quaternion q = [qx,qy,qz,qw] */
function quatRotVec([qx, qy, qz, qw], [vx, vy, vz]) {
  const tx = 2 * (qy * vz - qz * vy);
  const ty = 2 * (qz * vx - qx * vz);
  const tz = 2 * (qx * vy - qy * vx);
  return [
    vx + qw * tx + (qy * tz - qz * ty),
    vy + qw * ty + (qz * tx - qx * tz),
    vz + qw * tz + (qx * ty - qy * tx),
  ];
}

function vec3Sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function vec3Len(v) { return Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]); }
function vec3Norm(v) { const l = vec3Len(v); return l > 1e-12 ? [v[0]/l, v[1]/l, v[2]/l] : [0,0,1]; }
function vec3Dot(a, b) { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; }
function vec3Cross(a, b) { return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; }

function parentAxisToVec(axis) {
  switch (axis) {
    case '+X': return [1,0,0]; case '-X': return [-1,0,0];
    case '+Y': return [0,1,0]; case '-Y': return [0,-1,0];
    case '+Z': return [0,0,1]; case '-Z': return [0,0,-1];
    default: return [0,0,1];
  }
}

/**
 * Compute gimbal angles (a1=azimuth, a2=elevation) for a laser component
 * given a target direction in ECI, the satellite body quaternion, and
 * the component mounting axis.
 */
function computeLaserAngles(targetECI_km, satPosECI_km, bodyQ, comp) {
  const dir = vec3Norm(vec3Sub(targetECI_km, satPosECI_km));
  const bodyQInv = quatConj(bodyQ);
  const dirBody = quatRotVec(bodyQInv, dir);
  const pAxis = parentAxisToVec(comp.parentAxis || '+Z');

  const dot = vec3Dot(dirBody, pAxis);
  const proj = [
    dirBody[0] - dot * pAxis[0],
    dirBody[1] - dot * pAxis[1],
    dirBody[2] - dot * pAxis[2],
  ];
  const projLen = vec3Len(proj);

  let a2 = Math.atan2(dot, projLen) * (180 / Math.PI);
  let a1 = 0;
  if (projLen > 1e-10) {
    let refVec;
    if (Math.abs(pAxis[1]) > 0.9) refVec = [1, 0, 0];
    else if (Math.abs(pAxis[0]) > 0.9) refVec = [0, 1, 0];
    else refVec = [1, 0, 0];
    const rDot = vec3Dot(refVec, pAxis);
    refVec = vec3Norm([refVec[0] - rDot*pAxis[0], refVec[1] - rDot*pAxis[1], refVec[2] - rDot*pAxis[2]]);
    const perpVec = vec3Norm(vec3Cross(pAxis, refVec));
    const projNorm = vec3Norm(proj);
    const c = vec3Dot(projNorm, refVec);
    const s = vec3Dot(projNorm, perpVec);
    a1 = Math.atan2(s, c) * (180 / Math.PI);
  }

  // Clamp to constraints
  const con = comp.constraint || {};
  const minA1 = con.minA1Deg != null ? con.minA1Deg : -180;
  const maxA1 = con.maxA1Deg != null ? con.maxA1Deg : 180;
  const minA2 = con.minA2Deg != null ? con.minA2Deg : -90;
  const maxA2 = con.maxA2Deg != null ? con.maxA2Deg : 90;
  a1 = Math.max(minA1, Math.min(maxA1, a1));
  a2 = Math.max(minA2, Math.min(maxA2, a2));

  return { a1, a2 };
}

/**
 * Wrapper that reads component angles from a ref (updated every useFrame)
 * and only triggers a React re-render when the angles actually change.
 * This avoids calling setState inside useFrame which causes infinite loops.
 */
const SatelliteBodyModelLive = ({ componentAnglesRef, ...props }) => {
  const [angles, setAngles] = useState({});
  const prevJsonRef = useRef('{}');

  useFrame(() => {
    const next = componentAnglesRef.current;
    const json = JSON.stringify(next);
    if (json !== prevJsonRef.current) {
      prevJsonRef.current = json;
      setAngles(next);
    }
  });

  return <SatelliteBodyModel {...props} componentAngles={angles} />;
};

/**
 * Rotate an ECI scene-unit position [x,y,z] to ECEF by applying Rz(-gmst).
 * Used to convert satellite positions for EarthFixed 3D rendering.
 */
function eciSceneToEcef(x, y, z, gmst) {
  const c = Math.cos(-gmst);
  const s = Math.sin(-gmst);
  return [c * x - s * y, s * x + c * y, z];
}

// Component to render orbit ellipse
const OrbitEllipse = ({ elements, color }) => {
  const ellipseRef = useRef();
  const { a, e, i, Ω, ω } = elements || {};
  
  useEffect(() => {
    if (ellipseRef.current && a && e !== undefined && i !== undefined && Ω !== undefined && ω !== undefined) {
      try {
        const shape = new Shape();
        const SM = a / 3185.5;
        const semiminoraxis = SM * Math.sqrt(1 - e ** 2);
        const c = Math.sqrt(SM ** 2 - semiminoraxis ** 2);
        shape.absellipse(-c, 0, SM, semiminoraxis, 0, Math.PI * 2, false, 0);
        
        const points = shape.getPoints(200); // More points for smoother ellipse
        const rotatedPoints = points.map(point => {
          return applyZ_X_Z_Rotation([point.x, point.y, 0], Ω, i, ω);
        });
        
        const geometry = new THREE.BufferGeometry().setFromPoints(
          rotatedPoints.map(p => new THREE.Vector3(p[0], p[1], p[2]))
        );
        
        // Dispose old geometry to prevent memory leaks
        if (ellipseRef.current.geometry) {
          ellipseRef.current.geometry.dispose();
        }
        ellipseRef.current.geometry = geometry;
      } catch (error) {
        console.warn('Error creating orbit ellipse:', error);
      }
    }
  }, [a, e, i, Ω, ω]);
  
  if (!a || e === undefined) return null;
  
  // Use the provided color or default to bright cyan if white/not set
  const orbitColor = color && color !== '#fff' && color !== '#ffffff' && color !== '#FFF' && color !== '#FFFFFF' ? color : "#00ffff";
  
  return (
    <line ref={ellipseRef} renderOrder={100}>
      <bufferGeometry />
      <lineBasicMaterial 
        color={orbitColor} 
        linewidth={4} 
        transparent={false}
        opacity={1.0}
        depthTest={true}
        depthWrite={false}
      />
    </line>
  );
};

function findLastIndexLE(sortedByTimePoints, tSec) {
  let lo = 0;
  let hi = sortedByTimePoints.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (sortedByTimePoints[mid].time <= tSec) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}

function lowerBoundTime(sortedByTimePoints, tSec) {
  let lo = 0;
  let hi = sortedByTimePoints.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sortedByTimePoints[mid].time < tSec) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

const Satellite = ({ particleId, inclination, semimajoraxis, eccentricity, argumentOfPeriapsis, assendingnode, trueanomly, propagator, time, burns = [], color }) => {
  const satelliteRef = useRef();
  const satelliteGlowRef = useRef();
  const lineRef = useRef();
  const tubeRef = useRef();
  const dispatch = useDispatch();
  const particle = useSelector(state => state.particles?.particles?.find?.(p => p.id === particleId));
  const { combined: tracePointsCombined } = useTracePoints(particleId);
  const RenderTime = useSelector((state) => state.timer.RenderTime);
  const satellitecurrentcoordinate = useSelector(state => state.CurrentState.satelite.find(p => p.id === particleId));

  const prevRenderTime = useRef(RenderTime);
  const referenceSystem = useSelector((state) => state.view.ReferenceSystem);
  const starttime = useSelector((state) => state.timer.starttime);
  const trackWindow = useSelector((state) => state.view.trackWindow);
  const showOrbit = useSelector((state) => state.view.showOrbit);
  const showBodyFrameAxes = useSelector((state) => state.view.Axis);

  // Component articulation angles (from trace points) — stored as ref
  // to avoid setState inside useFrame which causes infinite re-renders.
  const componentAnglesRef = useRef({});

  const gmstCacheRef = useRef(new Map());
  const getGmstCached = (utcMs) => {
    const key = Math.floor(utcMs / 1000);
    const cache = gmstCacheRef.current;
    const existing = cache.get(key);
    if (existing != null) return existing;
    const gmst = computeGMST(utcMs);
    cache.set(key, gmst);
    // Bound cache growth (e.g., long sessions / lots of scrubbing)
    if (cache.size > 5000) cache.clear();
    return gmst;
  };

  // Track Horizon: ±1 hour window in seconds
  const TRACK_HORIZON_SEC = 3600;

  inclination = THREE.MathUtils.degToRad(inclination);//Angles in Radian
  argumentOfPeriapsis = THREE.MathUtils.degToRad(argumentOfPeriapsis);
  assendingnode = THREE.MathUtils.degToRad(assendingnode);
  trueanomly = THREE.MathUtils.degToRad(trueanomly);
  const satelliteconfig = useSelector(state => state.satellites.satellitesConfig.find(p => p.id === particleId));

  // ── Connectivity-driven laser pointing data ──
  // Read from store directly in useFrame via refs to avoid re-rendering
  // every Satellite component when connectivity/TSDB data changes.
  // These values are ONLY consumed inside useFrame (via refs), never in JSX.
  const store = useStore();
  const connTsRef = useRef([]);
  const visibleConnTsRef = useRef([]);
  const allParticlesRef = useRef([]);
  const allCurrentStatesRef = useRef([]);
  const groundStationsRef = useRef([]);
  const visibleTracePointsRef = useRef({});

  //To Render the orbit tracks and Satellite
  useEffect(() => {
    // Check if RenderTime has changed
    if (RenderTime !== prevRenderTime.current) {
      const isFixed = referenceSystem === 'EarthFixed';

      // Update satellite position from tracePoints if available
      if (satelliteRef.current && tracePointsCombined?.length > 0) {
        const pts = tracePointsCombined;
        const idxEnd = findLastIndexLE(pts, RenderTime);
        const hasAny = idxEnd >= 0;
        const tMin = RenderTime - TRACK_HORIZON_SEC;
        const idxStart = trackWindow && hasAny ? lowerBoundTime(pts, tMin) : 0;
        const filteredPoints = hasAny ? pts.slice(idxStart, idxEnd + 1) : [];

        // Satellite position: always the last trace point at or before RenderTime
        if (hasAny) {
          const lastPoint = pts[idxEnd];
          if (lastPoint && [lastPoint.x, lastPoint.y, lastPoint.z].every(Number.isFinite)) {
            if (isFixed) {
              const gmst = getGmstCached(starttime + lastPoint.time * 1000);
              const [ex, ey, ez] = eciSceneToEcef(lastPoint.x, lastPoint.y, lastPoint.z, gmst);
              satelliteRef.current.position.set(ex, ey, ez);
            } else {
              satelliteRef.current.position.set(lastPoint.x, lastPoint.y, lastPoint.z);
            }
          }
        }

        // Update line geometry efficiently
        // In EarthFixed mode, rotate every trace point ECI→ECEF using GMST at that point's time
        // This produces the 3D ground track on the stationary globe
        if (lineRef.current && filteredPoints.length > 0) {
          let traceArray;
          if (isFixed) {
            traceArray = new Float32Array(filteredPoints.length * 3);
            for (let k = 0; k < filteredPoints.length; k++) {
              const p = filteredPoints[k];
              const gmst = getGmstCached(starttime + p.time * 1000);
              const [ex, ey, ez] = eciSceneToEcef(p.x, p.y, p.z, gmst);
              traceArray[k * 3]     = ex;
              traceArray[k * 3 + 1] = ey;
              traceArray[k * 3 + 2] = ez;
            }
          } else {
            traceArray = new Float32Array(filteredPoints.length * 3);
            for (let k = 0; k < filteredPoints.length; k++) {
              const p = filteredPoints[k];
              traceArray[k * 3] = p.x;
              traceArray[k * 3 + 1] = p.y;
              traceArray[k * 3 + 2] = p.z;
            }
          }
          const positionAttribute = lineRef.current.geometry.getAttribute('position');
          
          if (!positionAttribute || positionAttribute.count !== filteredPoints.length) {
            // Recreate attribute if size changed or doesn't exist
            lineRef.current.geometry.setAttribute(
              'position',
              new THREE.Float32BufferAttribute(traceArray, 3)
            );
            lineRef.current.geometry.setDrawRange(0, filteredPoints.length);
          } else {
            // Update existing attribute values
            positionAttribute.array = traceArray;
            positionAttribute.count = filteredPoints.length;
            positionAttribute.needsUpdate = true;
            lineRef.current.geometry.setDrawRange(0, filteredPoints.length);
          }
        }

        // Update tube geometry (expensive operation - only when needed)
        if (tubeRef.current && satelliteconfig?.Tube && filteredPoints.length >= 2) {
          const tubePoints = filteredPoints
            .map(p => {
              if (isFixed) {
                const gmst = getGmstCached(starttime + p.time * 1000);
                const [ex, ey, ez] = eciSceneToEcef(p.x, p.y, p.z, gmst);
                return new THREE.Vector3(ex, ey, ez);
              }
              return new THREE.Vector3(p.x, p.y, p.z);
            })
            .filter(point => point && [point.x, point.y, point.z].every(Number.isFinite));
          
          if (tubePoints.length >= 2) {
            try {
              const curve = new THREE.CatmullRomCurve3(tubePoints);
              const tubeGeometry = new TubeGeometry(
                curve,
                Math.max(8, tubePoints.length * 8), // Adaptive segments
                0.02,
                16,
                false
              );
              
              // Dispose old geometry to prevent memory leaks
              if (tubeRef.current.geometry) {
                tubeRef.current.geometry.dispose();
              }
              tubeRef.current.geometry = tubeGeometry;
            } catch (err) {
              // Silently handle geometry creation errors
            }
          }
        }
      } else if (satelliteRef.current && satellitecurrentcoordinate?.coordinates) {
        // Fallback: use current coordinates if tracePoints not available
        const coords = satellitecurrentcoordinate.coordinates;
        if ([coords.x, coords.y, coords.z].every(Number.isFinite)) {
          if (isFixed) {
            const gmst = computeGMSTFromSim(starttime, RenderTime);
            const [ex, ey, ez] = eciSceneToEcef(coords.x, coords.y, coords.z, gmst);
            satelliteRef.current.position.set(ex, ey, ez);
          } else {
            satelliteRef.current.position.set(coords.x, coords.y, coords.z);
          }
        }
      }
      
      // Update previous RenderTime
      prevRenderTime.current = RenderTime;
    }
  }, [RenderTime, particleId, particle, tracePointsCombined, satellitecurrentcoordinate, satelliteconfig, referenceSystem, starttime, trackWindow, showOrbit]);

  const ellipseRef = useRef();
  const satellitepreviewRef = useRef();

  //Preview of Orbit and Satellite position (visible when satellite parameters are being added)
  useEffect(() => {
    if (!satelliteconfig?.preview) return;

    // Compute satellite position from current orbital elements
    let eccentricanomly = trueToEccentricAnomaly(trueanomly, eccentricity);
    let meananomly = eccentricToMeanAnomaly(eccentricanomly, eccentricity);

    const elements = {
      a: semimajoraxis,
      e: eccentricity,
      M: meananomly,
      Ω: assendingnode,
      ω: argumentOfPeriapsis,
      i: inclination,
    };
    const [position] = keplerianToCartesian(elements);
    const preX = position[0] / 3185.5;
    const preY = position[1] / 3185.5;
    const preZ = position[2] / 3185.5;

    // Update preview satellite position (may need a frame for ref to mount)
    const updateRefs = () => {
      if (satellitepreviewRef.current) {
        satellitepreviewRef.current.position.set(preX, preY, preZ);
      }

      // Update preview ellipse geometry
      if (ellipseRef.current) {
        const shape = new Shape();
        const SM = semimajoraxis / 3185.5;
        const semiminoraxis = SM * Math.sqrt(1 - eccentricity ** 2);
        const c = Math.sqrt(SM ** 2 - semiminoraxis ** 2);
        shape.absellipse(-c, 0, SM, semiminoraxis, 0, Math.PI * 2, false, 0);

        const pts = shape.getPoints(100);
        const rotatedPoints = pts.map(point =>
          applyZ_X_Z_Rotation([point.x, point.y, 0], assendingnode, inclination, argumentOfPeriapsis)
        );

        const geometry = new THREE.BufferGeometry().setFromPoints(
          rotatedPoints.map(p => new THREE.Vector3(p[0], p[1], p[2]))
        );
        if (ellipseRef.current.geometry) ellipseRef.current.geometry.dispose();
        ellipseRef.current.geometry = geometry;
      }
    };

    // Run immediately, and also after a frame to catch newly-mounted refs
    updateRefs();
    const rafId = requestAnimationFrame(updateRefs);
    return () => cancelAnimationFrame(rafId);
  }, [semimajoraxis, eccentricity, assendingnode, inclination, argumentOfPeriapsis, trueanomly, satelliteconfig]);

  const elapsedTime = useSelector((state) => state.timer.elapsedTime);
  const prevElapsedTime = useRef(elapsedTime);
  const orbitalelements = useSelector(state => state.CurrentState.satelite.find(p => p.id === particleId));
  const burnlineRef = useRef();
  const burnMarkerRef = useRef();
  const previewBurn = satelliteconfig?.burns?.find(burn => burn.previewMode);


  //For Burn preview visualisation (Orbit if the burn is applied at given time)
  useEffect(() => {
    if (orbitalelements?.elements && previewBurn && burnlineRef.current) {
      // Filter out the burn with previewMode set to true
      const previewBurn = satelliteconfig?.burns?.find(burn => burn.previewMode);
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
      

      if (previewBurn) {
        const dvx = Number(previewBurn.x) || 0;
        const dvy = Number(previewBurn.y) || 0;
        const dvz = Number(previewBurn.z) || 0;
        velocity[0] += dvx;
        velocity[1] += dvy;
        velocity[2] += dvz;
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
  }, [elapsedTime, particleId, orbitalelements, satelliteconfig?.burns, propagator]);

  // Load satellite GLTF model
  const gltfResult = useGLTF('/satellite/scene.gltf', true); // true = useCache
  const satelliteModel = gltfResult?.scene || null;
  const modelRef = useRef();

  // Get body shape from satellite config (default to 'rectangle')
  const bodyShape = satelliteconfig?.bodyFrame?.bodyShape || 'rectangle';

  // Clone the model to avoid sharing geometry and make it brighter
  // (GLTF model is used as fallback when bodyShape is not set)
  useEffect(() => {
    if (satelliteModel && modelRef.current && !satelliteconfig?.bodyFrame) {
      const clonedModel = satelliteModel.clone();
      clonedModel.scale.set(0.05, 0.05, 0.05); // Scale down the model
      clonedModel.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          // Make satellite brighter and more visible
          if (child.material) {
            // Handle both single material and array of materials
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach(mat => {
              if (mat) {
                mat.emissive = new THREE.Color(color || '#ffffff');
                mat.emissiveIntensity = 0.3;
                mat.depthTest = true;
                mat.depthWrite = true;
                mat.needsUpdate = true;
              }
            });
          }
        }
      });
      // Clear existing children
      while (modelRef.current.children.length > 0) {
        modelRef.current.remove(modelRef.current.children[0]);
      }
      modelRef.current.add(clonedModel);
    }
  }, [satelliteModel, color]);

  // Update satellite position continuously — prefer trace-point lookup
  // so that timeline playback (scrubbing backward) shows the correct
  // historical position instead of the stale CurrentState coordinates.
  useFrame(() => {
    const isFixed = referenceSystem === 'EarthFixed';

    if (satelliteRef.current) {
      let px, py, pz;
      let found = false;
      let attitudeQ = null; // [qx, qy, qz, qw] from trace or live state
      let gmstUsed = 0;     // GMST used for ECI→ECEF position conversion

      // 1) Primary: derive position from the trace point at RenderTime
      if (tracePointsCombined?.length) {
        const pts = tracePointsCombined;
        const idx = findLastIndexLE(pts, RenderTime);
        const best = idx >= 0 ? pts[idx] : null;
        if (best && [best.x, best.y, best.z].every(Number.isFinite)) {
          px = best.x; py = best.y; pz = best.z;
          if (isFixed) {
            const gmst = getGmstCached(starttime + best.time * 1000);
            gmstUsed = gmst;
            [px, py, pz] = eciSceneToEcef(best.x, best.y, best.z, gmst);
          }
          found = true;
          // Read attitude from trace point if available
          if (best.qx != null && best.qw != null) {
            attitudeQ = [best.qx, best.qy, best.qz, best.qw];
          }
          // Read component angles from trace point if available
          if (best.componentAngles) {
            componentAnglesRef.current = best.componentAngles;
          }

          // ── Override laser angles from connectivity data ──
          // The bulk sim doesn't know connectivity (it runs before the
          // connectivity solver), so the stored componentAngles for lasers
          // default to nadir/sun. Here we recompute laser gimbal angles
          // from the connectivity assignments at the current time.
          // Read from Redux store directly (no selector re-renders).
          // Only execute when connectivity data exists to avoid overhead.
          {
            const _state = store.getState();
            const _connTs = _state.communication?.connectedPairsTimeSeries || [];
            const _visConnTs = _state.communication?.visibleConnectivityStates || [];
            const connectedPairsTS = _visConnTs.length ? _visConnTs : _connTs;
            if (connectedPairsTS.length && attitudeQ && satelliteconfig?.bodyFrame?.components) {
              allParticlesRef.current = _state.particles?.particles || [];
              allCurrentStatesRef.current = _state.CurrentState?.satelite || [];
              groundStationsRef.current = _state.groundStations?.groundStations || [];
              visibleTracePointsRef.current = _state.particles?.visibleTracePoints || {};
              const step = findStepAtTime(connectedPairsTS, RenderTime);
            if (step?.connections?.length) {
              const myPrefix = `sat-${particleId}`;
              const laserComps = satelliteconfig.bodyFrame.components.filter(c => c.type === 'laserPointer');
              const satPosScene = [best.x, best.y, best.z]; // scene units, ECI

              for (const conn of step.connections) {
                // Check if this satellite is on either side of the connection
                const isTx = conn.txParentId === myPrefix;
                const isRx = conn.rxParentId === myPrefix;
                if (!isTx && !isRx) continue;

                // Identify which laser component on THIS satellite is involved
                const myNodeId = isTx ? conn.txNodeId : conn.rxNodeId;
                const targetParentId = isTx ? conn.rxParentId : conn.txParentId;
                // nodeId format: "sat-0:comp-1234" → extract component id
                const colonIdx = myNodeId.indexOf(':');
                const compIdStr = colonIdx >= 0 ? myNodeId.slice(colonIdx + 1) : null;
                const comp = compIdStr
                  ? laserComps.find(c => c.id === compIdStr || String(c.id) === compIdStr)
                  : laserComps[0]; // default node = first laser
                if (!comp) continue;

                // Get target position (scene units, ECI)
                // Prefer TSDB visibleTracePoints (windowed) over legacy particles[].tracePoints
                let targetPos = null;
                if (targetParentId.startsWith('sat-')) {
                  const targetId = parseFloat(targetParentId.replace('sat-', ''));
                  // 1) Try TSDB windowed trace points
                  const vtpArr = visibleTracePointsRef.current[targetId];
                  if (vtpArr?.length) {
                    const tIdx = findLastIndexLE(vtpArr, RenderTime);
                    if (tIdx >= 0) {
                      const tp = vtpArr[tIdx];
                      targetPos = [tp.x, tp.y, tp.z];
                    }
                  }
                  // 2) Fallback: legacy particles[].tracePoints
                  if (!targetPos) {
                    const pList = allParticlesRef.current;
                    for (let pi = 0; pi < pList.length; pi++) {
                      if (pList[pi].id === targetId) {
                        const targetPts = pList[pi].tracePoints;
                        if (targetPts?.length) {
                          const tIdx = findLastIndexLE(targetPts, RenderTime);
                          if (tIdx >= 0) {
                            const tp = targetPts[tIdx];
                            targetPos = [tp.x, tp.y, tp.z];
                          }
                        }
                        break;
                      }
                    }
                  }
                  if (!targetPos) {
                    const sList = allCurrentStatesRef.current;
                    for (let si = 0; si < sList.length; si++) {
                      if (sList[si].id === targetId && sList[si].coordinates) {
                        const c = sList[si].coordinates;
                        targetPos = [c.x, c.y, c.z];
                        break;
                      }
                    }
                  }
                } else {
                  // Ground station
                  const gsList = groundStationsRef.current;
                  const gs = gsList.find(g => g.id === targetParentId);
                  if (gs) {
                    const utcMs = starttime + RenderTime * 1000;
                    const gp = geodeticToSceneECI({ lat: gs.lat, lon: gs.lon, alt: gs.altKm || 0 }, utcMs);
                    targetPos = gp; // already scene units
                  }
                }

                if (targetPos) {
                  const angles = computeLaserAngles(targetPos, satPosScene, attitudeQ, comp);
                  if (!componentAnglesRef.current) componentAnglesRef.current = {};
                  componentAnglesRef.current = {
                    ...componentAnglesRef.current,
                    [comp.id]: angles,
                  };
                }
              }
            }
          }
          } // end block scope for connectivity laser override
          // ── End connectivity laser override ──
        }
      }

      // 2) Fallback: use CurrentState coordinates (live simulation)
      if (!found && satellitecurrentcoordinate?.coordinates) {
        const coords = satellitecurrentcoordinate.coordinates;
        if ([coords.x, coords.y, coords.z].every(Number.isFinite)) {
          px = coords.x; py = coords.y; pz = coords.z;
          if (isFixed) {
            const gmst = computeGMSTFromSim(starttime, RenderTime);
            gmstUsed = gmst;
            [px, py, pz] = eciSceneToEcef(coords.x, coords.y, coords.z, gmst);
          }
          found = true;
        }
      }

      // Read live attitude from CurrentState if not from trace
      if (!attitudeQ && satellitecurrentcoordinate?.attitude?.quaternion) {
        attitudeQ = satellitecurrentcoordinate.attitude.quaternion;
      }

      if (found) {
        satelliteRef.current.position.set(px, py, pz);
        if (satelliteGlowRef.current) {
          satelliteGlowRef.current.position.set(px, py, pz);
        }
        if (modelRef.current) {
          modelRef.current.position.set(px, py, pz);

          // Apply attitude quaternion in the scene frame
          if (attitudeQ) {
            const targetQ = new THREE.Quaternion(attitudeQ[0], attitudeQ[1], attitudeQ[2], attitudeQ[3]);

            // In EarthFixed mode, convert q_Body→ECI to q_Body→ECEF
            // using the same GMST that was used for position conversion
            if (isFixed) {
              const qECI2ECEF = new THREE.Quaternion().setFromAxisAngle(
                new THREE.Vector3(0, 0, 1), -gmstUsed,
              );
              targetQ.premultiply(qECI2ECEF);
            }

            // Set quaternion directly — no SLERP smoothing.
            // SLERP caused visible drift at higher sim speeds because the
            // per-frame 15% convergence rate could never keep up with
            // rapidly changing trace-point targets.
            modelRef.current.quaternion.copy(targetQ);
          }
        }
      } else {
        satelliteRef.current.position.set(0, 0, 0);
        if (satelliteGlowRef.current) {
          satelliteGlowRef.current.position.set(0, 0, 0);
        }
        if (modelRef.current) {
          modelRef.current.position.set(0, 0, 0);
        }
      }
    }
    
    // Update burn marker - shows when a burn maneuver is active
    if (burnMarkerRef.current) {
      const activeBurn = burns.find((b) => {
        const hasDv = Math.hypot(Number(b.x) || 0, Number(b.y) || 0, Number(b.z) || 0) > 0;
        return hasDv && elapsedTime >= (b.time ?? 0);
      });
      const coords = satellitecurrentcoordinate?.coordinates;
      if (activeBurn && coords && [coords.x, coords.y, coords.z].every(Number.isFinite)) {
        burnMarkerRef.current.visible = true;
        let bx = coords.x, by = coords.y, bz = coords.z;
        if (isFixed) {
          const gmst = computeGMSTFromSim(starttime, RenderTime);
          [bx, by, bz] = eciSceneToEcef(coords.x, coords.y, coords.z, gmst);
        }
        burnMarkerRef.current.position.set(bx, by, bz);
        const pulse = 1 + 0.3 * Math.sin(performance.now() / 200);
        burnMarkerRef.current.scale.set(pulse, pulse, pulse);
      } else {
        burnMarkerRef.current.visible = false;
      }
    }
  });

  // Use the selected color, or default to bright cyan if white/not set
  const satColor = color && color !== '#fff' && color !== '#ffffff' && color !== '#FFF' && color !== '#FFFFFF' ? color : "#00ffff";
  
  return (
    <>
      {/* Satellite body model (configurable shape) — used when bodyFrame is configured */}
      {satelliteconfig?.bodyFrame ? (
        <group ref={modelRef} renderOrder={1000}>
          <SatelliteBodyModelLive
            shape={bodyShape}
            color={satColor}
            showAxes={showBodyFrameAxes}
            components={satelliteconfig?.bodyFrame?.components || []}
            componentAnglesRef={componentAnglesRef}
          />
        </group>
      ) : (
        <>
          {/* Satellite GLTF model (legacy) */}
          {satelliteModel && (
            <group ref={modelRef} renderOrder={1000} />
          )}
        </>
      )}
      
      {/* Position-tracking anchors (no visible geometry — body model is the
          only sphere/shape rendered at the satellite's location). */}
      <group ref={satelliteRef} />
      <group ref={satelliteGlowRef} />

      {/* Orbit trail line - only render if tracePoints exist and the
          "Orbital Rings" toggle (showOrbit) is enabled. */}
      {showOrbit && tracePointsCombined?.length ? (
        <line ref={lineRef} renderOrder={100}>
          <bufferGeometry />
          <lineBasicMaterial 
            color={satColor}
            linewidth={3} 
            transparent={false}
            opacity={1.0}
            depthTest={true}
            depthWrite={false}
          />
        </line>
      ) : null}
      
      {satelliteconfig?.Tube &&(
      <mesh ref={tubeRef}> 
        <meshStandardMaterial color="red" transparent opacity={0.3}/> 
      </mesh>
      )}

      {satelliteconfig?.preview && (
        <line ref={ellipseRef} >
          <lineBasicMaterial color="#ff6b6b" linewidth={2} transparent opacity={0.8} />
        </line>
      )}
      
      {/* Orbit ellipse: shown only in EarthInertial AND when showOrbit is on.
          Hidden when satellite is in preview mode (preview has its own ellipse). */}
      {!satelliteconfig?.preview && showOrbit && referenceSystem === 'EarthInertial' && (orbitalelements?.elements?.a || semimajoraxis) && (
        <OrbitEllipse 
          elements={orbitalelements?.elements || {
            a: semimajoraxis,
            e: eccentricity,
            i: inclination,
            Ω: assendingnode,
            ω: argumentOfPeriapsis
          }}
          color={color}
        />
      )}

      {satelliteconfig?.preview &&      
      <group ref={satellitepreviewRef}>
        {/* Live preview body model — shows configured shape, components, etc. */}
        {satelliteconfig?.bodyFrame ? (
          <SatelliteBodyModel
            shape={satelliteconfig.bodyFrame.bodyShape || 'rectangle'}
            color="#ff6b6b"
            showAxes={true}
            components={satelliteconfig.bodyFrame.components || []}
            componentAngles={{}}
            emissive
          />
        ) : (
          <mesh>
            <sphereGeometry args={[0.05, 4, 4]} />
            <meshStandardMaterial color="red" />
          </mesh>
        )}
      </group>}

      {/* Burn preview orbit only in EarthInertial */}
      {referenceSystem === 'EarthInertial' && previewBurn && burnlineRef.current?.geometry?.attributes?.position ? (
        <line ref={burnlineRef} >
          <lineBasicMaterial color="blue" linewidth={3} />
        </line>
      ) : null}

      <mesh ref={burnMarkerRef} visible={false}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#ffcc00" emissive="#ffcc00" emissiveIntensity={1.2} />
      </mesh>
    </>
  );
};

export default Satellite;
