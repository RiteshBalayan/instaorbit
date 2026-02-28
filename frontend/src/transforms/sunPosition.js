/**
 * Sun position in the ECI (J2000 equatorial) frame.
 *
 * Uses the low-precision solar coordinate algorithm — accurate to ~1° in
 * ecliptic longitude, which is plenty for visualisation.  The key feature
 * missing in the old code is the Earth's **obliquity (23.44°)**: the Sun
 * moves above and below the equatorial plane over the course of a year.
 *
 * Reference: Meeus, *Astronomical Algorithms*, Ch. 25 (simplified).
 */

import {
  J2000_EPOCH_MS,
  MS_PER_DAY,
  OBLIQUITY_J2000,
  DEG2RAD,
  AU_KM,
} from './constants.js';
import { rotateX } from './rotations.js';

/**
 * Compute the Sun's unit-direction vector in **ECI** (equatorial) frame.
 *
 * @param {number} utcMs – UTC time in milliseconds since Unix epoch
 * @returns {number[]}  [x, y, z] unit vector pointing toward the Sun in ECI
 */
export function sunDirectionECI(utcMs) {
  // Days since J2000.0
  const n = (utcMs - J2000_EPOCH_MS) / MS_PER_DAY;

  // Mean longitude of the Sun (deg)
  let L = (280.460 + 0.9856474 * n) % 360;
  if (L < 0) L += 360;

  // Mean anomaly (deg)
  let g = (357.528 + 0.9856003 * n) % 360;
  if (g < 0) g += 360;

  const gRad = g * DEG2RAD;

  // Ecliptic longitude (deg)
  const λ_ecl = (L + 1.915 * Math.sin(gRad) + 0.020 * Math.sin(2 * gRad)) * DEG2RAD;

  // Sun direction in ecliptic frame (ecliptic latitude ≈ 0 for Sun)
  const sunEcl = [Math.cos(λ_ecl), Math.sin(λ_ecl), 0];

  // Rotate from ecliptic to equatorial (ECI) by +ε about X-axis
  // The ecliptic is tilted by +ε relative to the equatorial plane,
  // so to transform a vector from ecliptic coords to equatorial coords
  // we apply R_x(+ε): this tilts the Y/Z components correctly.
  const sunECI = rotateX(sunEcl, OBLIQUITY_J2000);

  return sunECI;
}

/**
 * Compute the Sun's **declination** (latitude above/below equator) in degrees.
 *
 * @param {number} utcMs
 * @returns {number}  declination in degrees (positive = north)
 */
export function sunDeclination(utcMs) {
  const dir = sunDirectionECI(utcMs);
  return Math.asin(dir[2]) * (180 / Math.PI);
}

/**
 * Convenience: sun direction from simulation timing.
 *
 * @param {number} startMs     – simulation start (ms since Unix epoch)
 * @param {number} elapsedSec  – seconds elapsed since start
 * @returns {number[]}  [x, y, z] unit vector in ECI
 */
export function sunDirectionECIFromSim(startMs, elapsedSec) {
  return sunDirectionECI(startMs + elapsedSec * 1000);
}
