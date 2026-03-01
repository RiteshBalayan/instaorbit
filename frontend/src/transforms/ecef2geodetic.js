/**
 * ECEF ↔ Geodetic (lat, lon, alt) transformations.
 *
 * Uses a **spherical Earth** model (sufficient for visualisation).
 * For higher fidelity, replace the inner maths with the iterative
 * Bowring method on the WGS-84 ellipsoid — the API stays the same.
 */

import { EARTH_RADIUS_EQ, DEG2RAD, RAD2DEG } from './constants.js';

/**
 * Convert ECEF [x, y, z] (km) to geodetic {lat, lon, alt}.
 *
 * @param {number[]} ecef – [x, y, z] in km
 * @returns {{ lat: number, lon: number, alt: number }}
 *   lat/lon in **degrees**, alt in km above surface
 */
export function ecef2geodetic(ecef) {
  const [x, y, z] = ecef;
  const r = Math.sqrt(x * x + y * y + z * z);
  if (r === 0) return { lat: 0, lon: 0, alt: -EARTH_RADIUS_EQ };

  const lat = Math.asin(z / r) * RAD2DEG;                // geocentric latitude
  const lon = Math.atan2(y, x) * RAD2DEG;                // geocentric longitude
  const alt = r - EARTH_RADIUS_EQ;

  return { lat, lon, alt };
}

/**
 * Convert geodetic {lat, lon, alt} to ECEF [x, y, z] (km).
 *
 * @param {{ lat: number, lon: number, alt?: number }} geo
 *   lat/lon in **degrees**, alt in km (defaults to 0)
 * @returns {number[]}  [x, y, z] in km
 */
export function geodetic2ecef({ lat, lon, alt = 0 }) {
  const φ = lat * DEG2RAD;
  const λ = lon * DEG2RAD;
  const r = EARTH_RADIUS_EQ + alt;

  return [
    r * Math.cos(φ) * Math.cos(λ),
    r * Math.cos(φ) * Math.sin(λ),
    r * Math.sin(φ),
  ];
}
