/**
 * Coordinate conversion utilities for the 2D Leaflet map.
 *
 * The backend simulation produces `mapX` and `mapY` using this projection
 * (see backend/server/index.js):
 *
 *   mapX = (atan2(y, x) / π) * 7.5          →  range [-7.5, 7.5]
 *   mapY = ((-acos(z / r) / π) + 0.5) * 7.5 →  range [-3.75, 3.75]
 *
 * We invert that to real-world [lat, lon] (degrees) for Leaflet.
 */

/**
 * Convert the backend mapX / mapY values to [lat, lon] in degrees.
 * @param {number} mapX  – range approximately [-7.5, 7.5]
 * @param {number} mapY  – range approximately [-3.75, 3.75]
 * @returns {[number, number]} [lat, lon] in degrees
 */
export function mapXYToLatLon(mapX, mapY) {
  // Invert:  mapX = (phi / π) * 7.5  →  phi = mapX * π / 7.5
  //          mapY = ((-theta / π) + 0.5) * 7.5
  //          theta = (0.5 - mapY / 7.5) * π      (0 = north pole, π = south pole)
  //
  //  longitude (deg) = phi * (180 / π) = mapX / 7.5 * 180
  //  latitude  (deg) = 90 - theta * (180 / π)

  const lon = (mapX / 7.5) * 180;
  const theta = (0.5 - mapY / 7.5) * Math.PI;
  const lat = 90 - (theta * 180) / Math.PI;

  return [lat, lon];
}

/**
 * Compute the sub-solar point as [lat, lon] given simulation timing.
 *
 * Simplified model (same logic as the old Three.js 2DMap component):
 *  – assumes the sun lies in the equatorial plane (declination ≈ 0)
 *  – longitude sweeps at Earth's rotation rate relative to the sun
 *
 * @param {number} elapsedTime  – simulation seconds since start
 * @param {number} starttime    – epoch ms of simulation start
 * @returns {[number, number]} [lat, lon] in degrees
 */
export function computeSubSolarLatLon(elapsedTime, starttime) {
  const initialDate = new Date(starttime);
  const startOfDay = new Date(initialDate);
  startOfDay.setHours(0, 0, 0, 0);
  const phaseHours = (starttime - startOfDay.getTime()) / (1000 * 60 * 60);

  const earthRotRate = (2 * Math.PI) / (24 * 60 * 60); // rad/s
  const angle = -earthRotRate * elapsedTime + (phaseHours / 24) * 2 * Math.PI;

  const sunLon = (angle * 180) / Math.PI;             // degrees
  const sunLat = 0;                                     // simplified: declination ≈ 0

  // Normalise longitude to [-180, 180]
  const normLon = ((sunLon + 180) % 360 + 360) % 360 - 180;
  return [sunLat, normLon];
}

/**
 * Split a list of [lat, lon] points into segments that don't cross the
 * antimeridian (|Δlon| > 180). This prevents Leaflet polylines from
 * drawing a line across the entire map.
 *
 * @param {Array<[number,number]>} points – [[lat, lon], …]
 * @returns {Array<Array<[number,number]>>} array of segments
 */
export function splitAtAntimeridian(points) {
  if (!points || points.length === 0) return [];
  const segments = [];
  let current = [points[0]];

  for (let i = 1; i < points.length; i++) {
    const prevLon = points[i - 1][1];
    const curLon = points[i][1];
    if (Math.abs(curLon - prevLon) > 180) {
      // Antimeridian crossing – start a new segment
      segments.push(current);
      current = [];
    }
    current.push(points[i]);
  }
  if (current.length > 0) segments.push(current);
  return segments;
}
