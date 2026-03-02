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

export const getEndpointPos = (id, currentStates, groundStations, particles, renderTime, starttime) => {
  if (id.startsWith('sat-')) {
    const numId = parseFloat(id.replace('sat-', ''));
    // Prefer trace-point lookup (works during playback)
    const particle = particles.find((p) => p.id === numId);
    if (particle?.tracePoints?.length) {
      for (let i = particle.tracePoints.length - 1; i >= 0; i--) {
        if (particle.tracePoints[i].time <= renderTime) {
          const tp = particle.tracePoints[i];
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

export const computeLink = (cfg, { currentStates, groundStations, particles, renderTime, starttime }) => {
  const p = { ...defaultParams, ...cfg };
  const txPos = getEndpointPos(p.txId, currentStates, groundStations, particles, renderTime, starttime);
  const rxPos = getEndpointPos(p.rxId, currentStates, groundStations, particles, renderTime, starttime);
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
    inLink = elevationDeg >= (p.minElevationDeg ?? 10);
  }

  // Sat ↔ Sat  →  Earth occlusion check
  if (!txIsGround && !rxIsGround) {
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
