/**
 * ECI ↔ ECEF coordinate transformations.
 *
 * The relationship is a single rotation about the Z-axis by GMST:
 *
 *   r_ECEF = Rz(−θ_GMST) · r_ECI
 *   r_ECI  = Rz(+θ_GMST) · r_ECEF
 *
 * For velocity the Earth rotation vector ω must also be accounted for:
 *
 *   v_ECEF = Rz(−θ) · v_ECI  −  ω × r_ECEF
 *   v_ECI  = Rz(+θ) · v_ECEF  +  ω × r_ECEF_in_ECI   (approximate)
 */

import { rotateZ } from './rotations.js';
import { EARTH_ROT_RATE } from './constants.js';

/**
 * Convert an ECI position vector to ECEF.
 *
 * @param {number[]} eciPos  – [x, y, z] in km (ECI)
 * @param {number}   gmst    – GMST angle in radians
 * @returns {number[]}  [x, y, z] in km (ECEF)
 */
export function eci2ecef(eciPos, gmst) {
  return rotateZ(eciPos, -gmst);
}

/**
 * Convert an ECEF position vector to ECI.
 *
 * @param {number[]} ecefPos – [x, y, z] in km (ECEF)
 * @param {number}   gmst    – GMST angle in radians
 * @returns {number[]}  [x, y, z] in km (ECI)
 */
export function ecef2eci(ecefPos, gmst) {
  return rotateZ(ecefPos, +gmst);
}

/**
 * Convert ECI velocity to ECEF velocity.
 *
 * v_ECEF = Rz(−θ)·v_ECI  −  ω×r_ECEF
 *
 * @param {number[]} eciVel  – [vx, vy, vz] in km/s (ECI)
 * @param {number[]} eciPos  – [x, y, z] in km (ECI)
 * @param {number}   gmst    – GMST angle in radians
 * @returns {number[]}  [vx, vy, vz] in km/s (ECEF)
 */
export function eci2ecefVelocity(eciVel, eciPos, gmst) {
  const vRot = rotateZ(eciVel, -gmst);
  const rEcef = rotateZ(eciPos, -gmst);
  // ω × r_ECEF  where ω = [0, 0, ωₑ]
  // cross([0,0,ω], [x,y,z]) = [−ω·y, ω·x, 0]
  const ω = EARTH_ROT_RATE;
  return [
    vRot[0] - (-ω * rEcef[1]),
    vRot[1] - (ω * rEcef[0]),
    vRot[2],
  ];
}

/**
 * Convert ECEF velocity to ECI velocity.
 *
 * v_ECI = Rz(+θ)·(v_ECEF + ω×r_ECEF)
 *
 * @param {number[]} ecefVel – [vx, vy, vz] in km/s (ECEF)
 * @param {number[]} ecefPos – [x, y, z] in km (ECEF)
 * @param {number}   gmst    – GMST angle in radians
 * @returns {number[]}  [vx, vy, vz] in km/s (ECI)
 */
export function ecef2eciVelocity(ecefVel, ecefPos, gmst) {
  const ω = EARTH_ROT_RATE;
  // v_ECEF + ω×r_ECEF
  const vPlusOmega = [
    ecefVel[0] + (-ω * ecefPos[1]),
    ecefVel[1] + (ω * ecefPos[0]),
    ecefVel[2],
  ];
  return rotateZ(vPlusOmega, +gmst);
}
