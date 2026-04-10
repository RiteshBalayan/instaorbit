/**
 * BodyFrameTransforms — Pure math utilities for satellite body-frame orientation.
 *
 * All functions operate on plain arrays (no Three.js, no React, no Redux).
 * Quaternions are stored as [qx, qy, qz, qw] (Hamilton convention, scalar-last).
 *
 * LVLH (Local-Vertical–Local-Horizontal) frame definition:
 *   Z_body = −R̂        (nadir — toward Earth centre)
 *   Y_body = −(R×V)/|R×V|  (negative orbit-normal)
 *   X_body = Y×Z       (roughly velocity direction)
 */

// ──────────── Vector helpers ───────────────────────────────────

export function vec3Length(v) {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

export function vec3Normalize(v) {
  const len = vec3Length(v);
  if (len < 1e-14) return [0, 0, 0];
  return [v[0] / len, v[1] / len, v[2] / len];
}

export function vec3Cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function vec3Dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function vec3Sub(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function vec3Scale(v, s) {
  return [v[0] * s, v[1] * s, v[2] * s];
}

// ──────────── Quaternion helpers ───────────────────────────────

/** Quaternion multiplication: q * r  (Hamilton, scalar-last [x,y,z,w]) */
export function quatMultiply(q, r) {
  return [
    q[3] * r[0] + q[0] * r[3] + q[1] * r[2] - q[2] * r[1],
    q[3] * r[1] - q[0] * r[2] + q[1] * r[3] + q[2] * r[0],
    q[3] * r[2] + q[0] * r[1] - q[1] * r[0] + q[2] * r[3],
    q[3] * r[3] - q[0] * r[0] - q[1] * r[1] - q[2] * r[2],
  ];
}

/** Conjugate (inverse for unit quaternions) */
export function quatConjugate(q) {
  return [-q[0], -q[1], -q[2], q[3]];
}

/** Normalize to unit quaternion */
export function quatNormalize(q) {
  const len = Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]);
  if (len < 1e-14) return [0, 0, 0, 1];
  return [q[0] / len, q[1] / len, q[2] / len, q[3] / len];
}

/** Rotate vector v by unit quaternion q: v' = q * v * q^-1 */
export function quatRotateVec(q, v) {
  const vq = [v[0], v[1], v[2], 0];
  const result = quatMultiply(quatMultiply(q, vq), quatConjugate(q));
  return [result[0], result[1], result[2]];
}

/**
 * Build a quaternion from a rotation matrix (column-major 3x3 given as 3 column vectors).
 * Columns are: xAxis, yAxis, zAxis of the body frame expressed in ECI.
 */
export function matrixToQuaternion(xAxis, yAxis, zAxis) {
  // Rotation matrix rows = body axes expressed in inertial frame
  const m00 = xAxis[0], m01 = yAxis[0], m02 = zAxis[0];
  const m10 = xAxis[1], m11 = yAxis[1], m12 = zAxis[1];
  const m20 = xAxis[2], m21 = yAxis[2], m22 = zAxis[2];

  const trace = m00 + m11 + m22;
  let qx, qy, qz, qw;

  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1);
    qw = 0.25 / s;
    qx = (m21 - m12) * s;
    qy = (m02 - m20) * s;
    qz = (m10 - m01) * s;
  } else if (m00 > m11 && m00 > m22) {
    const s = 2 * Math.sqrt(1 + m00 - m11 - m22);
    qw = (m21 - m12) / s;
    qx = 0.25 * s;
    qy = (m01 + m10) / s;
    qz = (m02 + m20) / s;
  } else if (m11 > m22) {
    const s = 2 * Math.sqrt(1 + m11 - m00 - m22);
    qw = (m02 - m20) / s;
    qx = (m01 + m10) / s;
    qy = 0.25 * s;
    qz = (m12 + m21) / s;
  } else {
    const s = 2 * Math.sqrt(1 + m22 - m00 - m11);
    qw = (m10 - m01) / s;
    qx = (m02 + m20) / s;
    qy = (m12 + m21) / s;
    qz = 0.25 * s;
  }

  return quatNormalize([qx, qy, qz, qw]);
}

// ──────────── LVLH / Nadir quaternion ──────────────────────────

/**
 * Compute the LVLH (nadir-pointing) quaternion from ECI position and velocity (km).
 *
 * @param {number[]} posECI  – [x, y, z] ECI position in km
 * @param {number[]} velECI  – [vx, vy, vz] ECI velocity in km/s
 * @returns {number[]} quaternion [qx, qy, qz, qw]  body→ECI
 */
export function computeLVLHQuaternion(posECI, velECI) {
  // Z_body = -R̂ (nadir)
  const rHat = vec3Normalize(posECI);
  const zBody = [-rHat[0], -rHat[1], -rHat[2]];

  // orbit normal h = R × V
  const hVec = vec3Cross(posECI, velECI);
  // Y_body = -ĥ (negative orbit normal)
  const hHat = vec3Normalize(hVec);
  const yBody = [-hHat[0], -hHat[1], -hHat[2]];

  // X_body = Y × Z (completes right-hand system)
  const xBody = vec3Normalize(vec3Cross(yBody, zBody));

  return matrixToQuaternion(xBody, yBody, zBody);
}

// ──────────── Target-pointing quaternion ───────────────────────

/**
 * Compute a quaternion that points satellite X-body axis toward a target.
 *
 * @param {number[]} posECI       – satellite ECI position (km)
 * @param {number[]} velECI       – satellite ECI velocity (km/s) — used for "up" hint
 * @param {number[]} targetPosECI – target ECI position (km)
 * @returns {number[]} quaternion [qx, qy, qz, qw]  body→ECI
 */
export function computeTargetQuaternion(posECI, velECI, targetPosECI) {
  // X_body = unit vector from satellite toward target
  const toTarget = vec3Sub(targetPosECI, posECI);
  const xBody = vec3Normalize(toTarget);

  // "up" hint = nadir direction (-R̂) — keeps the satellite roughly Earth-oriented
  const nadir = vec3Normalize(vec3Scale(posECI, -1));

  // Y_body = X × nadir  (then normalise)
  let yBody = vec3Normalize(vec3Cross(xBody, nadir));

  // If X and nadir are parallel, fall back to orbit-normal
  if (vec3Length(yBody) < 1e-10) {
    const hVec = vec3Cross(posECI, velECI);
    yBody = vec3Normalize(vec3Scale(hVec, -1));
  }

  // Z_body = X × Y
  const zBody = vec3Normalize(vec3Cross(xBody, yBody));

  return matrixToQuaternion(xBody, yBody, zBody);
}

// ──────────── SLERP ────────────────────────────────────────────

/**
 * Spherical linear interpolation between two unit quaternions.
 *
 * @param {number[]} q0  – start quaternion [x,y,z,w]
 * @param {number[]} q1  – end quaternion [x,y,z,w]
 * @param {number}   t   – interpolation factor 0‒1
 * @returns {number[]} interpolated quaternion
 */
export function slerpQuaternion(q0, q1, t) {
  let dot = q0[0] * q1[0] + q0[1] * q1[1] + q0[2] * q1[2] + q0[3] * q1[3];

  // If dot < 0, negate one to take shortest path
  let _q1 = [...q1];
  if (dot < 0) {
    _q1 = [-q1[0], -q1[1], -q1[2], -q1[3]];
    dot = -dot;
  }

  // If very close, use linear interpolation to avoid division-by-zero
  if (dot > 0.9995) {
    return quatNormalize([
      q0[0] + t * (_q1[0] - q0[0]),
      q0[1] + t * (_q1[1] - q0[1]),
      q0[2] + t * (_q1[2] - q0[2]),
      q0[3] + t * (_q1[3] - q0[3]),
    ]);
  }

  const theta0 = Math.acos(dot);
  const theta = theta0 * t;
  const sinTheta = Math.sin(theta);
  const sinTheta0 = Math.sin(theta0);
  const s0 = Math.cos(theta) - dot * sinTheta / sinTheta0;
  const s1 = sinTheta / sinTheta0;

  return quatNormalize([
    s0 * q0[0] + s1 * _q1[0],
    s0 * q0[1] + s1 * _q1[1],
    s0 * q0[2] + s1 * _q1[2],
    s0 * q0[3] + s1 * _q1[3],
  ]);
}

// ──────────── Slew duration ────────────────────────────────────

/**
 * Compute the rotation angle (degrees) between two quaternions.
 */
export function quaternionAngleDeg(q0, q1) {
  let dot = Math.abs(q0[0] * q1[0] + q0[1] * q1[1] + q0[2] * q1[2] + q0[3] * q1[3]);
  dot = Math.min(1, dot); // clamp
  return 2 * Math.acos(dot) * (180 / Math.PI);
}

/**
 * Time (seconds) to slew from q0 to q1 at the given rate.
 */
export function computeSlewDuration(q0, q1, slewRateDegSec = 1) {
  const angleDeg = quaternionAngleDeg(q0, q1);
  return angleDeg / Math.max(slewRateDegSec, 0.001);
}

// ──────────── Euler ↔ Quaternion ───────────────────────────────

/** Quaternion → Euler [roll, pitch, yaw] in radians (ZYX intrinsic) */
export function quaternionToEuler(q) {
  const [x, y, z, w] = q;
  const sinr_cosp = 2 * (w * x + y * z);
  const cosr_cosp = 1 - 2 * (x * x + y * y);
  const roll = Math.atan2(sinr_cosp, cosr_cosp);

  const sinp = 2 * (w * y - z * x);
  const pitch = Math.abs(sinp) >= 1 ? Math.sign(sinp) * Math.PI / 2 : Math.asin(sinp);

  const siny_cosp = 2 * (w * z + x * y);
  const cosy_cosp = 1 - 2 * (y * y + z * z);
  const yaw = Math.atan2(siny_cosp, cosy_cosp);

  return [roll, pitch, yaw];
}

/** Euler [roll, pitch, yaw] in radians → quaternion [x,y,z,w] (ZYX intrinsic) */
export function eulerToQuaternion(roll, pitch, yaw) {
  const cr = Math.cos(roll / 2), sr = Math.sin(roll / 2);
  const cp = Math.cos(pitch / 2), sp = Math.sin(pitch / 2);
  const cy = Math.cos(yaw / 2), sy = Math.sin(yaw / 2);

  return quatNormalize([
    sr * cp * cy - cr * sp * sy,
    cr * sp * cy + sr * cp * sy,
    cr * cp * sy - sr * sp * cy,
    cr * cp * cy + sr * sp * sy,
  ]);
}

// ──────────── Frame transforms ─────────────────────────────────

/** Transform a vector from body frame to ECI using the body→ECI quaternion */
export function bodyToECI(bodyVec, quaternion) {
  return quatRotateVec(quaternion, bodyVec);
}

/** Transform a vector from ECI to body frame */
export function eciToBody(eciVec, quaternion) {
  return quatRotateVec(quatConjugate(quaternion), eciVec);
}
