/**
 * Physical and astronomical constants used across the InstaOrbit
 * coordinate-transformation pipeline.
 *
 * Convention: all angles in radians unless a `_DEG` suffix is present.
 */

/** Standard gravitational parameter for Earth (km³/s²) – WGS-84 */
export const EARTH_MU = 398600.4418;

/** WGS-84 equatorial radius (km) */
export const EARTH_RADIUS_EQ = 6378.137;

/** WGS-84 flattening */
export const EARTH_FLATTENING = 1 / 298.257223563;

/** Mean sidereal Earth rotation rate (rad/s) – IAU 2000 */
export const EARTH_ROT_RATE = 7.2921159e-5;

/** Mean obliquity of the ecliptic at J2000.0 (degrees) */
export const OBLIQUITY_J2000_DEG = 23.4392911;

/** Mean obliquity of the ecliptic at J2000.0 (radians) */
export const OBLIQUITY_J2000 = OBLIQUITY_J2000_DEG * (Math.PI / 180);

/** J2000.0 epoch as a JS timestamp (ms) – 2000-01-01T12:00:00 TT ≈ UTC */
export const J2000_EPOCH_MS = Date.UTC(2000, 0, 1, 12, 0, 0);

/** Milliseconds per Julian day */
export const MS_PER_DAY = 86400000;

/** Seconds per sidereal day */
export const SIDEREAL_DAY_S = 86164.0905;

/**
 * Scene scale factor: how many km correspond to 1 Three.js scene unit.
 * Earth radius in scene = EARTH_RADIUS_EQ / SCALE_FACTOR ≈ 2.0
 */
export const SCALE_FACTOR = 3185.5;

/** Earth radius in Three.js scene units */
export const SCENE_EARTH_RADIUS = EARTH_RADIUS_EQ / SCALE_FACTOR;

/** 1 Astronomical Unit in km */
export const AU_KM = 149597870.7;

/** Degrees ↔ Radians helpers */
export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;
