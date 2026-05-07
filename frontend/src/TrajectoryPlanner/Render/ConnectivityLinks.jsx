/**
 * ConnectivityLinks — Renders communication link lines that update every
 * animation frame by reading link data directly from the store.
 *
 * ARCHITECTURE: Uses getLinksAtTimeFromStore() as the SINGLE SOURCE OF TRUTH.
 * This ensures strict consistency with all other views (LVLH, 2D map, timeline).
 * The linkDisplayMode in Redux controls whether we show "connected" or "available" links.
 *
 * NO fallback paths. NO stale closures. ONE code path for all modes.
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useSelector, useStore } from 'react-redux';
import * as THREE from 'three';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { computeGMSTFromSim, geodeticToSceneECI } from '../../transforms';
import { getLinksAtTimeFromStore } from '../../hooks/useLinkDisplayData';

const MAX_LINKS = 64; // Max simultaneous connections we can render

/* ── Binary search on trace points (sorted by .time) ─────────── */
function findTracePos(pts, t) {
  if (!pts || !pts.length) return null;
  let lo = 0, hi = pts.length - 1;
  if (t <= pts[0].time) { const p = pts[0]; return [p.x, p.y, p.z]; }
  if (t >= pts[hi].time) { const p = pts[hi]; return [p.x, p.y, p.z]; }
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (pts[mid].time <= t) lo = mid; else hi = mid - 1;
  }
  const p = pts[lo];
  return [p.x, p.y, p.z]; // scene units (already divided by SCALE_FACTOR)
}

/* ── Resolve satellite or ground-station position at time t ──── */
function resolveParentPos(parentId, t, particlesRef, currentStatesRef, groundStationsRef, starttime, visibleTracePointsRef) {
  if (parentId.startsWith('sat-')) {
    const numId = parseFloat(parentId.replace('sat-', ''));
    // 1. Prefer TSDB visibleTracePoints (high-res ±60 s window)
    const visPts = visibleTracePointsRef?.current?.[numId];
    if (visPts?.length) {
      const pos = findTracePos(visPts, t);
      if (pos) return pos;
    }
    // 2. Legacy: particles[i].tracePoints (full in-Redux)
    const particles = particlesRef.current;
    if (particles) {
      for (let i = 0; i < particles.length; i++) {
        if (particles[i].id === numId) {
          const pts = particles[i].tracePoints;
          const pos = findTracePos(pts, t);
          if (pos) return pos;
          break;
        }
      }
    }
    // 3. Fallback: CurrentState
    const states = currentStatesRef.current;
    if (states) {
      for (let i = 0; i < states.length; i++) {
        if (states[i].id === numId && states[i].coordinates) {
          const c = states[i].coordinates;
          return [c.x, c.y, c.z]; // already scene units
        }
      }
    }
    return null;
  }

  // Ground station — geodetic → ECI scene units
  const gsList = groundStationsRef.current;
  if (!gsList) return null;
  const gs = gsList.find(g => g.id === parentId);
  if (!gs) return null;
  const utcMs = starttime + t * 1000;
  return geodeticToSceneECI({ lat: gs.lat, lon: gs.lon, alt: gs.altKm || 0 }, utcMs);
}

/* ── ECI → ECEF rotation ─────────────────────────────────────── */
function rotateECEF(pos, gmst) {
  const c = Math.cos(-gmst), s = Math.sin(-gmst);
  return [c * pos[0] - s * pos[1], s * pos[0] + c * pos[1], pos[2]];
}


const ConnectivityLinks = () => {
  const showLinkLines = useSelector(s => s.view.showLinkLines !== false);
  const referenceSystem = useSelector(s => s.view.ReferenceSystem);

  // Use useStore() for ALL frequently-changing data read inside useFrame.
  // This avoids re-rendering the component when Redux dispatches new data.
  const store = useStore();

  // Refs for position data (updated inside useFrame from store)
  const particlesRef = useRef([]);
  const currentStatesRef = useRef([]);
  const groundStationsRef = useRef([]);
  const visibleTracePointsRef = useRef({});

  // ── Thick-line setup using Three.js Line2 addon ──────────
  const { size } = useThree();
  const linePositions = useMemo(() => new Float32Array(MAX_LINKS * 6), []);
  const linkCountRef = useRef(0);

  // Create LineSegments2 with LineMaterial imperatively
  const lineSegRef = useRef();
  const lineMat = useMemo(() => new LineMaterial({
    color: 0xffeb3b,
    linewidth: 3,          // in pixels — works with LineMaterial!
    transparent: true,
    opacity: 0.95,
    depthTest: true,
    worldUnits: false,     // screen-space pixel width
  }), []);
  const lineGeo = useMemo(() => new LineSegmentsGeometry(), []);

  // Keep resolution uniform in sync with canvas size
  useEffect(() => {
    lineMat.resolution.set(size.width, size.height);
  }, [size.width, size.height, lineMat]);

  // Endpoint marker refs — use instanced mesh for efficiency
  const fromMarkerRef = useRef();
  const toMarkerRef = useRef();
  const dummyObj = useMemo(() => new THREE.Object3D(), []);
  const lineSegObj = useMemo(() => new LineSegments2(lineGeo, lineMat), [lineGeo, lineMat]);

  // Color refs to switch between connected (yellow) and available (cyan)
  const lastModeRef = useRef('connected');

  useFrame(() => {
    if (!showLinkLines) {
      if (lineSegRef.current) lineSegRef.current.visible = false;
      if (fromMarkerRef.current) fromMarkerRef.current.visible = false;
      if (toMarkerRef.current) toMarkerRef.current.visible = false;
      return;
    }

    // Read frequently-changing data from store directly (no selector re-renders)
    const _state = store.getState();
    const RenderTime = _state.timer?.RenderTime ?? 0;
    const starttime  = _state.timer?.starttime ?? 0;
    particlesRef.current = _state.particles?.particles || [];
    currentStatesRef.current = _state.CurrentState?.satelite || [];
    groundStationsRef.current = _state.groundStations?.groundStations || [];
    visibleTracePointsRef.current = _state.particles?.visibleTracePoints || {};

    // ══════════════════════════════════════════════════════════
    // SINGLE SOURCE OF TRUTH: getLinksAtTimeFromStore
    // This reads linkDisplayMode and returns the right data.
    // NO fallback paths. NO stale closures. ONE code path.
    // ══════════════════════════════════════════════════════════
    const { connections, mode, hasData } = getLinksAtTimeFromStore(store, RenderTime);

    // Update line color based on mode (yellow=connected, cyan=available)
    if (mode !== lastModeRef.current) {
      lastModeRef.current = mode;
      lineMat.color.set(mode === 'connected' ? 0xffeb3b : 0x38bdf8);
    }

    const isFixed = referenceSystem === 'EarthFixed';
    let gmst = 0;
    if (isFixed) gmst = computeGMSTFromSim(starttime, RenderTime);

    let count = 0;

    if (hasData) {
      for (let i = 0; i < connections.length && count < MAX_LINKS; i++) {
        const conn = connections[i];
        let fromPos = resolveParentPos(conn.txParentId, RenderTime, particlesRef, currentStatesRef, groundStationsRef, starttime, visibleTracePointsRef);
        let toPos = resolveParentPos(conn.rxParentId, RenderTime, particlesRef, currentStatesRef, groundStationsRef, starttime, visibleTracePointsRef);
        if (!fromPos || !toPos) continue;

        if (isFixed) {
          fromPos = rotateECEF(fromPos, gmst);
          toPos = rotateECEF(toPos, gmst);
        }

        const base = count * 6;
        linePositions[base]     = fromPos[0];
        linePositions[base + 1] = fromPos[1];
        linePositions[base + 2] = fromPos[2];
        linePositions[base + 3] = toPos[0];
        linePositions[base + 4] = toPos[1];
        linePositions[base + 5] = toPos[2];

        // Update instanced markers
        if (fromMarkerRef.current) {
          dummyObj.position.set(fromPos[0], fromPos[1], fromPos[2]);
          dummyObj.updateMatrix();
          fromMarkerRef.current.setMatrixAt(count, dummyObj.matrix);
        }
        if (toMarkerRef.current) {
          dummyObj.position.set(toPos[0], toPos[1], toPos[2]);
          dummyObj.updateMatrix();
          toMarkerRef.current.setMatrixAt(count, dummyObj.matrix);
        }

        count++;
      }
    }

    linkCountRef.current = count;

    // Update Line2 geometry — setPositions expects flat [x,y,z, x,y,z, ...]
    if (lineSegRef.current) {
      if (count > 0) {
        // Feed only the used portion of the buffer
        const usedPositions = linePositions.subarray(0, count * 6);
        lineGeo.setPositions(usedPositions);
        lineSegRef.current.geometry = lineGeo;
        lineSegRef.current.computeLineDistances();
      }
      lineSegRef.current.visible = count > 0;
    }

    // Update instanced markers visibility
    if (fromMarkerRef.current) {
      fromMarkerRef.current.count = count;
      fromMarkerRef.current.instanceMatrix.needsUpdate = true;
      fromMarkerRef.current.visible = count > 0;
    }
    if (toMarkerRef.current) {
      toMarkerRef.current.count = count;
      toMarkerRef.current.instanceMatrix.needsUpdate = true;
      toMarkerRef.current.visible = count > 0;
    }
  });

  return (
    <group>
      {/* Thick line segments via Line2 addon — supports real pixel width */}
      <primitive ref={lineSegRef} object={lineSegObj} />

      {/* Instanced endpoint markers */}
      <instancedMesh ref={fromMarkerRef} args={[undefined, undefined, MAX_LINKS]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color="#ffeb3b" transparent opacity={0.6} />
      </instancedMesh>
      <instancedMesh ref={toMarkerRef} args={[undefined, undefined, MAX_LINKS]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color="#ffeb3b" transparent opacity={0.6} />
      </instancedMesh>
    </group>
  );
};

export default ConnectivityLinks;
