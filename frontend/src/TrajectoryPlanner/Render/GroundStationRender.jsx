import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSelector } from 'react-redux';

const SCALE_TO_KM = 3185.5;

const GroundStation = ({ stationId, lat, lon, altKm = 0, name }) => {
  const groupRef = useRef();
  const antennaRef = useRef();
  const referenceSystem = useSelector((state) => state.view.ReferenceSystem);
  const elapsedTime = useSelector((state) => state.timer.RenderTime);

  // Calculate position on Earth surface
  const position = useMemo(() => {
    const latRad = (lat * Math.PI) / 180;
    const lonRad = (lon * Math.PI) / 180;
    const earthRadius = 2; // Earth radius in scene units
    const r = (6378.137 + altKm) / SCALE_TO_KM; // Convert to scene units
    
    let adjustedLon = lonRad;
    if (referenceSystem === 'EarthInertial') {
      // In EarthInertial frame: Ground stations must rotate with Earth
      // because Earth mesh rotates in this non-rotating reference frame
      const earthRotationRate = (2 * Math.PI) / (24 * 60 * 60); // radians per second
      adjustedLon = lonRad + (earthRotationRate * elapsedTime);
    }
    // In EarthFixed frame: Ground stations remain at fixed lat/lon
    // because the reference frame itself rotates with Earth
    
    return {
      x: r * Math.cos(latRad) * Math.cos(adjustedLon),
      y: r * Math.cos(latRad) * Math.sin(adjustedLon),
      z: r * Math.sin(latRad),
    };
  }, [lat, lon, altKm, referenceSystem, elapsedTime]);

  // Calculate normal vector for orientation (must account for Earth rotation)
  const normal = useMemo(() => {
    const latRad = (lat * Math.PI) / 180;
    let lonRad = (lon * Math.PI) / 180;
    
    // Adjust longitude for EarthInertial mode
    if (referenceSystem === 'EarthInertial') {
      const earthRotationRate = (2 * Math.PI) / (24 * 60 * 60);
      lonRad = lonRad + (earthRotationRate * elapsedTime);
    }
    
    return new THREE.Vector3(
      Math.cos(latRad) * Math.cos(lonRad),
      Math.cos(latRad) * Math.sin(lonRad),
      Math.sin(latRad)
    ).normalize();
  }, [lat, lon, referenceSystem, elapsedTime]);

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

