/**
 * InstaOrbit Coordinate Transforms — barrel export.
 *
 * Usage:
 *   import { computeGMST, eci2ecef, eciToGeodetic, sunDirectionECI } from '../transforms';
 */

// Constants
export {
  EARTH_MU,
  EARTH_RADIUS_EQ,
  EARTH_FLATTENING,
  EARTH_ROT_RATE,
  OBLIQUITY_J2000_DEG,
  OBLIQUITY_J2000,
  J2000_EPOCH_MS,
  MS_PER_DAY,
  SIDEREAL_DAY_S,
  SCALE_FACTOR,
  SCENE_EARTH_RADIUS,
  AU_KM,
  DEG2RAD,
  RAD2DEG,
} from './constants.js';

// GMST
export { computeGMST, computeGMSTFromSim } from './gmst.js';

// Rotation primitives
export { rotateZ, rotateX, rotateY } from './rotations.js';

// Frame transforms
export { eci2ecef, ecef2eci, eci2ecefVelocity, ecef2eciVelocity } from './eci2ecef.js';
export { ecef2geodetic, geodetic2ecef } from './ecef2geodetic.js';

// Sun
export { sunDirectionECI, sunDeclination, sunDirectionECIFromSim } from './sunPosition.js';

// Scene units
export { kmToScene, sceneToKm, kmVecToScene, sceneVecToKm } from './sceneCoords.js';

// High-level pipeline helpers
export {
  eciToGeodetic,
  geodeticToECI,
  eciToScene,
  geodeticToScene,
  geodeticToSceneECI,
  sunDirectionScene,
  sunGeodetic,
} from './pipeline.js';
