/**
 * Coordinate transforms for the InstaOrbit backend.
 *
 * CommonJS version of the frontend `src/transforms/` module.
 * Contains GMST, ECI↔ECEF, ECEF↔geodetic, and sun-position routines.
 */

// ──────────────── Constants ────────────────
const EARTH_MU = 398600.4418;
const EARTH_RADIUS_EQ = 6378.137;
const EARTH_ROT_RATE = 7.2921159e-5;
const OBLIQUITY_J2000_DEG = 23.4392911;
const OBLIQUITY_J2000 = OBLIQUITY_J2000_DEG * (Math.PI / 180);
const J2000_EPOCH_MS = Date.UTC(2000, 0, 1, 12, 0, 0);
const MS_PER_DAY = 86400000;
const SCALE_FACTOR = 3185.5;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

// ──────────────── Rotation helpers ─────────
function rotateZ(v, θ) {
  const c = Math.cos(θ);
  const s = Math.sin(θ);
  return [c * v[0] - s * v[1], s * v[0] + c * v[1], v[2]];
}

function rotateX(v, θ) {
  const c = Math.cos(θ);
  const s = Math.sin(θ);
  return [v[0], c * v[1] - s * v[2], s * v[1] + c * v[2]];
}

// ──────────────── GMST ─────────────────────
/**
 * Compute GMST in radians for a given UTC timestamp (ms since Unix epoch).
 */
function computeGMST(utcMs) {
  const JD = utcMs / MS_PER_DAY + 2440587.5;
  const T = (JD - 2451545.0) / 36525.0;
  let gmstDeg =
    280.46061837 +
    360.98564736629 * (JD - 2451545.0) +
    0.000387933 * T * T -
    (T * T * T) / 38710000.0;
  gmstDeg = ((gmstDeg % 360) + 360) % 360;
  return gmstDeg * DEG2RAD;
}

/**
 * Compute GMST from simulation start epoch + elapsed seconds.
 */
function computeGMSTFromSim(startMs, elapsedSec) {
  return computeGMST(startMs + elapsedSec * 1000);
}

// ──────────────── ECI ↔ ECEF ───────────────
function eci2ecef(eciPos, gmst) {
  return rotateZ(eciPos, -gmst);
}

function ecef2eci(ecefPos, gmst) {
  return rotateZ(ecefPos, +gmst);
}

// ──────────────── ECEF ↔ Geodetic ──────────
/**
 * ECEF [x,y,z] km → { lat, lon, alt } (degrees, km)
 */
function ecef2geodetic(ecef) {
  const [x, y, z] = ecef;
  const r = Math.sqrt(x * x + y * y + z * z);
  if (r === 0) return { lat: 0, lon: 0, alt: -EARTH_RADIUS_EQ };
  const lat = Math.asin(z / r) * RAD2DEG;
  const lon = Math.atan2(y, x) * RAD2DEG;
  const alt = r - EARTH_RADIUS_EQ;
  return { lat, lon, alt };
}

/**
 * { lat, lon, alt } (degrees, km) → ECEF [x,y,z] km
 */
function geodetic2ecef({ lat, lon, alt = 0 }) {
  const φ = lat * DEG2RAD;
  const λ = lon * DEG2RAD;
  const r = EARTH_RADIUS_EQ + alt;
  return [r * Math.cos(φ) * Math.cos(λ), r * Math.cos(φ) * Math.sin(λ), r * Math.sin(φ)];
}

// ──────────────── Sun Position ─────────────
/**
 * Sun unit-direction vector in ECI, with obliquity.
 */
function sunDirectionECI(utcMs) {
  const n = (utcMs - J2000_EPOCH_MS) / MS_PER_DAY;
  let L = (280.46 + 0.9856474 * n) % 360;
  if (L < 0) L += 360;
  let g = (357.528 + 0.9856003 * n) % 360;
  if (g < 0) g += 360;
  const gRad = g * DEG2RAD;
  const λ_ecl = (L + 1.915 * Math.sin(gRad) + 0.020 * Math.sin(2 * gRad)) * DEG2RAD;
  const sunEcl = [Math.cos(λ_ecl), Math.sin(λ_ecl), 0];
  // R_x(+ε): ecliptic to equatorial
  return rotateX(sunEcl, OBLIQUITY_J2000);
}

// ──────────────── Composite helpers ────────
/**
 * ECI (km) → geodetic at a given UTC instant.
 */
function eciToGeodetic(eciKm, utcMs) {
  const gmst = computeGMST(utcMs);
  return ecef2geodetic(eci2ecef(eciKm, gmst));
}

/**
 * km → scene units
 */
function kmToScene(km) {
  return km / SCALE_FACTOR;
}

function kmVecToScene(v) {
  return [v[0] / SCALE_FACTOR, v[1] / SCALE_FACTOR, v[2] / SCALE_FACTOR];
}

// ──────────────── Exports ──────────────────
module.exports = {
  EARTH_MU,
  EARTH_RADIUS_EQ,
  EARTH_ROT_RATE,
  OBLIQUITY_J2000,
  SCALE_FACTOR,
  DEG2RAD,
  RAD2DEG,
  computeGMST,
  computeGMSTFromSim,
  rotateZ,
  rotateX,
  eci2ecef,
  ecef2eci,
  ecef2geodetic,
  geodetic2ecef,
  sunDirectionECI,
  eciToGeodetic,
  kmToScene,
  kmVecToScene,
};
