/**
 * Shared link-budget computation utilities.
 * Extracted from LinkBudgetPanel / LinkBudgetBoard to avoid duplication.
 */

import { computeGMST, geodeticToSceneECI, SCALE_FACTOR } from '../../../transforms';

export const SPEED_OF_LIGHT = 299792458;
export const PLANCK = 6.62607015e-34;
const EARTH_RADIUS_KM = 6378.137;

export const defaultParams = {
  wavelengthNm: 1550,
  txPowerMw: 300,
  txAperture: 0.15,
  rxAperture: 0.5,
  pointingLoss: 2,
  atmosphericLoss: 1.5,
  marginDb: 2,
  noiseFloor: -95,
  requiredSnr: 10,
  minElevationDeg: 10,
};

/* ── Helper math ──────────────────────────────────────────────── */

export const apertureGainDb = (diameterMeters, wavelengthNm) => {
  if (!diameterMeters || diameterMeters <= 0) return 0;
  const wavelength = wavelengthNm * 1e-9;
  const g = (Math.PI * diameterMeters) / wavelength;
  return 10 * Math.log10(g * g);
};

export const fsplDb = (distanceMeters, wavelengthNm) => {
  if (!distanceMeters || distanceMeters <= 0) return 0;
  const wavelength = wavelengthNm * 1e-9;
  return 20 * Math.log10((4 * Math.PI * distanceMeters) / wavelength);
};

export const formatNumber = (v, digits = 2) => {
  if (v === undefined || v === null || Number.isNaN(v)) return '—';
  if (Math.abs(v) >= 1e4 || (Math.abs(v) <= 1e-2 && v !== 0)) return v.toExponential(2);
  return v.toFixed(digits);
};

/* ── Position helpers ─────────────────────────────────────────── */

export const getEndpointPos = (id, currentStates, groundStations, particles, renderTime, starttime, visibleTracePoints = {}) => {
  if (id.startsWith('sat-')) {
    const numId = parseFloat(id.replace('sat-', ''));
    // Prefer TSDB visibleTracePoints (high-res ±60s) → legacy → CurrentState
    const tsPts = visibleTracePoints[numId];
    const particle = particles.find((p) => p.id === numId);
    const pts = tsPts?.length ? tsPts : particle?.tracePoints;
    if (pts?.length) {
      for (let i = pts.length - 1; i >= 0; i--) {
        if (pts[i].time <= renderTime) {
          const tp = pts[i];
          return { x: tp.x * SCALE_FACTOR, y: tp.y * SCALE_FACTOR, z: tp.z * SCALE_FACTOR };
        }
      }
    }
    // Fallback: CurrentState
    const st = currentStates.find((s) => s.id === numId);
    if (!st?.coordinates) return null;
    return {
      x: st.coordinates.x * SCALE_FACTOR,
      y: st.coordinates.y * SCALE_FACTOR,
      z: st.coordinates.z * SCALE_FACTOR,
    };
  }
  // Ground station
  const gs = groundStations.find((g) => g.id === id);
  if (!gs) return null;
  const utcMs = starttime + renderTime * 1000;
  const p = geodeticToSceneECI({ lat: gs.lat, lon: gs.lon, alt: gs.altKm || 0 }, utcMs);
  return { x: p[0] * SCALE_FACTOR, y: p[1] * SCALE_FACTOR, z: p[2] * SCALE_FACTOR };
};

/* ── Full link computation ────────────────────────────────────── */

export const computeLink = (cfg, { currentStates, groundStations, particles, renderTime, starttime, globalThresholds, visibleTracePoints }) => {
  const globals = globalThresholds || {};
  const p = { ...defaultParams, ...cfg };
  // Apply global thresholds as fallback: per-link values override globals.
  // Must check cfg (raw) instead of p (merged with defaults), because p
  // always has minElevationDeg=10 from defaultParams and ?? won't skip it.
  const effectiveMinElev = cfg.minElevationDeg != null ? cfg.minElevationDeg
    : globals.minElevationDeg != null ? globals.minElevationDeg : 10;
  const effectiveMaxDistKm = cfg.maxDistanceKm != null ? cfg.maxDistanceKm
    : globals.maxDistanceKm != null ? globals.maxDistanceKm : null;
  const txPos = getEndpointPos(p.txId, currentStates, groundStations, particles, renderTime, starttime, visibleTracePoints);
  const rxPos = getEndpointPos(p.rxId, currentStates, groundStations, particles, renderTime, starttime, visibleTracePoints);
  if (!txPos || !rxPos) return { ready: false, id: cfg.id, txId: p.txId, rxId: p.rxId };

  const dx = rxPos.x - txPos.x;
  const dy = rxPos.y - txPos.y;
  const dz = rxPos.z - txPos.z;
  const rangeKm = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const rangeM = rangeKm * 1000;

  const fspl = fsplDb(rangeM, p.wavelengthNm);
  const txGain = apertureGainDb(p.txAperture, p.wavelengthNm);
  const rxGain = apertureGainDb(p.rxAperture, p.wavelengthNm);
  const channelLoss = fspl + p.pointingLoss + p.atmosphericLoss + p.marginDb - txGain - rxGain;
  const txPowerDbm = 10 * Math.log10(p.txPowerMw);
  const rxPowerDbm = txPowerDbm - channelLoss;
  const snrDb = rxPowerDbm - p.noiseFloor;
  const linkMargin = snrDb - p.requiredSnr;

  const wavelengthM = p.wavelengthNm * 1e-9;
  const photonEnergy = PLANCK * (SPEED_OF_LIGHT / wavelengthM);
  const rxPowerW = (p.txPowerMw / 1000) * Math.pow(10, -channelLoss / 10);
  const receivedPhotonRate = rxPowerW / photonEnergy;
  const dataRateBps = receivedPhotonRate > 0 ? receivedPhotonRate * snrDb : 0;
  const dataRateMbps = dataRateBps / 1e6;

  // Elevation / LOS check
  const txIsGround = !p.txId.startsWith('sat-');
  const rxIsGround = !p.rxId.startsWith('sat-');
  let elevationDeg = null;
  let inLink = true;

  // Ground ↔ Sat  →  elevation check
  if (txIsGround !== rxIsGround) {
    const groundId = txIsGround ? p.txId : p.rxId;
    const satPos = txIsGround ? rxPos : txPos;
    const groundPos = txIsGround ? txPos : rxPos;
    const gs = groundStations.find((g) => g.id === groundId);
    if (!gs) return { ready: false, id: cfg.id, txId: p.txId, rxId: p.rxId };

    const latRad = (gs.lat * Math.PI) / 180;
    const lonRad = (gs.lon * Math.PI) / 180;
    const utcMs = starttime + renderTime * 1000;
    const gmst = computeGMST(utcMs);
    const enuLon = lonRad + gmst;

    const dxg = satPos.x - groundPos.x;
    const dyg = satPos.y - groundPos.y;
    const dzg = satPos.z - groundPos.z;
    const sinLat = Math.sin(latRad);
    const cosLat = Math.cos(latRad);
    const sinLon = Math.sin(enuLon);
    const cosLon = Math.cos(enuLon);
    const east = -sinLon * dxg + cosLon * dyg;
    const north = -sinLat * cosLon * dxg - sinLat * sinLon * dyg + cosLat * dzg;
    const up = cosLat * cosLon * dxg + cosLat * sinLon * dyg + sinLat * dzg;
    const horiz = Math.sqrt(east * east + north * north);
    elevationDeg = Math.atan2(up, horiz) * (180 / Math.PI);
    inLink = elevationDeg >= effectiveMinElev;
  }

  // Max distance check (global + per-link)
  if (inLink && effectiveMaxDistKm != null && rangeKm > effectiveMaxDistKm) {
    inLink = false;
  }

  // Sat ↔ Sat  →  Earth occlusion check
  if (inLink && !txIsGround && !rxIsGround) {
    const vx = rxPos.x - txPos.x;
    const vy = rxPos.y - txPos.y;
    const vz = rxPos.z - txPos.z;
    const wx = -txPos.x;
    const wy = -txPos.y;
    const wz = -txPos.z;
    const vDotV = vx * vx + vy * vy + vz * vz;
    const wDotV = wx * vx + wy * vy + wz * vz;
    const t = Math.max(0, Math.min(1, wDotV / vDotV));
    const cx = txPos.x + t * vx;
    const cy = txPos.y + t * vy;
    const cz = txPos.z + t * vz;
    const closestDist = Math.sqrt(cx * cx + cy * cy + cz * cz);
    inLink = closestDist > EARTH_RADIUS_KM;
  }

  return {
    ready: true,
    id: cfg.id,
    txId: p.txId,
    rxId: p.rxId,
    rangeKm,
    fspl,
    txGain,
    rxGain,
    channelLoss,
    rxPowerDbm,
    snrDb,
    linkMargin,
    receivedPhotonRate,
    dataRateMbps,
    elevationDeg,
    inLink,
  };
};

/* ── Endpoint helpers ─────────────────────────────────────────── */

export const buildEndpoints = (satellites, groundStations) => {
  const sats = satellites.map((sat) => ({
    id: `sat-${sat.id}`,
    label: sat.name || `Satellite ${sat.id}`,
    type: 'sat',
    color: sat.color || '#38bdf8',
  }));
  const gs = groundStations.map((g) => ({
    id: g.id,
    label: g.name || g.id,
    type: 'ground',
    color: '#f59e0b',
  }));
  return [...sats, ...gs];
};

export const nameFor = (id, satellites, groundStations) => {
  if (!id) return 'Unknown';
  if (id.startsWith('sat-')) {
    const sat = satellites.find((s) => `sat-${s.id}` === id);
    return sat?.name || id;
  }
  const gs = groundStations.find((g) => g.id === id);
  return gs?.name || id;
};

/* ── Node helpers (Feature 2: Connectivity) ───────────────────── */

/**
 * Build node definitions from satellite configs + ground stations.
 * Each laser terminal on a satellite becomes one node.
 * Each ground station gets one implicit antenna node.
 *
 * @param {Array} satellites — from Redux `satellites.satellitesConfig`
 * @param {Array} groundStations — from Redux `groundStations.groundStations`
 * @returns {Array<{ nodeId, parentId, parentType, componentId, componentType, label }>}
 */
export const buildNodesFromConfig = (satellites, groundStations) => {
  const nodes = [];

  for (const sat of satellites) {
    const lasers = (sat.bodyFrame?.components || []).filter(c => c.type === 'laserPointer');
    for (const laser of lasers) {
      nodes.push({
        nodeId: `sat-${sat.id}:${laser.id}`,
        parentId: `sat-${sat.id}`,
        parentType: 'satellite',
        componentId: laser.id,
        componentType: 'laserPointer',
        label: `${sat.name || 'Sat ' + sat.id} → ${laser.name || laser.id}`,
      });
    }
    // If a satellite has no laser components, add a virtual node
    // so it can still participate in links (backward compat)
    if (lasers.length === 0) {
      nodes.push({
        nodeId: `sat-${sat.id}:default`,
        parentId: `sat-${sat.id}`,
        parentType: 'satellite',
        componentId: null,
        componentType: 'virtual',
        label: `${sat.name || 'Sat ' + sat.id} → Default`,
      });
    }
  }

  for (const gs of groundStations) {
    nodes.push({
      nodeId: `${gs.id}:antenna-0`,
      parentId: gs.id,
      parentType: 'groundStation',
      componentId: null,
      componentType: 'antenna',
      label: `${gs.name || gs.id} → Antenna`,
    });
  }

  return nodes;
};

/**
 * Compute a laser aperture position in scene ECI coordinates.
 *
 * For rendering, the link line should originate from the laser aperture
 * rather than the satellite center. This function computes that position.
 *
 * NOTE: The aperture offset in km is TINY compared to satellite positions
 * (millimeters vs kilometers). At globe scale this is invisible, but in
 * BodyFrameView (zoomed in) it matters visually.
 *
 * @param {Object} satState — satellite state { coordinates: {x,y,z}, ... } (scene units × SCALE_FACTOR)
 * @param {number[]} bodyQuaternion — [qx, qy, qz, qw]
 * @param {Object} comp — component config { positionOffset, parentAxis }
 * @param {{ a1: number, a2: number }} angles — articulation angles in degrees
 * @returns {{ x, y, z }} position in scene ECI (same scale as satState coordinates)
 */
export const computeAperturePosition = (satState, bodyQuaternion, comp, angles) => {
  if (!satState?.coordinates || !bodyQuaternion) return null;

  // If no component offset, just return satellite center position
  const offset = comp?.positionOffset;
  if (!offset || (offset[0] === 0 && offset[1] === 0 && offset[2] === 0)) {
    return {
      x: satState.coordinates.x * SCALE_FACTOR,
      y: satState.coordinates.y * SCALE_FACTOR,
      z: satState.coordinates.z * SCALE_FACTOR,
    };
  }

  // Rotate offset from body frame to ECI using body quaternion
  const rotated = quatRotateVec(bodyQuaternion, offset);

  // satState.coordinates are in scene units, positionOffset is in scene units.
  // Add offset to position in scene space, then multiply by SCALE_FACTOR
  // to return km (same scale as getEndpointPos).
  // The caller (LinkEngine) divides by SCALE_FACTOR to get scene units.
  return {
    x: satState.coordinates.x * SCALE_FACTOR + rotated[0] * SCALE_FACTOR,
    y: satState.coordinates.y * SCALE_FACTOR + rotated[1] * SCALE_FACTOR,
    z: satState.coordinates.z * SCALE_FACTOR + rotated[2] * SCALE_FACTOR,
  };
};

/**
 * Simple quaternion rotation: rotate vector v by unit quaternion q = [qx,qy,qz,qw].
 */
function quatRotateVec(q, v) {
  const [qx, qy, qz, qw] = q;
  const tx = 2 * (qy * v[2] - qz * v[1]);
  const ty = 2 * (qz * v[0] - qx * v[2]);
  const tz = 2 * (qx * v[1] - qy * v[0]);
  return [
    v[0] + qw * tx + (qy * tz - qz * ty),
    v[1] + qw * ty + (qz * tx - qx * tz),
    v[2] + qw * tz + (qx * ty - qy * tx),
  ];
}
