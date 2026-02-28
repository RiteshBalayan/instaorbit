/**
 * High-level composite transforms that chain the atomic operations.
 *
 * These are the "one-call" functions that the rest of the app should use
 * instead of chaining eci2ecef → ecef2geodetic manually.
 */

import { computeGMST, computeGMSTFromSim } from './gmst.js';
import { eci2ecef, ecef2eci } from './eci2ecef.js';
import { ecef2geodetic, geodetic2ecef } from './ecef2geodetic.js';
import { kmVecToScene, sceneVecToKm } from './sceneCoords.js';
import { sunDirectionECI } from './sunPosition.js';

/**
 * ECI position (km) → geodetic {lat, lon, alt} at a given UTC instant.
 *
 * This is the correct way to get lat/lon for a satellite propagated in ECI:
 *   1. Rotate ECI → ECEF using GMST
 *   2. Convert ECEF → geodetic
 *
 * @param {number[]} eciKm   – [x, y, z] in km (ECI frame)
 * @param {number}   utcMs   – UTC timestamp (ms)
 * @returns {{ lat: number, lon: number, alt: number }}
 */
export function eciToGeodetic(eciKm, utcMs) {
  const gmst = computeGMST(utcMs);
  const ecef = eci2ecef(eciKm, gmst);
  return ecef2geodetic(ecef);
}

/**
 * Geodetic → ECI position (km) at a given UTC instant.
 *
 * Used to place ground stations in the ECI scene frame.
 *
 * @param {{ lat: number, lon: number, alt?: number }} geo
 * @param {number} utcMs
 * @returns {number[]}  [x, y, z] in km (ECI)
 */
export function geodeticToECI(geo, utcMs) {
  const gmst = computeGMST(utcMs);
  const ecef = geodetic2ecef(geo);
  return ecef2eci(ecef, gmst);
}

/**
 * ECI position (km) → Three.js scene coordinates.
 *
 * @param {number[]} eciKm  – [x, y, z] in km
 * @returns {number[]}  [x, y, z] in scene units
 */
export function eciToScene(eciKm) {
  return kmVecToScene(eciKm);
}

/**
 * Geodetic → Three.js scene coordinates (ECEF frame).
 * Used when the 3D view is in EarthFixed mode.
 *
 * @param {{ lat: number, lon: number, alt?: number }} geo
 * @returns {number[]}  [x, y, z] in scene units (ECEF-aligned)
 */
export function geodeticToScene(geo) {
  return kmVecToScene(geodetic2ecef(geo));
}

/**
 * Geodetic → Three.js scene coordinates (ECI frame).
 * Used when the 3D view is in EarthInertial mode.
 *
 * @param {{ lat: number, lon: number, alt?: number }} geo
 * @param {number} utcMs  – current UTC time
 * @returns {number[]}  [x, y, z] in scene units (ECI-aligned)
 */
export function geodeticToSceneECI(geo, utcMs) {
  return kmVecToScene(geodeticToECI(geo, utcMs));
}

/**
 * Sun position as a scene-unit direction vector in ECI.
 * Multiply by desired distance (e.g. 5 scene units) to position the mesh.
 *
 * @param {number} utcMs
 * @returns {number[]}  [x, y, z] unit direction in ECI scene coords
 */
export function sunDirectionScene(utcMs) {
  return sunDirectionECI(utcMs); // already unit vector, no scaling needed
}

/**
 * Sun geodetic position (sub-solar point).
 *
 * @param {number} utcMs
 * @returns {{ lat: number, lon: number, alt: number }}
 */
export function sunGeodetic(utcMs) {
  const dir = sunDirectionECI(utcMs);
  // Scale to ~1 AU for a proper ECEF→geodetic conversion
  // (direction is unit vector; but ecef2geodetic only needs direction for lat/lon)
  const gmst = computeGMST(utcMs);
  const ecef = [
    Math.cos(-gmst) * dir[0] - Math.sin(-gmst) * dir[1],
    Math.sin(-gmst) * dir[0] + Math.cos(-gmst) * dir[1],
    dir[2],
  ];
  const lat = Math.asin(ecef[2]) * (180 / Math.PI);
  const lon = Math.atan2(ecef[1], ecef[0]) * (180 / Math.PI);
  return { lat, lon, alt: 0 };
}
