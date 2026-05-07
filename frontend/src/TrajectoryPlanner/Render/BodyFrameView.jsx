/**
 * BodyFrameView — Satellite-centered LVLH reference-frame view.
 *
 * Everything is rendered directly in LVLH coordinates.
 * Every position/direction is explicitly transformed from ECI→LVLH.
 *
 * LVLH axes (STK/GMAT convention):
 *   Z_LVLH = −R̂            (nadir — toward Earth)
 *   Y_LVLH = −(R×V)/|R×V|  (negative orbit-normal)
 *   X_LVLH = Y × Z          (≈ along-track)
 */

import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { useSelector, useStore } from 'react-redux';
import { computeGMSTFromSim, sunDirectionECIFromSim, geodeticToSceneECI } from '../../transforms';
import SatelliteBodyModel from './SatelliteBodyModel';
import EarthMaterial from './EarthMaterial';
import useTracePoints from '../../hooks/useTracePoints';
import { getLinksAtTimeFromStore } from '../../hooks/useLinkDisplayData';

/* ─── Vector helpers ────────────────────────────────────────── */

function findLastIndexLE(pts, tSec) {
  let lo = 0, hi = pts.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (pts[mid].time <= tSec) { ans = mid; lo = mid + 1; } else { hi = mid - 1; }
  }
  return ans;
}

function vec3Norm(v) {
  const l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  return l > 1e-14 ? [v[0] / l, v[1] / l, v[2] / l] : [0, 0, 0];
}

function vec3Cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function lvlhBasis(posECI, velECI) {
  const rHat = vec3Norm(posECI);
  const zB = [-rHat[0], -rHat[1], -rHat[2]];
  const h = vec3Cross(posECI, velECI);
  const hHat = vec3Norm(h);
  const yB = [-hHat[0], -hHat[1], -hHat[2]];
  const xB = vec3Norm(vec3Cross(yB, zB));
  return { x: xB, y: yB, z: zB };
}

function eci2lvlh(pECI, satECI, basis) {
  const dx = pECI[0] - satECI[0];
  const dy = pECI[1] - satECI[1];
  const dz = pECI[2] - satECI[2];
  return [
    basis.x[0] * dx + basis.x[1] * dy + basis.x[2] * dz,
    basis.y[0] * dx + basis.y[1] * dy + basis.y[2] * dz,
    basis.z[0] * dx + basis.z[1] * dy + basis.z[2] * dz,
  ];
}

function dirECI2LVLH(dECI, basis) {
  return [
    basis.x[0] * dECI[0] + basis.x[1] * dECI[1] + basis.x[2] * dECI[2],
    basis.y[0] * dECI[0] + basis.y[1] * dECI[1] + basis.y[2] * dECI[2],
    basis.z[0] * dECI[0] + basis.z[1] * dECI[1] + basis.z[2] * dECI[2],
  ];
}

function lvlhQuat(basis) {
  const m = new THREE.Matrix4();
  m.makeBasis(
    new THREE.Vector3(basis.x[0], basis.x[1], basis.x[2]),
    new THREE.Vector3(basis.y[0], basis.y[1], basis.y[2]),
    new THREE.Vector3(basis.z[0], basis.z[1], basis.z[2]),
  );
  return new THREE.Quaternion().setFromRotationMatrix(m);
}

function estimateVelocity(pts, idx) {
  if (idx > 0) {
    const p0 = pts[idx - 1], p1 = pts[idx];
    const dt = p1.time - p0.time;
    if (dt > 0) return [(p1.x - p0.x) / dt, (p1.y - p0.y) / dt, (p1.z - p0.z) / dt];
  }
  if (idx < pts.length - 1) {
    const p0 = pts[idx], p1 = pts[idx + 1];
    const dt = p1.time - p0.time;
    if (dt > 0) return [(p1.x - p0.x) / dt, (p1.y - p0.y) / dt, (p1.z - p0.z) / dt];
  }
  return null;
}

const SCALE = 3185.5;

const MAX_LVLH_LINKS = 32;

/* ── Binary search: find entry with time ≤ t ──────────────────── */
function findStepAtTime(ts, t) {
  if (!ts || !ts.length) return null;
  let lo = 0, hi = ts.length - 1;
  if (t <= ts[0].time) return ts[0];
  if (t >= ts[hi].time) return ts[hi];
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (ts[mid].time <= t) lo = mid; else hi = mid - 1;
  }
  return ts[lo];
}

/* ── Resolve parent position in scene units (same as ConnectivityLinks) ── */
function resolveParentPosScene(parentId, t, particles, currentStates, groundStations, starttime, visibleTracePoints) {
  if (parentId.startsWith('sat-')) {
    const numId = parseFloat(parentId.replace('sat-', ''));
    // 1. Prefer TSDB visibleTracePoints (high-res ±60 s window)
    const visPts = visibleTracePoints?.[numId];
    if (visPts?.length) {
      const idx = findLastIndexLE(visPts, t);
      if (idx >= 0) {
        const p = visPts[idx];
        return [p.x, p.y, p.z];
      }
    }
    // 2. Legacy: particles[i].tracePoints (full in-Redux)
    for (let i = 0; i < particles.length; i++) {
      if (particles[i].id === numId) {
        const pts = particles[i].tracePoints;
        if (pts?.length) {
          const idx = findLastIndexLE(pts, t);
          if (idx >= 0) {
            const p = pts[idx];
            return [p.x, p.y, p.z]; // scene units
          }
        }
        break;
      }
    }
    // 3. Fallback: CurrentState
    for (let i = 0; i < currentStates.length; i++) {
      if (currentStates[i].id === numId && currentStates[i].coordinates) {
        const c = currentStates[i].coordinates;
        return [c.x, c.y, c.z];
      }
    }
    return null;
  }
  // Ground station
  const gs = groundStations.find(g => g.id === parentId);
  if (!gs) return null;
  const utcMs = starttime + t * 1000;
  return geodeticToSceneECI({ lat: gs.lat, lon: gs.lon, alt: gs.altKm || 0 }, utcMs);
}

/* ─── Shaders (identical to GlobeRender) ─────────────────────── */
const glowVS = `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const glowFS = `
  uniform float c;
  uniform float p;
  varying vec3 vNormal;
  void main() {
    float intensity = pow(c - dot(vNormal, vec3(0.0, 0.0, 1.0)), p);
    gl_FragColor = vec4(0.0, 0.5, 1.0, 0.2) * intensity;
  }
`;

const sunVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const sunFragmentShader = `
  uniform float time;
  varying vec2 vUv;
  void main() {
    vec2 uv = vUv;
    uv.y += time * 0.01;
    vec3 color = vec3(1.0, 0.5 + 0.5 * sin(uv.y * 10.0 + time * 2.0), 0.0);
    gl_FragColor = vec4(color, 1.0);
  }
`;

/* ─── LinkLine rendering is now handled imperatively via LineSegments2 ── */

/* ─── Inner scene ────────────────────────────────────────────── */
const BodyFrameScene = ({ satelliteId, showGlow }) => {
  const earthRef  = useRef();
  const haloRef   = useRef();
  const lightRef  = useRef();
  const bodyRef   = useRef();
  const sunRef    = useRef();
  const sunHaloRef = useRef();
  const sunDirLVLHRef = useRef([1, 0, 0]); // sun direction in LVLH (world space of this scene)

  /* Refs for dynamically-positioned objects (other sats, ground stations) */
  const otherSatRefs  = useRef({});
  const gsRefs        = useRef({});

  /* ── Thick link lines via Line2 addon ──────────────────────── */
  const lvlhLinkSegRef = useRef();
  const lvlhLinkPositions = useMemo(() => new Float32Array(MAX_LVLH_LINKS * 6), []);
  const lvlhLinkGeo = useMemo(() => new LineSegmentsGeometry(), []);
  const lvlhLinkMat = useMemo(() => new LineMaterial({
    color: 0xffeb3b,
    linewidth: 4,          // pixels — works with LineMaterial
    transparent: true,
    opacity: 0.95,
    depthTest: true,
    worldUnits: false,
  }), []);
  const lvlhLinkSegObj = useMemo(() => new LineSegments2(lvlhLinkGeo, lvlhLinkMat), [lvlhLinkGeo, lvlhLinkMat]);
  // Use useStore to read link display data inside useFrame (avoids stale closures)
  const store = useStore();
  // Track link display mode for color switching (yellow=connected, cyan=available)
  const lastLinkModeRef = useRef('connected');

  /* Refs for component angle state (updated each frame from trace points).
     Using refs instead of useState to avoid re-renders inside useFrame
     which cause "Maximum update depth exceeded" crashes. */
  const mainComponentAnglesRef = useRef({});
  const otherSatComponentAnglesRef = useRef({});
  const mainAnglesJsonRef = useRef('{}');
  const otherAnglesJsonRef = useRef('{}');
  const [mainComponentAngles, setMainComponentAngles] = useState({});
  const [otherSatComponentAngles, setOtherSatComponentAngles] = useState({});

  const satellites      = useSelector(s => s.CurrentState.satelite) || [];
  const particles       = useSelector(s => s.particles.particles) || [];
  const allConfigs      = useSelector(s => s.satellites.satellitesConfig) || [];
  const groundStations  = useSelector(s => s.groundStations.groundStations) || [];
  // TSDB-backed trace points for this satellite
  const { combined: mainTracePoints } = useTracePoints(satelliteId);
  // TSDB-backed visible trace points for all satellites (used for other-sat positions)
  const visibleTracePoints = useSelector(s => s.particles.visibleTracePoints) || {};
  const showLinkLines   = useSelector(s => s.view.showLinkLines !== false);
  const showBodyFrameAxes = useSelector(s => s.view.showBodyFrameAxes !== false);
  const view            = useSelector(s => s.view);
  // NOTE: RenderTime and starttime are read from store.getState() inside useFrame
  // to avoid stale closure issues during manual time scrubbing.

  const dayTex    = useLoader(THREE.TextureLoader, '/8081_earthmap10k.jpg');
  const nightTex  = useLoader(THREE.TextureLoader, '/8081_earthlights10k.jpg');
  const cloudsTex = useLoader(THREE.TextureLoader, '/earthcloudmap.jpg');

  // Enhance texture quality for the zoomed satellite-frame view
  const { gl, size, clock } = useThree();
  useMemo(() => {
    const maxAniso = gl.capabilities.getMaxAnisotropy();
    [dayTex, nightTex, cloudsTex].forEach(tex => {
      tex.anisotropy = maxAniso;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = true;
      tex.needsUpdate = true;
    });
  }, [dayTex, nightTex, cloudsTex, gl]);

  // Keep LineMaterial resolution in sync with canvas size
  useEffect(() => {
    lvlhLinkMat.resolution.set(size.width, size.height);
  }, [size.width, size.height, lvlhLinkMat]);

  const thisConfig   = allConfigs.find(c => c.id === satelliteId);
  const thisParticle = particles.find(p => p.id === satelliteId);
  const thisSat      = satellites.find(s => s.id === satelliteId);

  useFrame(() => {
    // ── Read RenderTime and starttime fresh from store every frame ──
    // This prevents stale-closure issues when the user scrubs manually.
    const _timerState = store.getState().timer;
    const RenderTime  = _timerState?.RenderTime ?? 0;
    const starttime   = _timerState?.starttime ?? 0;

    /* ── 1. Resolve position, velocity, attitude ──────────── */
    let satPos   = null;
    let velKms   = null;
    let velScene = null;
    let attQ     = null;

    if (mainTracePoints?.length) {
      const pts = mainTracePoints;
      const idx = findLastIndexLE(pts, RenderTime);
      const best = idx >= 0 ? pts[idx] : null;
      if (best && [best.x, best.y, best.z].every(Number.isFinite)) {
        satPos = [best.x, best.y, best.z];
        if (best.vx != null && best.vy != null && best.vz != null) {
          velKms = [best.vx, best.vy, best.vz];
        } else {
          velScene = estimateVelocity(pts, idx);
        }
        if (best.qx != null && best.qw != null) {
          attQ = [best.qx, best.qy, best.qz, best.qw];
        }
        // Extract component angles for the main satellite
        if (best.componentAngles) {
          mainComponentAnglesRef.current = best.componentAngles;
        }
      }
    }

    if (!satPos && thisSat?.coordinates) {
      const c = thisSat.coordinates;
      if ([c.x, c.y, c.z].every(Number.isFinite)) satPos = [c.x, c.y, c.z];
    }
    if (!velKms && !velScene && thisSat?.velocity && Array.isArray(thisSat.velocity)) {
      velKms = thisSat.velocity;
    }
    if (!attQ && thisSat?.attitude?.quaternion) {
      attQ = thisSat.attitude.quaternion;
    }

    const vel = velKms || velScene;
    if (!satPos || !vel) return;

    /* ── 2. Compute LVLH basis ──────────────────────────── */
    const basis = lvlhBasis(satPos, vel);

    /* ── 3. Earth position + rotation in LVLH ────────────── */
    const earthLVLH = eci2lvlh([0, 0, 0], satPos, basis);

    if (earthRef.current) {
      earthRef.current.position.set(earthLVLH[0], earthLVLH[1], earthLVLH[2]);
      const gmst = computeGMSTFromSim(starttime, RenderTime);
      const qGMST = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(Math.PI / 2, gmst, 0),
      );
      const qLVLH2ECI = lvlhQuat(basis);
      const qECI2LVLH = qLVLH2ECI.clone().conjugate();
      earthRef.current.quaternion.copy(qECI2LVLH.clone().multiply(qGMST));
    }


    if (haloRef.current) {
      haloRef.current.position.set(earthLVLH[0], earthLVLH[1], earthLVLH[2]);
    }

    /* ── 4. Sun direction + sun mesh in LVLH ─────────────── */
    const sunECI = sunDirectionECIFromSim(starttime, RenderTime);
    const sunLVLH = dirECI2LVLH(sunECI, basis);
    sunDirLVLHRef.current = sunLVLH;

    if (lightRef.current) {
      lightRef.current.position.set(
        sunLVLH[0] * 10, sunLVLH[1] * 10, sunLVLH[2] * 10,
      );
    }
    // Sun sphere (far away, same direction as light)
    const sunDist = 500;
    if (sunRef.current) {
      sunRef.current.position.set(
        sunLVLH[0] * sunDist, sunLVLH[1] * sunDist, sunLVLH[2] * sunDist,
      );
      // Update sun shader time uniform
      if (sunRef.current.material?.uniforms?.time) {
        sunRef.current.material.uniforms.time.value = clock.getElapsedTime();
      }
    }
    if (sunHaloRef.current) {
      sunHaloRef.current.position.set(
        sunLVLH[0] * sunDist, sunLVLH[1] * sunDist, sunLVLH[2] * sunDist,
      );
    }

    /* ── 5. Satellite body attitude ──────────────────────── */
    if (bodyRef.current) {
      if (attQ) {
        // q_Body→ECI from backend attitude computation
        const qBodyECI  = new THREE.Quaternion(attQ[0], attQ[1], attQ[2], attQ[3]);

        // q_LVLH→ECI from the current pos/vel basis
        const qLVLH2ECI = lvlhQuat(basis);

        // q_Body→LVLH = inv(q_LVLH→ECI) * q_Body→ECI
        const qECI2LVLH = qLVLH2ECI.clone().conjugate();
        const qBodyLVLH = qECI2LVLH.clone().multiply(qBodyECI);

        bodyRef.current.quaternion.copy(qBodyLVLH);
      } else {
        bodyRef.current.quaternion.set(0, 0, 0, 1);
      }
    }

    /* ── 6. Other satellites in LVLH (from tracePoints) ──── */
    const newOtherAngles = {};
    particles.forEach(oPart => {
      if (oPart.id === satelliteId) return;
      const ref = otherSatRefs.current[oPart.id];
      if (!ref) return;

      // Prefer TSDB visible trace points, fall back to legacy
      const tsPts = visibleTracePoints?.[oPart.id];
      const oPts = tsPts?.length ? tsPts : oPart.tracePoints;
      if (!oPts?.length) { ref.visible = false; return; }
      const oIdx = findLastIndexLE(oPts, RenderTime);
      if (oIdx < 0) { ref.visible = false; return; }
      const oSnap = oPts[oIdx];
      if (![oSnap.x, oSnap.y, oSnap.z].every(Number.isFinite)) { ref.visible = false; return; }

      ref.visible = true;
      const oECI = [oSnap.x, oSnap.y, oSnap.z];
      const oLVLH = eci2lvlh(oECI, satPos, basis);
      ref.position.set(oLVLH[0], oLVLH[1], oLVLH[2]);

      // Attitude: q_Body→ECI from tracePoint, then transform to LVLH
      if (oSnap.qx != null && oSnap.qw != null) {
        const qBodyECI  = new THREE.Quaternion(oSnap.qx, oSnap.qy, oSnap.qz, oSnap.qw);
        const qLVLH2ECI = lvlhQuat(basis);
        const qECI2LVLH = qLVLH2ECI.clone().conjugate();
        const qBodyLVLH = qECI2LVLH.clone().multiply(qBodyECI);
        ref.quaternion.copy(qBodyLVLH);
      } else {
        ref.quaternion.set(0, 0, 0, 1);
      }

      // Track component angles for other sats
      if (oSnap.componentAngles) {
        newOtherAngles[oPart.id] = oSnap.componentAngles;
      }
    });
    otherSatComponentAnglesRef.current = newOtherAngles;

    // Throttled sync: push ref values into React state only when changed
    // so SatelliteBodyModel re-renders with updated angles without
    // triggering every single frame.
    const mainJson = JSON.stringify(mainComponentAnglesRef.current);
    if (mainJson !== mainAnglesJsonRef.current) {
      mainAnglesJsonRef.current = mainJson;
      setMainComponentAngles(mainComponentAnglesRef.current);
    }
    const otherJson = JSON.stringify(otherSatComponentAnglesRef.current);
    if (otherJson !== otherAnglesJsonRef.current) {
      otherAnglesJsonRef.current = otherJson;
      setOtherSatComponentAngles(otherSatComponentAnglesRef.current);
    }

    /* ── 7. Ground stations in LVLH ──────────────────────── */
    const gmst = computeGMSTFromSim(starttime, RenderTime);
    groundStations.forEach(gs => {
      const ref = gsRefs.current[gs.id];
      if (!ref) return;
      const latRad = gs.lat * Math.PI / 180;
      const lonRad = gs.lon * Math.PI / 180;
      const r = (6378.137 + (gs.altKm || 0)) / SCALE;
      // Ground station ECI position (rotate from ECEF by GMST)
      const gx = r * Math.cos(latRad) * Math.cos(lonRad + gmst);
      const gy = r * Math.cos(latRad) * Math.sin(lonRad + gmst);
      const gz = r * Math.sin(latRad);
      const gsLVLH = eci2lvlh([gx, gy, gz], satPos, basis);
      ref.position.set(gsLVLH[0], gsLVLH[1], gsLVLH[2]);
    });

    /* ── 8. Communication link lines in LVLH ───────────── */
    let linkCount = 0;
    if (showLinkLines) {
      // ══════════════════════════════════════════════════════════
      // SINGLE SOURCE OF TRUTH: getLinksAtTimeFromStore
      // Same function used by ConnectivityLinks (3D) and 2D map.
      // ══════════════════════════════════════════════════════════
      const { connections, mode: linkMode, hasData } = getLinksAtTimeFromStore(store, RenderTime);

      // Update line color based on mode (yellow=connected, cyan=available)
      if (linkMode !== lastLinkModeRef.current) {
        lastLinkModeRef.current = linkMode;
        lvlhLinkMat.color.set(linkMode === 'connected' ? 0xffeb3b : 0x38bdf8);
      }

      if (hasData) {
        // Read fresh position data from store for link endpoint resolution
        const _linkState = store.getState();
        const _particles = _linkState.particles?.particles || [];
        const _satStates = _linkState.CurrentState?.satelite || [];
        const _gs        = _linkState.groundStations?.groundStations || [];
        const _visTp     = _linkState.particles?.visibleTracePoints || {};

        for (let i = 0; i < connections.length && linkCount < MAX_LVLH_LINKS; i++) {
          const conn = connections[i];
          const fromPos = resolveParentPosScene(conn.txParentId, RenderTime, _particles, _satStates, _gs, starttime, _visTp);
          const toPos = resolveParentPosScene(conn.rxParentId, RenderTime, _particles, _satStates, _gs, starttime, _visTp);
          if (!fromPos || !toPos) continue;
          const fromLVLH = eci2lvlh(fromPos, satPos, basis);
          const toLVLH = eci2lvlh(toPos, satPos, basis);
          const base = linkCount * 6;
          lvlhLinkPositions[base]     = fromLVLH[0];
          lvlhLinkPositions[base + 1] = fromLVLH[1];
          lvlhLinkPositions[base + 2] = fromLVLH[2];
          lvlhLinkPositions[base + 3] = toLVLH[0];
          lvlhLinkPositions[base + 4] = toLVLH[1];
          lvlhLinkPositions[base + 5] = toLVLH[2];
          linkCount++;
        }
      }
    }
    // Update Line2 geometry
    if (lvlhLinkSegRef.current) {
      if (linkCount > 0) {
        lvlhLinkGeo.setPositions(lvlhLinkPositions.subarray(0, linkCount * 6));
        lvlhLinkSegRef.current.geometry = lvlhLinkGeo;
        lvlhLinkSegRef.current.computeLineDistances();
      }
      lvlhLinkSegRef.current.visible = linkCount > 0;
    }
  });

  /* ── JSX ───────────────────────────────────────────────────── */
  return (
    <>
      <Stars radius={300} depth={50} count={20000} factor={7} saturation={0} fade speed={1} />

      {/* Ambient light — toggled from side panel (same as GlobeRender) */}
      {view.AmbientLight && <ambientLight intensity={1} />}

      {/* Sun directional light */}
      <directionalLight ref={lightRef} position={[5, 0, 5]} intensity={1} />

      {/* Sun sphere (matches GlobeRender) */}
      <mesh ref={sunRef}>
        <sphereGeometry args={[10, 64, 64]} />
        <shaderMaterial
          vertexShader={sunVertexShader}
          fragmentShader={sunFragmentShader}
          uniforms={{ time: { value: 0 } }}
        />
      </mesh>
      {/* Sun glow halo */}
      <mesh ref={sunHaloRef}>
        <sphereGeometry args={[14, 32, 32]} />
        <meshBasicMaterial color="#ffcc00" transparent opacity={0.08} side={THREE.BackSide} />
      </mesh>

      {/* Earth — custom shader for realistic day/night */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[2, 256, 256]} />
        <EarthMaterial
          dayMap={dayTex}
          nightMap={nightTex}
          cloudsMap={cloudsTex}
          sunDirection={sunDirLVLHRef.current}
          cloudsOpacity={0.35}
        />
      </mesh>

      {/* Atmosphere glow */}
      <mesh ref={haloRef} scale={[1.01, 1.01, 1.01]}>
        <sphereGeometry args={[2, 128, 128]} />
        <shaderMaterial
          vertexShader={glowVS}
          fragmentShader={glowFS}
          uniforms={{ c: { value: 1.0 }, p: { value: 6.0 } }}
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
          transparent={true}
        />
      </mesh>

      {/* ── Other satellites (3D body + attitude) ─────────── */}
      {particles.filter(p => p.id !== satelliteId).map(oPart => {
        const cfg = allConfigs.find(c => c.id === oPart.id);
        return (
          <group
            key={oPart.id}
            ref={el => { if (el) otherSatRefs.current[oPart.id] = el; }}
            scale={[0.6, 0.6, 0.6]}
          >
            <SatelliteBodyModel
              shape={cfg?.bodyFrame?.bodyShape || 'rectangle'}
              color={cfg?.color || '#facc15'}
              scale={1}
              emissive={false}
              showAxes={showBodyFrameAxes}
              components={cfg?.bodyFrame?.components || []}
              componentAngles={otherSatComponentAngles[oPart.id] || {}}
            />
          </group>
        );
      })}

      {/* ── Ground stations ────────────────────────────────── */}
      {groundStations.map(gs => (
        <group
          key={gs.id}
          ref={el => { if (el) gsRefs.current[gs.id] = el; }}
          scale={[0.06, 0.06, 0.06]}
        >
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
          <mesh position={[0, 0, 0.08]}>
            <coneGeometry args={[0.04, 0.06, 8]} />
            <meshStandardMaterial color="#c0c0c0" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Antenna base */}
          <mesh position={[0, 0, 0.07]}>
            <cylinderGeometry args={[0.01, 0.01, 0.02]} />
            <meshStandardMaterial color="#555555" />
          </mesh>
        </group>
      ))}

      {/* ── Communication link lines (thick Line2) ──────────── */}
      <primitive ref={lvlhLinkSegRef} object={lvlhLinkSegObj} />

      {/* ── Satellite body at LVLH origin ───────────────────── */}
      <group ref={bodyRef} scale={[0.6, 0.6, 0.6]}>
        <SatelliteBodyModel
          shape={thisConfig?.bodyFrame?.bodyShape || 'rectangle'}
          color={thisConfig?.color || '#00ffff'}
          scale={1}
          emissive={showGlow}
          showAxes={showBodyFrameAxes}
          components={thisConfig?.bodyFrame?.components || []}
          componentAngles={mainComponentAngles}
        />
      </group>

      {/* OrbitControls */}
      <OrbitControls
        target={[0, 0, 0]}
        enableZoom
        enablePan={false}
        enableRotate
        minDistance={0.2}
        maxDistance={12}
        zoomSpeed={0.8}
        rotateSpeed={0.5}
      />

      <PerspectiveCamera
        makeDefault
        position={[0.3, 0.8, -0.4]}
        up={[0, 0, -1]}
        fov={60}
        near={0.001}
        far={1000}
      />
    </>
  );
};

/* ─── Wrapper with overlay button ────────────────────────────── */
const BodyFrameView = ({ satelliteId }) => {
  const [showGlow, setShowGlow] = useState(false);

  return (
    <div style={{ width: '100%', height: '100%', background: '#000', position: 'relative' }}>
      <Canvas gl={{ preserveDrawingBuffer: true }}>
        <BodyFrameScene satelliteId={satelliteId} showGlow={showGlow} />
      </Canvas>

      {/* Top label */}
      <div style={{
        position: 'absolute', top: 8, left: 12,
        color: '#8f94fb', fontSize: 11, fontWeight: 600,
        pointerEvents: 'none', zIndex: 10,
      }}>
        SATELLITE FRAME · LVLH
      </div>

      {/* Glow toggle button */}
      <button
        onClick={() => setShowGlow(prev => !prev)}
        title={showGlow ? 'Disable satellite self-light' : 'Enable satellite self-light'}
        style={{
          position: 'absolute',
          top: 8,
          right: 12,
          zIndex: 10,
          background: showGlow ? 'rgba(138,130,251,0.5)' : 'rgba(40,40,60,0.7)',
          border: '1px solid rgba(138,130,251,0.4)',
          borderRadius: 6,
          color: showGlow ? '#fff' : '#8f94fb',
          fontSize: 11,
          fontWeight: 600,
          padding: '4px 10px',
          cursor: 'pointer',
          backdropFilter: 'blur(6px)',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
        }}
      >
        <span style={{ fontSize: 13 }}>{showGlow ? '💡' : '🔦'}</span>
        {showGlow ? 'Light ON' : 'Light OFF'}
      </button>
    </div>
  );
};

export default BodyFrameView;
