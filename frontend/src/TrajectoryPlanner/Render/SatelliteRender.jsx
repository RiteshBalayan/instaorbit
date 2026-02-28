import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useDispatch, useSelector } from 'react-redux';
import { addTracePoint, initializeParticles } from '../../Store/StateTimeSeries';
import { updateCoordinate } from '../../Store/CurrentState';
import {  trueToEccentricAnomaly, eccentricToMeanAnomaly, eccentricToTrueAnomaly, keplerianToCartesian, applyZ_X_Z_Rotation, cartesianToKeplerian, getTLE } from '../Simulation/Functions';
import { Shape, TubeGeometry } from 'three'; 

import { Sgp4, Satellite as sat } from 'ootk';
import { PositionPoint, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { computeGMST, computeGMSTFromSim } from '../../transforms';

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

const Satellite = ({ particleId, inclination, semimajoraxis, eccentricity, argumentOfPeriapsis, assendingnode, trueanomly, propagator, time, burns = [], color }) => {
  const satelliteRef = useRef();
  const satelliteGlowRef = useRef();
  const lineRef = useRef();
  const tubeRef = useRef();
  const dispatch = useDispatch();
  const particle = useSelector(state => state.particles?.particles?.find?.(p => p.id === particleId));
  const RenderTime = useSelector((state) => state.timer.RenderTime);
  const satellitecurrentcoordinate = useSelector(state => state.CurrentState.satelite.find(p => p.id === particleId));

  const prevRenderTime = useRef(RenderTime);
  const referenceSystem = useSelector((state) => state.view.ReferenceSystem);
  const starttime = useSelector((state) => state.timer.starttime);
  const trackWindow = useSelector((state) => state.view.trackWindow);
  const showOrbit = useSelector((state) => state.view.showOrbit);

  // Track Horizon: ±1 hour window in seconds
  const TRACK_HORIZON_SEC = 3600;

  inclination = THREE.MathUtils.degToRad(inclination);//Angles in Radian
  argumentOfPeriapsis = THREE.MathUtils.degToRad(argumentOfPeriapsis);
  assendingnode = THREE.MathUtils.degToRad(assendingnode);
  trueanomly = THREE.MathUtils.degToRad(trueanomly);
  const satelliteconfig = useSelector(state => state.satellites.satellitesConfig.find(p => p.id === particleId));


  //To Render the orbit tracks and Satellite
  useEffect(() => {
    // Check if RenderTime has changed
    if (RenderTime !== prevRenderTime.current) {
      const isFixed = referenceSystem === 'EarthFixed';

      // Update satellite position from tracePoints if available
      if (satelliteRef.current && particle?.tracePoints?.length > 0) {
        let filteredPoints = particle.tracePoints.filter(p => p.time <= RenderTime);

        // Track Horizon: keep only points within ±1 hr of current RenderTime
        if (trackWindow && filteredPoints.length > 0) {
          const tMin = RenderTime - TRACK_HORIZON_SEC;
          const tMax = RenderTime + TRACK_HORIZON_SEC;
          // Also include future points up to +1hr that exist
          filteredPoints = particle.tracePoints.filter(
            (p) => p.time >= tMin && p.time <= tMax
          );
        }
        
        if (filteredPoints.length > 0) {
          const lastPoint = filteredPoints[filteredPoints.length - 1];
          if (lastPoint && [lastPoint.x, lastPoint.y, lastPoint.z].every(Number.isFinite)) {
            if (isFixed) {
              const gmst = computeGMST(starttime + lastPoint.time * 1000);
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
              const gmst = computeGMST(starttime + p.time * 1000);
              const [ex, ey, ez] = eciSceneToEcef(p.x, p.y, p.z, gmst);
              traceArray[k * 3]     = ex;
              traceArray[k * 3 + 1] = ey;
              traceArray[k * 3 + 2] = ez;
            }
          } else {
            traceArray = new Float32Array(filteredPoints.flatMap(p => [p.x, p.y, p.z]));
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
                const gmst = computeGMST(starttime + p.time * 1000);
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
  }, [RenderTime, particleId, particle, satellitecurrentcoordinate, satelliteconfig, referenceSystem, starttime, trackWindow, showOrbit]);

  const ellipseRef = useRef();
  const satellitepreviewRef = useRef();

  //Preview of Orbit (visible when satelite parameters are being added)
  // To be added - (A button to show preview at any instance)
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

  // Clone the model to avoid sharing geometry and make it brighter
  useEffect(() => {
    if (satelliteModel && modelRef.current) {
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

  // Update satellite position continuously from current coordinates
  useFrame(() => {
    const isFixed = referenceSystem === 'EarthFixed';
    // Always update position if coordinates exist
    if (satelliteRef.current) {
      if (satellitecurrentcoordinate?.coordinates) {
        const coords = satellitecurrentcoordinate.coordinates;
        if ([coords.x, coords.y, coords.z].every(Number.isFinite)) {
          let px = coords.x, py = coords.y, pz = coords.z;
          if (isFixed) {
            const gmst = computeGMSTFromSim(starttime, RenderTime);
            [px, py, pz] = eciSceneToEcef(coords.x, coords.y, coords.z, gmst);
          }
          satelliteRef.current.position.set(px, py, pz);
          if (satelliteGlowRef.current) {
            satelliteGlowRef.current.position.set(px, py, pz);
          }
          if (modelRef.current) {
            modelRef.current.position.set(px, py, pz);
            // Rotate satellite model slowly for visual interest
            modelRef.current.rotation.y += 0.01;
          }
        }
      } else {
        // Set default position at origin if no coordinates yet
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
      {/* Satellite GLTF model */}
      {satelliteModel && (
        <group ref={modelRef} renderOrder={1000} />
      )}
      
      {/* Fallback satellite mesh - properly occludes behind Earth */}
      <mesh ref={satelliteRef} renderOrder={1000}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial 
          color={satColor}
          emissive={satColor}
          emissiveIntensity={1.5}
          depthTest={true}
          depthWrite={true}
        />
      </mesh>
      
      {/* Glow effect for better visibility */}
      <mesh ref={satelliteGlowRef} renderOrder={999}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial 
          color={satColor}
          transparent 
          opacity={0.5}
          depthTest={true}
          depthWrite={false}
        />
      </mesh>

      {/* Orbit trail line - only render if tracePoints exist */}
      {particle?.tracePoints?.length ? (
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

      {satelliteconfig?.preview && ellipseRef.current && (
        <line ref={ellipseRef} >
          <lineBasicMaterial color="#ff6b6b" linewidth={2} transparent opacity={0.8} />
        </line>
      )}
      
      {/* Orbit ellipse: shown only in EarthInertial AND when showOrbit is on */}
      {showOrbit && referenceSystem === 'EarthInertial' && (orbitalelements?.elements?.a || semimajoraxis) && (
        <OrbitEllipse 
          elements={orbitalelements?.elements || {
            a: semimajoraxis,
            e: eccentricity,
            i: inclination, // Already in radians from conversion above
            Ω: assendingnode, // Already in radians from conversion above
            ω: argumentOfPeriapsis // Already in radians from conversion above
          }}
          color={color}
        />
      )}

      {satelliteconfig?.preview &&      
      <mesh ref={satellitepreviewRef}>
        <sphereGeometry args={[0.05, 4, 4]} />
        <meshStandardMaterial color="red" />
      </mesh>}

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
