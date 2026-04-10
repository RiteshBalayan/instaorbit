/**
 * SatelliteBodyModel — Renders a configurable 3D body shape for a satellite,
 * with articulated sub-components (solar panels, laser pointers).
 *
 * Shapes: 'rectangle' (default), 'cone', 'circle'.
 * Accepts a quaternion [qx,qy,qz,qw] for attitude orientation.
 *
 * Components: each component from bodyFrame.components is rendered with
 * its articulation angles (a1, a2) from componentAngles.
 */

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';

/* ─── Parent axis → offset direction + rotation ─────────── */

function parentAxisToDir(axis) {
  switch (axis) {
    case '+X': return [1, 0, 0];
    case '-X': return [-1, 0, 0];
    case '+Y': return [0, 1, 0];
    case '-Y': return [0, -1, 0];
    case '+Z': return [0, 0, 1];
    case '-Z': return [0, 0, -1];
    default:   return [0, 1, 0];
  }
}

/**
 * Build an Euler rotation that orients the component's +Y toward the parent axis direction.
 * This is the "rest" orientation before articulation angles are applied.
 */
function parentAxisRestEuler(axis) {
  switch (axis) {
    case '+X': return new THREE.Euler(0, 0, -Math.PI / 2);
    case '-X': return new THREE.Euler(0, 0, Math.PI / 2);
    case '+Y': return new THREE.Euler(0, 0, 0);
    case '-Y': return new THREE.Euler(0, 0, Math.PI);
    case '+Z': return new THREE.Euler(Math.PI / 2, 0, 0);
    case '-Z': return new THREE.Euler(-Math.PI / 2, 0, 0);
    default:   return new THREE.Euler(0, 0, 0);
  }
}

/**
 * Resolve the effective direction for a component — uses custom axisDirection if present,
 * otherwise falls back to parentAxis string.
 */
function resolveCompDir(comp) {
  if (comp.axisDirection && (comp.axisDirection[0] !== 0 || comp.axisDirection[1] !== 0 || comp.axisDirection[2] !== 0)) {
    const [x, y, z] = comp.axisDirection;
    const len = Math.sqrt(x * x + y * y + z * z);
    return len > 1e-10 ? [x / len, y / len, z / len] : parentAxisToDir(comp.parentAxis || '+Y');
  }
  return parentAxisToDir(comp.parentAxis || '+Y');
}

/**
 * Resolve position offset — uses positionOffset if present, otherwise dir * offset.
 */
function resolveCompPos(comp, scale) {
  if (comp.positionOffset && (comp.positionOffset[0] !== 0 || comp.positionOffset[1] !== 0 || comp.positionOffset[2] !== 0)) {
    return [comp.positionOffset[0] * scale, comp.positionOffset[1] * scale, comp.positionOffset[2] * scale];
  }
  const dir = resolveCompDir(comp);
  const offset = comp.offset || 0.04;
  return [dir[0] * offset * scale, dir[1] * offset * scale, dir[2] * offset * scale];
}

/**
 * Build rest Euler from a custom direction vector (aligns +Y with direction).
 */
function directionToRestEuler(dir) {
  const v = new THREE.Vector3(dir[0], dir[1], dir[2]).normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(up, v);
  return new THREE.Euler().setFromQuaternion(q);
}

/**
 * Resolve rest Euler from component config — uses custom axisDirection if present.
 */
function resolveRestEuler(comp) {
  if (comp.axisDirection && (comp.axisDirection[0] !== 0 || comp.axisDirection[1] !== 0 || comp.axisDirection[2] !== 0)) {
    return directionToRestEuler(comp.axisDirection);
  }
  return parentAxisRestEuler(comp.parentAxis || '+Y');
}

/* ─── Component sub-mesh renderers ──────────────────────── */

/**
 * SolarPanelMesh — 1-DOF articulation.
 *
 * Backend `attitude.js` computes a1 as the angle (in degrees) in the plane
 * perpendicular to the parent (mounting) axis, measured from a reference vector.
 * The reference vector convention:
 *   - If parent axis is ±Y → ref = body X   (i.e. [1,0,0])
 *   - If parent axis is ±X → ref = body Y   (i.e. [0,1,0])
 *   - If parent axis is ±Z → ref = body X   (i.e. [1,0,0])
 *
 * The panel at rest (a1 = 0) has its coated flat face (+Z of the box) pointing
 * along the reference vector.  a1 rotates the panel about the mounting axis.
 *
 * Rest orientation is built via makeBasis so that:
 *   local +Z (flat face normal / coated side)  →  refVec
 *   local +Y (hinge / long edge)                →  mountAxis
 *   local +X (completes right-hand frame)        →  cross(mount, ref)
 */
const SolarPanelMesh = ({ comp, angleDeg, scale, emissive }) => {
  const dir = resolveCompDir(comp);
  const pos = resolveCompPos(comp, scale);

  const dx = dir[0], dy = dir[1], dz = dir[2];

  // Memoize all THREE.js object creation
  const computed = useMemo(() => {
    const mountVec = new THREE.Vector3(dx, dy, dz).normalize();

    // Reference vector (must match backend attitude.js)
    let refVec;
    if (Math.abs(dy) > 0.9) refVec = new THREE.Vector3(1, 0, 0);
    else if (Math.abs(dx) > 0.9) refVec = new THREE.Vector3(0, 1, 0);
    else refVec = new THREE.Vector3(1, 0, 0);
    refVec.sub(mountVec.clone().multiplyScalar(refVec.dot(mountVec))).normalize();

    // Third axis = cross(mount, ref)
    const thirdVec = new THREE.Vector3().crossVectors(mountVec, refVec).normalize();

    // Rest orientation: local +X → thirdVec, local +Y → mountVec, local +Z → refVec
    const baseMat = new THREE.Matrix4().makeBasis(thirdVec, mountVec, refVec);
    const restQuat = new THREE.Quaternion().setFromRotationMatrix(baseMat);

    // Articulation: rotate by a1° about the mounting axis
    const articulationQuat = new THREE.Quaternion().setFromAxisAngle(
      mountVec, (angleDeg || 0) * (Math.PI / 180),
    );

    // Final = articulation applied to rest
    const finalQuat = articulationQuat.clone().multiply(restQuat);
    const euler = new THREE.Euler().setFromQuaternion(finalQuat);

    const panelW = 0.04 * scale;
    const panelH = 0.04 * scale;
    const panelD = 0.002 * scale;
    const frameT = 0.0015 * scale;
    const gridThick = 0.0004 * scale;
    const gridHeight = 0.0001 * scale;

    return { euler, panelW, panelH, panelD, frameT, gridThick, gridHeight };
  }, [dx, dy, dz, angleDeg, scale, comp.parentAxis, comp.axisDirection]);

  const { euler, panelW, panelH, panelD, frameT, gridThick, gridHeight } = computed;

  return (
    <group position={pos} rotation={euler}>
      {/* Silver metallic border frame */}
      <mesh position={[0, 0, -panelD * 0.3]}>
        <boxGeometry args={[panelW + frameT * 2, panelH + frameT * 2, panelD * 0.6]} />
        <meshStandardMaterial
          color="#c0c0c0"
          metalness={0.95}
          roughness={0.15}
          emissive={emissive ? '#888888' : '#000000'}
          emissiveIntensity={emissive ? 0.15 : 0}
        />
      </mesh>

      {/* Main panel surface — lighter blue-indigo solar cell */}
      <mesh>
        <boxGeometry args={[panelW, panelH, panelD]} />
        <meshStandardMaterial
          color="#6aaddf"
          metalness={0.6}
          roughness={0.25}
          emissive={emissive ? '#5090c0' : '#0a1a3a'}
          emissiveIntensity={emissive ? 0.4 : 0.08}
        />
      </mesh>

      {/* Golden grid lines — horizontal (3 lines) */}
      {[-1, 0, 1].map(i => (
        <mesh key={`gh${i}`} position={[0, i * (panelH / 3), panelD * 0.51]}>
          <boxGeometry args={[panelW, gridThick, gridHeight]} />
          <meshStandardMaterial color="#c8a84e" metalness={0.85} roughness={0.2} emissive="#a08030" emissiveIntensity={0.3} />
        </mesh>
      ))}

      {/* Golden grid lines — vertical (3 lines) */}
      {[-1, 0, 1].map(i => (
        <mesh key={`gv${i}`} position={[i * (panelW / 3), 0, panelD * 0.51]}>
          <boxGeometry args={[gridThick, panelH, gridHeight]} />
          <meshStandardMaterial color="#c8a84e" metalness={0.85} roughness={0.2} emissive="#a08030" emissiveIntensity={0.3} />
        </mesh>
      ))}
    </group>
  );
};

/**
 * LaserCommTerminalMesh — 2-DOF az-el gimbal optical terminal.
 *
 * Modelled after real satellite laser communication terminals (e.g. LCRD, EDRS):
 *
 * Physical structure (bottom to top):
 *   1. Base plate — fixed to satellite body, oriented along mounting axis
 *   2. Azimuth turret — cylindrical, rotates a1° around the mounting axis
 *   3. Elevation fork/yoke — U-shaped cradle on the turret, tilts a2°
 *   4. Telescope tube — cylindrical barrel with aperture ring at the front
 *   5. Beam — exits from the aperture along the telescope bore axis
 *
 * DOF mapping (matches backend attitude.js exactly):
 *   a1 = azimuth: rotation in the plane perpendicular to the mount axis,
 *         measured from the reference vector (same convention as solar panels).
 *   a2 = elevation: tilt from that perpendicular plane toward the mount axis.
 *         a2 = 0° → beam is in the perpendicular plane.
 *         a2 = 90° → beam points along the mount axis.
 *         a2 = -90° → beam points opposite the mount axis.
 *
 * At rest (a1=0, a2=0) the beam points along the reference vector:
 *   mount ±Y → beam along body +X
 *   mount ±X → beam along body +Y
 *   mount ±Z → beam along body +X
 */
const LaserCommTerminalMesh = ({ comp, a1Deg, a2Deg, scale, emissive }) => {
  const dir = resolveCompDir(comp);
  const pos = resolveCompPos(comp, scale);

  // Stable dependency key for the axis direction
  const dx = dir[0], dy = dir[1], dz = dir[2];

  // ── All THREE.js object creation is memoized ──────────────────────────
  const computed = useMemo(() => {
    const mountVec = new THREE.Vector3(dx, dy, dz).normalize();

    // ── Reference vector (must match backend attitude.js exactly) ────
    let refVec;
    if (Math.abs(dy) > 0.9) refVec = new THREE.Vector3(1, 0, 0);
    else if (Math.abs(dx) > 0.9) refVec = new THREE.Vector3(0, 1, 0);
    else refVec = new THREE.Vector3(1, 0, 0);
    refVec.sub(mountVec.clone().multiplyScalar(refVec.dot(mountVec))).normalize();

    const perpVec = new THREE.Vector3().crossVectors(mountVec, refVec).normalize();

    // Base orientation: local +Y = mount axis, +X = refVec, +Z = perpVec
    const baseMat = new THREE.Matrix4().makeBasis(refVec, mountVec, perpVec);
    const baseQuat = new THREE.Quaternion().setFromRotationMatrix(baseMat);

    // Azimuth rotation: a1° around mount axis
    const azRad = (a1Deg || 0) * Math.PI / 180;
    const azQuat = new THREE.Quaternion().setFromAxisAngle(mountVec, azRad);

    // Elevation rotation: a2° tilting from perp plane toward mount axis.
    // Backend convention: positive a2 = tilt toward mount axis.
    // But perpVec = cross(mount, ref), so by right-hand rule rotating
    // +angle around perpVec tilts AWAY from mount. We negate to match.
    const elAxis = perpVec.clone().applyQuaternion(azQuat).normalize();
    const elRad = -((a2Deg || 0) * Math.PI / 180);
    const elQuat = new THREE.Quaternion().setFromAxisAngle(elAxis, elRad);

    // Beam direction
    const beamDir = refVec.clone().applyQuaternion(azQuat).applyQuaternion(elQuat).normalize();

    // Gimbal, turret, base Euler
    const gimbalEuler = new THREE.Euler().setFromQuaternion(
      baseQuat.clone().premultiply(azQuat).premultiply(elQuat)
    );
    const turretEuler = new THREE.Euler().setFromQuaternion(
      baseQuat.clone().premultiply(azQuat)
    );
    const baseEuler = new THREE.Euler().setFromQuaternion(baseQuat);

    // Sizing
    const s = scale;
    const baseR = 0.006 * s;
    const baseH = 0.003 * s;
    const turretR = 0.005 * s;
    const turretH = 0.005 * s;
    const yokeW = 0.009 * s;
    const yokeH = 0.003 * s;
    const yokeD = 0.004 * s;
    const tubeR = 0.0035 * s;
    const tubeLen = 0.014 * s;
    const apertureR = tubeR * 1.3;
    const apertureD = 0.001 * s;
    const lensR = tubeR * 0.85;
    const beamLen = 0.12 * s;
    const beamThick = 0.002 * s;

    // Positions along beam
    const tubeOffset = beamDir.clone().multiplyScalar(tubeLen * 0.5 + turretR * 0.3);
    const apertureOffset = beamDir.clone().multiplyScalar(tubeLen + turretR * 0.3);
    const beamCenter = apertureOffset.clone().add(beamDir.clone().multiplyScalar(beamLen * 0.5));

    // Tube/beam orientation: align cylinder +Y with beamDir
    const tubeEuler = new THREE.Euler().setFromQuaternion(
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), beamDir)
    );

    return {
      baseEuler, turretEuler, gimbalEuler, tubeEuler,
      baseR, baseH, turretR, turretH, yokeW, yokeH, yokeD,
      tubeR, tubeLen, apertureR, apertureD, lensR, beamLen, beamThick,
      tubeOffset: [tubeOffset.x, tubeOffset.y, tubeOffset.z],
      apertureOffset: [apertureOffset.x, apertureOffset.y, apertureOffset.z],
      beamCenter: [beamCenter.x, beamCenter.y, beamCenter.z],
    };
  }, [dx, dy, dz, a1Deg, a2Deg, scale]);

  const {
    baseEuler, turretEuler, gimbalEuler, tubeEuler,
    baseR, baseH, turretR, turretH, yokeW, yokeH, yokeD,
    tubeR, tubeLen, apertureR, apertureD, lensR, beamLen, beamThick,
    tubeOffset, apertureOffset, beamCenter,
  } = computed;

  const metalGrey = '#8a8a8a';
  const darkGrey = '#555555';
  const goldAccent = '#c8a84e';

  return (
    <group position={pos}>
      {/* ── 1. Base plate (fixed to body) ─────────────────────────── */}
      <group rotation={baseEuler}>
        <mesh>
          <cylinderGeometry args={[baseR, baseR * 1.15, baseH, 12]} />
          <meshStandardMaterial
            color={darkGrey}
            metalness={0.85}
            roughness={0.2}
            emissive={emissive ? '#444444' : '#000000'}
            emissiveIntensity={emissive ? 0.15 : 0}
          />
        </mesh>
        {/* Mounting ring */}
        <mesh position={[0, -baseH * 0.45, 0]}>
          <torusGeometry args={[baseR * 0.9, baseH * 0.15, 8, 16]} />
          <meshStandardMaterial color={goldAccent} metalness={0.9} roughness={0.15} />
        </mesh>
      </group>

      {/* ── 2. Azimuth turret (rotates with a1) ──────────────────── */}
      <group rotation={turretEuler}>
        <mesh position={[0, turretH * 0.3, 0]}>
          <cylinderGeometry args={[turretR, turretR * 0.95, turretH, 10]} />
          <meshStandardMaterial
            color={metalGrey}
            metalness={0.8}
            roughness={0.25}
            emissive={emissive ? '#666666' : '#000000'}
            emissiveIntensity={emissive ? 0.15 : 0}
          />
        </mesh>
      </group>

      {/* ── 3. Elevation yoke + telescope (rotates with a1 + a2) ── */}
      <group rotation={gimbalEuler}>
        {/* Fork/yoke cradle */}
        <mesh position={[0, turretH * 0.55, 0]}>
          <boxGeometry args={[yokeW, yokeH, yokeD]} />
          <meshStandardMaterial
            color={metalGrey}
            metalness={0.75}
            roughness={0.3}
            emissive={emissive ? '#555555' : '#000000'}
            emissiveIntensity={emissive ? 0.1 : 0}
          />
        </mesh>
      </group>

      {/* ── 4. Telescope tube (follows full beam direction) ─────── */}
      <mesh position={tubeOffset} rotation={tubeEuler}>
        <cylinderGeometry args={[tubeR, tubeR, tubeLen, 12]} />
        <meshStandardMaterial
          color="#666666"
          metalness={0.7}
          roughness={0.3}
          emissive={emissive ? '#555555' : '#111111'}
          emissiveIntensity={emissive ? 0.2 : 0.05}
        />
      </mesh>

      {/* ── 5. Aperture ring at tube front ─────────────────────── */}
      <mesh position={apertureOffset} rotation={tubeEuler}>
        <cylinderGeometry args={[apertureR, tubeR, apertureD, 16]} />
        <meshStandardMaterial
          color={goldAccent}
          metalness={0.9}
          roughness={0.1}
          emissive={emissive ? '#aa8833' : '#000000'}
          emissiveIntensity={emissive ? 0.3 : 0}
        />
      </mesh>

      {/* ── 6. Lens element (translucent blue-green) ───────────── */}
      <mesh position={apertureOffset} rotation={tubeEuler}>
        <cylinderGeometry args={[lensR, lensR, apertureD * 0.3, 16]} />
        <meshStandardMaterial
          color="#33ccff"
          metalness={0.3}
          roughness={0.1}
          transparent
          opacity={0.5}
          emissive="#33ccff"
          emissiveIntensity={emissive ? 0.6 : 0.2}
        />
      </mesh>

      {/* ── 7. Laser beam (exits from aperture along beamDir) ──── */}
      <mesh position={beamCenter} rotation={tubeEuler}>
        <cylinderGeometry args={[beamThick * 0.5, beamThick * 0.3, beamLen, 6]} />
        <meshStandardMaterial
          color="#ff2222"
          metalness={0.1}
          roughness={0.6}
          transparent
          opacity={0.75}
          emissive="#ff0000"
          emissiveIntensity={1.0}
        />
      </mesh>

      {/* ── 8. Beam glow (soft outer glow) ─────────────────────── */}
      <mesh position={beamCenter} rotation={tubeEuler}>
        <cylinderGeometry args={[beamThick * 1.5, beamThick * 0.8, beamLen, 6]} />
        <meshBasicMaterial
          color="#ff4444"
          transparent
          opacity={0.15}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
};

/* ─── Body axis arrows (memoized to avoid new Vector3 every render) ─ */
const _xDir = new THREE.Vector3(1, 0, 0);
const _yDir = new THREE.Vector3(0, 1, 0);
const _zDir = new THREE.Vector3(0, 0, 1);
const _origin = new THREE.Vector3(0, 0, 0);

const BodyAxes = React.memo(({ scale }) => {
  const len = 0.06 * scale;
  const headLen = 0.015 * scale;
  const headW = 0.01 * scale;
  return (
    <>
      <arrowHelper args={[_xDir, _origin, len, 0xff0000, headLen, headW]} />
      <arrowHelper args={[_yDir, _origin, len, 0x00ff00, headLen, headW]} />
      <arrowHelper args={[_zDir, _origin, len, 0x0088ff, headLen, headW]} />
    </>
  );
});

/* ─── Main component ────────────────────────────────────── */

const SatelliteBodyModel = ({
  shape = 'rectangle',
  color = '#00ffff',
  scale = 1,
  emissive = false,
  showAxes = true,
  components = [],
  componentAngles = {},
}) => {
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

  // Determine if we should show default hardcoded panels (backward compat)
  const hasCustomComponents = components && components.length > 0;
  const hasPanels = shape === 'rectangle' && !hasCustomComponents;

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

      {/* Default solar panels (only if no custom components and rectangle shape) */}
      {hasPanels && (() => {
        const pw = 0.04 * scale, ph = 0.04 * scale, pd = 0.002 * scale;
        const ft = 0.0015 * scale, gt = 0.0004 * scale, gh = 0.0001 * scale;
        const panelJSX = (yPos) => (
          <group key={yPos} position={[0, yPos, 0]}>
            {/* Silver frame */}
            <mesh position={[0, 0, -pd * 0.3]}>
              <boxGeometry args={[pw + ft * 2, ph + ft * 2, pd * 0.6]} />
              <meshStandardMaterial color="#c0c0c0" metalness={0.95} roughness={0.15}
                emissive={emissive ? '#888888' : '#000000'} emissiveIntensity={emissive ? 0.15 : 0} />
            </mesh>
            {/* Panel surface */}
            <mesh>
              <boxGeometry args={[pw, ph, pd]} />
              <meshStandardMaterial color="#6aaddf" metalness={0.6} roughness={0.25}
                emissive={emissive ? '#5090c0' : '#0a1a3a'} emissiveIntensity={emissive ? 0.4 : 0.08} />
            </mesh>
            {/* Golden grid — horizontal */}
            {[-1, 0, 1].map(i => (
              <mesh key={`dh${i}`} position={[0, i * (ph / 3), pd * 0.51]}>
                <boxGeometry args={[pw, gt, gh]} />
                <meshStandardMaterial color="#c8a84e" metalness={0.85} roughness={0.2} emissive="#a08030" emissiveIntensity={0.3} />
              </mesh>
            ))}
            {/* Golden grid — vertical */}
            {[-1, 0, 1].map(i => (
              <mesh key={`dv${i}`} position={[i * (pw / 3), 0, pd * 0.51]}>
                <boxGeometry args={[gt, ph, gh]} />
                <meshStandardMaterial color="#c8a84e" metalness={0.85} roughness={0.2} emissive="#a08030" emissiveIntensity={0.3} />
              </mesh>
            ))}
          </group>
        );
        return <>{panelJSX(0.04 * scale)}{panelJSX(-0.04 * scale)}</>;
      })()}

      {/* Articulated components from bodyFrame.components */}
      {hasCustomComponents && components.map(comp => {
        const angles = componentAngles[comp.id] || { a1: 0, a2: 0 };
        if (comp.type === 'solarPanel') {
          return (
            <SolarPanelMesh
              key={comp.id}
              comp={comp}
              angleDeg={angles.a1}
              scale={scale}
              emissive={emissive}
            />
          );
        }
        if (comp.type === 'laserPointer') {
          return (
            <LaserCommTerminalMesh
              key={comp.id}
              comp={comp}
              a1Deg={angles.a1}
              a2Deg={angles.a2}
              scale={scale}
              emissive={emissive}
            />
          );
        }
        return null;
      })}

      {/* Body-axis indicator: X = red, Y = green, Z = blue (small arrows from center) */}
      {showAxes && (
        <BodyAxes scale={scale} />
      )}
    </group>
  );
};

export default SatelliteBodyModel;
