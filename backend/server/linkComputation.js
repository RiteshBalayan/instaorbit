/**
 * Link-budget computation for the InstaOrbit backend.
 *
 * CommonJS port of frontend `src/TrajectoryPlanner/Windows/Sidebar/linkComputation.js`.
 * Operates on raw ECI km positions — no scene units, no Redux, no React.
 */

const transforms = require('./transforms');

const SPEED_OF_LIGHT = 299792458;
const PLANCK = 6.62607015e-34;
const EARTH_RADIUS_KM = 6378.137;

const defaultParams = {
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

/* ── Helper math ─────────────────────────────────────────────── */

function apertureGainDb(diameterMeters, wavelengthNm) {
  if (!diameterMeters || diameterMeters <= 0) return 0;
  const wavelength = wavelengthNm * 1e-9;
  const g = (Math.PI * diameterMeters) / wavelength;
  return 10 * Math.log10(g * g);
}

function fsplDb(distanceMeters, wavelengthNm) {
  if (!distanceMeters || distanceMeters <= 0) return 0;
  const wavelength = wavelengthNm * 1e-9;
  return 20 * Math.log10((4 * Math.PI * distanceMeters) / wavelength);
}

/* ── Position helpers ────────────────────────────────────────── */

/**
 * Resolve an endpoint ID to an ECI position in km.
 *
 * @param {string} id         – 'sat-<num>' or ground-station ID
 * @param {Object} satPositions – { [satNumId]: { x, y, z } } ECI km at this timestep
 * @param {Array}  groundStations – [{ id, lat, lon, altKm? }]
 * @param {number} utcMs      – absolute UTC ms for this timestep (for ground station GMST)
 * @returns {{ x, y, z } | null} – ECI km
 */
function getEndpointPosKm(id, satPositions, groundStations, utcMs) {
  if (id.startsWith('sat-')) {
    const numId = parseFloat(id.replace('sat-', ''));
    const pos = satPositions[numId];
    if (!pos) return null;
    return pos; // already ECI km
  }
  // Ground station → geodetic to ECI km
  const gs = groundStations.find((g) => g.id === id);
  if (!gs) return null;
  const gmst = transforms.computeGMST(utcMs);
  const ecef = transforms.geodetic2ecef({ lat: gs.lat, lon: gs.lon, alt: gs.altKm || 0 });
  const eci = transforms.ecef2eci(ecef, gmst);
  return { x: eci[0], y: eci[1], z: eci[2] };
}

/* ── Full link computation ───────────────────────────────────── */

/**
 * Compute link budget for one link at one timestep.
 *
 * @param {Object} cfg           – link config (txId, rxId, wavelengthNm, etc.)
 * @param {Object} satPositions  – { [satNumId]: { x, y, z } } ECI km
 * @param {Array}  groundStations
 * @param {number} utcMs         – absolute UTC for this timestep
 * @param {Object} [globalThresholds] – { minElevationDeg, maxDistanceKm }
 * @returns {Object} – { ready, inLink, rangeKm, snrDb, ... }
 */
function computeLinkServer(cfg, satPositions, groundStations, utcMs, globalThresholds) {
  const globals = globalThresholds || {};
  const p = { ...defaultParams, ...cfg };
  // Must check cfg (raw) instead of p (merged), because p always has
  // minElevationDeg=10 from defaultParams and ?? won't skip it.
  const effectiveMinElev = cfg.minElevationDeg != null ? cfg.minElevationDeg
    : globals.minElevationDeg != null ? globals.minElevationDeg : 10;
  const effectiveMaxDistKm = cfg.maxDistanceKm != null ? cfg.maxDistanceKm
    : globals.maxDistanceKm != null ? globals.maxDistanceKm : null;
  const txPos = getEndpointPosKm(p.txId, satPositions, groundStations, utcMs);
  const rxPos = getEndpointPosKm(p.rxId, satPositions, groundStations, utcMs);
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

  // Ground ↔ Sat → elevation check
  if (txIsGround !== rxIsGround) {
    const groundId = txIsGround ? p.txId : p.rxId;
    const satPos = txIsGround ? rxPos : txPos;
    const groundPos = txIsGround ? txPos : rxPos;
    const gs = groundStations.find((g) => g.id === groundId);
    if (!gs) return { ready: false, id: cfg.id, txId: p.txId, rxId: p.rxId };

    const latRad = (gs.lat * Math.PI) / 180;
    const lonRad = (gs.lon * Math.PI) / 180;
    const gmst = transforms.computeGMST(utcMs);
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

  // Sat ↔ Sat → Earth occlusion check
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
}

/**
 * Build contact windows from a time-ordered array of link-active flags.
 *
 * @param {Array<{ time: number, activePairIds: string[] }>} timeline
 *   – sorted by time ascending.  activePairIds are strings like 'sat-0→gs-1'.
 * @param {number} starttime – simulation epoch in ms
 * @returns {Array} contactWindows in the same shape as communicationSlice
 */
function buildContactWindows(timeline, starttime) {
  const openWindows = {}; // pairId → { ... }
  const closedWindows = [];

  for (const step of timeline) {
    const simTimeMs = starttime + step.time * 1000;
    const activeSet = new Set(step.activePairIds);

    // Close or extend open windows
    for (const pairId of Object.keys(openWindows)) {
      if (activeSet.has(pairId)) {
        openWindows[pairId].simEnd = simTimeMs;
        activeSet.delete(pairId); // handled
      } else {
        openWindows[pairId].closed = true;
        closedWindows.push(openWindows[pairId]);
        delete openWindows[pairId];
      }
    }

    // Open new windows
    for (const pairId of activeSet) {
      const [txId, rxId] = pairId.split('→');
      openWindows[pairId] = {
        id: `cw-${pairId}-${simTimeMs}`,
        pairId,
        txId,
        rxId,
        simStart: simTimeMs,
        simEnd: simTimeMs,
        closed: false,
      };
    }
  }

  // Close any remaining open windows
  for (const pairId of Object.keys(openWindows)) {
    openWindows[pairId].closed = true;
    closedWindows.push(openWindows[pairId]);
  }

  return closedWindows;
}

module.exports = {
  SPEED_OF_LIGHT,
  PLANCK,
  EARTH_RADIUS_KM,
  defaultParams,
  apertureGainDb,
  fsplDb,
  getEndpointPosKm,
  computeLinkServer,
  buildContactWindows,
};
