/**
 * Basic 3×3 rotation matrices and vector operations.
 *
 * All functions operate on [x, y, z] arrays.  No dependencies on Three.js
 * so the same code can be shared with the backend (Node).
 */

/**
 * Rotate a 3-vector about the Z-axis by angle θ (radians).
 *
 * @param {number[]} v  – [x, y, z]
 * @param {number}   θ  – rotation angle (rad), positive = counter-clockwise
 * @returns {number[]}  rotated [x, y, z]
 */
export function rotateZ(v, θ) {
  const c = Math.cos(θ);
  const s = Math.sin(θ);
  return [
    c * v[0] - s * v[1],
    s * v[0] + c * v[1],
    v[2],
  ];
}

/**
 * Rotate a 3-vector about the X-axis by angle θ (radians).
 *
 * @param {number[]} v
 * @param {number}   θ
 * @returns {number[]}
 */
export function rotateX(v, θ) {
  const c = Math.cos(θ);
  const s = Math.sin(θ);
  return [
    v[0],
    c * v[1] - s * v[2],
    s * v[1] + c * v[2],
  ];
}

/**
 * Rotate a 3-vector about the Y-axis by angle θ (radians).
 *
 * @param {number[]} v
 * @param {number}   θ
 * @returns {number[]}
 */
export function rotateY(v, θ) {
  const c = Math.cos(θ);
  const s = Math.sin(θ);
  return [
    c * v[0] + s * v[2],
    v[1],
    -s * v[0] + c * v[2],
  ];
}
