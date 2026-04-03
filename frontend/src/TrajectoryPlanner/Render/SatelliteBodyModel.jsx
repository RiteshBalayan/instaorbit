/**
 * SatelliteBodyModel — Renders a configurable 3D body shape for a satellite.
 *
 * Shapes: 'rectangle' (default), 'cone', 'circle'.
 * Accepts a quaternion [qx,qy,qz,qw] for attitude orientation.
 */

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';

const SatelliteBodyModel = ({ shape = 'rectangle', color = '#00ffff', scale = 1, emissive = false, showAxes = true }) => {
  const meshRef = useRef();

  const geometry = useMemo(() => {
    switch (shape) {
      case 'cone':
        return new THREE.ConeGeometry(0.03 * scale, 0.08 * scale, 8);
      case 'circle':
        return new THREE.SphereGeometry(0.04 * scale, 16, 16);
      case 'rectangle':
      default:
        return new THREE.BoxGeometry(0.06 * scale, 0.03 * scale, 0.02 * scale);
    }
  }, [shape, scale]);

  // Solar panel wings for rectangle (satellite bus) shape
  const hasPanels = shape === 'rectangle';

  return (
    <group>
      {/* Main body */}
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial
          color={color}
          metalness={0.5}
          roughness={0.4}
          depthTest={true}
          depthWrite={true}
          emissive={emissive ? color : '#000000'}
          emissiveIntensity={emissive ? 0.35 : 0}
        />
      </mesh>

      {/* Solar panels (only for rectangle bus shape) */}
      {hasPanels && (
        <>
          {/* Left panel */}
          <mesh position={[0, 0.04 * scale, 0]}>
            <boxGeometry args={[0.04 * scale, 0.04 * scale, 0.002 * scale]} />
            <meshStandardMaterial
              color="#1e3a5f"
              metalness={0.8}
              roughness={0.2}
              emissive={emissive ? '#1e3a5f' : '#000000'}
              emissiveIntensity={emissive ? 0.2 : 0}
            />
          </mesh>
          {/* Right panel */}
          <mesh position={[0, -0.04 * scale, 0]}>
            <boxGeometry args={[0.04 * scale, 0.04 * scale, 0.002 * scale]} />
            <meshStandardMaterial
              color="#1e3a5f"
              metalness={0.8}
              roughness={0.2}
              emissive={emissive ? '#1e3a5f' : '#000000'}
              emissiveIntensity={emissive ? 0.2 : 0}
            />
          </mesh>
        </>
      )}

      {/* Body-axis indicator: X = red, Y = green, Z = blue (small arrows from center) */}
      {showAxes && (
        <>
          <arrowHelper args={[
            new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 0.06 * scale, 0xff0000, 0.015 * scale, 0.01 * scale
          ]} />
          <arrowHelper args={[
            new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 0.06 * scale, 0x00ff00, 0.015 * scale, 0.01 * scale
          ]} />
          <arrowHelper args={[
            new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), 0.06 * scale, 0x0088ff, 0.015 * scale, 0.01 * scale
          ]} />
        </>
      )}
    </group>
  );
};

export default SatelliteBodyModel;
