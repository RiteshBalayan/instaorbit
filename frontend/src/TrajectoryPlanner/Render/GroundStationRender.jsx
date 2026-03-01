import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSelector } from 'react-redux';
import { geodeticToScene, geodeticToSceneECI } from '../../transforms';

const GroundStation = ({ stationId, lat, lon, altKm = 0, name }) => {
  const groupRef = useRef();
  const antennaRef = useRef();
  const referenceSystem = useSelector((state) => state.view.ReferenceSystem);
  const elapsedTime = useSelector((state) => state.timer.RenderTime);
  const starttime = useSelector((state) => state.timer.starttime);

  // Calculate position using centralized transforms
  const position = useMemo(() => {
    const geo = { lat, lon, alt: altKm };
    let pos;
    if (referenceSystem === 'EarthInertial') {
      // In EarthInertial frame: transform geodetic → ECEF → ECI using GMST
      const utcMs = starttime + elapsedTime * 1000;
      pos = geodeticToSceneECI(geo, utcMs);
    } else {
      // In EarthFixed frame: transform geodetic → ECEF → scene units
      pos = geodeticToScene(geo);
    }
    return { x: pos[0], y: pos[1], z: pos[2] };
  }, [lat, lon, altKm, referenceSystem, elapsedTime, starttime]);

  // Calculate normal vector for orientation (same frame as position)
  const normal = useMemo(() => {
    const geo = { lat, lon, alt: altKm + 10 }; // slight offset for direction
    let pos;
    if (referenceSystem === 'EarthInertial') {
      const utcMs = starttime + elapsedTime * 1000;
      pos = geodeticToSceneECI(geo, utcMs);
    } else {
      pos = geodeticToScene(geo);
    }
    return new THREE.Vector3(
      pos[0] - position.x,
      pos[1] - position.y,
      pos[2] - position.z
    ).normalize();
  }, [lat, lon, altKm, referenceSystem, elapsedTime, starttime, position]);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.set(position.x, position.y, position.z);
      // Orient the building to face outward from Earth
      groupRef.current.lookAt(
        position.x + normal.x * 0.1,
        position.y + normal.y * 0.1,
        position.z + normal.z * 0.1
      );
    }
    
    // Animate antenna rotation
    if (antennaRef.current) {
      antennaRef.current.rotation.y += 0.02;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Building base */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.08, 0.08, 0.12]} />
        <meshStandardMaterial color="#8b7355" />
      </mesh>
      
      {/* Building top */}
      <mesh position={[0, 0, 0.06]}>
        <boxGeometry args={[0.1, 0.1, 0.02]} />
        <meshStandardMaterial color="#6b5b47" />
      </mesh>
      
      {/* Antenna dish */}
      <mesh ref={antennaRef} position={[0, 0, 0.08]}>
        <coneGeometry args={[0.04, 0.06, 8]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Antenna base */}
      <mesh position={[0, 0, 0.07]}>
        <cylinderGeometry args={[0.01, 0.01, 0.02]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      
      {/* Glow effect */}
      <pointLight
        position={[0, 0, 0.1]}
        color="#4a9eff"
        intensity={0.5}
        distance={0.5}
      />
    </group>
  );
};

export default GroundStation;

