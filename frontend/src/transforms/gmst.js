/**
 * Greenwich Mean Sidereal Time (GMST) computation.
 *
 * GMST is the angle between the ECI X-axis (vernal equinox) and the
 * Greenwich meridian.  It is THE single link between ECI and ECEF frames:
 *
 *   ECEF = Rz(−GMST) · ECI
 *
 * Algorithm: simplified IAU expression valid to ~0.1 arc-sec over ±100 years
 * from J2000.0, which is more than adequate for visualization.
 */

import { J2000_EPOCH_MS, MS_PER_DAY } from './constants.js';

/**
 * Compute GMST in **radians** for a given UTC timestamp.
 *
 * @param {number} utcMs  – UTC time as milliseconds since Unix epoch
 * @returns {number}  GMST angle in radians, normalised to [0, 2π)
 */
export function computeGMST(utcMs) {
  // Julian Date from Unix ms
  const JD = (utcMs / MS_PER_DAY) + 2440587.5;

  // Julian centuries since J2000.0
  const T = (JD - 2451545.0) / 36525.0;

  // GMST in degrees (IAU simplified model)
  let gmstDeg =
    280.46061837 +
    360.98564736629 * (JD - 2451545.0) +
    0.000387933 * T * T -
    T * T * T / 38710000.0;

  // Normalise to [0, 360)
  gmstDeg = ((gmstDeg % 360) + 360) % 360;

  return gmstDeg * (Math.PI / 180);
}

/**
 * Convenience: compute GMST from a simulation start epoch + elapsed seconds.
 *
 * @param {number} startMs     – simulation start epoch (ms since Unix epoch)
 * @param {number} elapsedSec  – seconds elapsed since startMs
 * @returns {number}  GMST angle in radians [0, 2π)
 */
export function computeGMSTFromSim(startMs, elapsedSec) {
  return computeGMST(startMs + elapsedSec * 1000);
}
