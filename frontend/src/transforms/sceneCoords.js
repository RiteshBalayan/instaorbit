/**
 * Three.js scene-unit ↔ physical-unit converters.
 *
 * The InstaOrbit 3D scene uses a scale where:
 *   1 scene unit = SCALE_FACTOR km ≈ 3185.5 km
 *   Earth radius = ~2.0 scene units
 */

import { SCALE_FACTOR } from './constants.js';

/** Convert a scalar from km to Three.js scene units. */
export function kmToScene(km) {
  return km / SCALE_FACTOR;
}

/** Convert a scalar from Three.js scene units to km. */
export function sceneToKm(su) {
  return su * SCALE_FACTOR;
}

/**
 * Convert an [x, y, z] position from km to scene units.
 *
 * @param {number[]} kmVec – [x, y, z] in km
 * @returns {number[]}  [x, y, z] in scene units
 */
export function kmVecToScene(kmVec) {
  return [
    kmVec[0] / SCALE_FACTOR,
    kmVec[1] / SCALE_FACTOR,
    kmVec[2] / SCALE_FACTOR,
  ];
}

/**
 * Convert an [x, y, z] position from scene units to km.
 *
 * @param {number[]} sceneVec – [x, y, z] in scene units
 * @returns {number[]}  [x, y, z] in km
 */
export function sceneVecToKm(sceneVec) {
  return [
    sceneVec[0] * SCALE_FACTOR,
    sceneVec[1] * SCALE_FACTOR,
    sceneVec[2] * SCALE_FACTOR,
  ];
}
