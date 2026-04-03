/**
 * Attitude computation for the InstaOrbit backend.
 *
 * Computes satellite body-frame orientation (quaternion) based on:
 *  – Nadir (LVLH) default
 *  – Target-pointing with condition checks (distance, elevation)
 *  – Slew-rate–limited reorientation via SLERP
 *
 * Quaternion convention: [qx, qy, qz, qw] (Hamilton, scalar-last).
 */

const transforms = require('./transforms');

// ─────────── Vector helpers ─────────────────────────────────────

function vec3Length(v) {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

function vec3Normalize(v) {
  const len = vec3Length(v);
  if (len < 1e-14) return [0, 0, 0];
  return [v[0] / len, v[1] / len, v[2] / len];
}

function vec3Cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function vec3Sub(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function vec3Scale(v, s) {
  return [v[0] * s, v[1] * s, v[2] * s];
}

function vec3Dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

// ─────────── Quaternion helpers ─────────────────────────────────

function quatNormalize(q) {
  const len = Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]);
  if (len < 1e-14) return [0, 0, 0, 1];
  return [q[0] / len, q[1] / len, q[2] / len, q[3] / len];
}

function matrixToQuaternion(xAxis, yAxis, zAxis) {
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

function slerpQuaternion(q0, q1, t) {
  let dot = q0[0] * q1[0] + q0[1] * q1[1] + q0[2] * q1[2] + q0[3] * q1[3];
  let _q1 = [...q1];
  if (dot < 0) {
    _q1 = [-q1[0], -q1[1], -q1[2], -q1[3]];
    dot = -dot;
  }
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

function quaternionAngleDeg(q0, q1) {
  let dot = Math.abs(q0[0] * q1[0] + q0[1] * q1[1] + q0[2] * q1[2] + q0[3] * q1[3]);
  dot = Math.min(1, dot);
  return 2 * Math.acos(dot) * (180 / Math.PI);
}

// ─────────── LVLH quaternion ────────────────────────────────────

/**
 * Compute nadir-pointing (LVLH) quaternion from ECI position + velocity (km).
 */
function computeLVLHQuaternion(posECI, velECI) {
  const rHat = vec3Normalize(posECI);
  const zBody = [-rHat[0], -rHat[1], -rHat[2]];
  const hVec = vec3Cross(posECI, velECI);
  const hHat = vec3Normalize(hVec);
  const yBody = [-hHat[0], -hHat[1], -hHat[2]];
  const xBody = vec3Normalize(vec3Cross(yBody, zBody));
  return matrixToQuaternion(xBody, yBody, zBody);
}

/**
 * Compute target-pointing quaternion: X_body → target direction.
 */
function computeTargetQuaternion(posECI, velECI, targetPosECI) {
  const toTarget = vec3Sub(targetPosECI, posECI);
  const xBody = vec3Normalize(toTarget);
  const nadir = vec3Normalize(vec3Scale(posECI, -1));
  let yBody = vec3Normalize(vec3Cross(xBody, nadir));
  if (vec3Length(yBody) < 1e-10) {
    const hVec = vec3Cross(posECI, velECI);
    yBody = vec3Normalize(vec3Scale(hVec, -1));
  }
  const zBody = vec3Normalize(vec3Cross(xBody, yBody));
  return matrixToQuaternion(xBody, yBody, zBody);
}

// ─────────── Condition checking ─────────────────────────────────

/**
 * Resolve a target's ECI position (km) at a given timestep.
 *
 * @param {Object} target        – { targetType, targetId }
 * @param {Object} satPositionsKm – { satNumId: { x, y, z } }
 * @param {Array}  groundStations
 * @param {number} utcMs
 * @returns {{ x, y, z } | null}
 */
function resolveTargetPos(target, satPositionsKm, groundStations, utcMs) {
  if (target.targetType === 'satellite') {
    // targetId is "sat-<num>" or raw number
    const numId = typeof target.targetId === 'string' && target.targetId.startsWith('sat-')
      ? parseFloat(target.targetId.replace('sat-', ''))
      : target.targetId;
    const pos = satPositionsKm[numId];
    return pos || null;
  }
  if (target.targetType === 'groundStation') {
    const gs = groundStations.find(g => g.id === target.targetId);
    if (!gs) return null;
    const gmst = transforms.computeGMST(utcMs);
    const ecef = transforms.geodetic2ecef({ lat: gs.lat, lon: gs.lon, alt: gs.altKm || 0 });
    const eci = transforms.ecef2eci(ecef, gmst);
    return { x: eci[0], y: eci[1], z: eci[2] };
  }
  return null;
}

/**
 * Check whether a pointing target's conditions are met.
 *
 * @param {Object} target   – pointing target config { conditions }
 * @param {number[]} satPos – satellite ECI km [x,y,z]
 * @param {{ x,y,z }} targetPos – target ECI km
 * @param {Array} groundStations
 * @param {number} utcMs
 * @returns {boolean}
 */
function checkConditions(target, satPos, targetPos, groundStations, utcMs) {
  const cond = target.conditions || {};
  const dx = targetPos.x - satPos[0];
  const dy = targetPos.y - satPos[1];
  const dz = targetPos.z - satPos[2];
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

  if (cond.minDistance != null && dist < cond.minDistance) return false;
  if (cond.maxDistance != null && dist > cond.maxDistance) return false;

  // Elevation check for ground station targets
  if (target.targetType === 'groundStation' && cond.minElevationDeg != null) {
    const gs = groundStations.find(g => g.id === target.targetId);
    if (gs) {
      const latRad = gs.lat * Math.PI / 180;
      const lonRad = gs.lon * Math.PI / 180;
      const gmst = transforms.computeGMST(utcMs);
      const enuLon = lonRad + gmst;
      const gx = targetPos.x, gy = targetPos.y, gz = targetPos.z;
      const sdx = satPos[0] - gx, sdy = satPos[1] - gy, sdz = satPos[2] - gz;
      const sinLat = Math.sin(latRad), cosLat = Math.cos(latRad);
      const sinLon = Math.sin(enuLon), cosLon = Math.cos(enuLon);
      const up = cosLat * cosLon * sdx + cosLat * sinLon * sdy + sinLat * sdz;
      const east = -sinLon * sdx + cosLon * sdy;
      const north = -sinLat * cosLon * sdx - sinLat * sinLon * sdy + cosLat * sdz;
      const horiz = Math.sqrt(east * east + north * north);
      const elev = Math.atan2(up, horiz) * (180 / Math.PI);
      if (elev < cond.minElevationDeg) return false;
    }
  }

  // Earth occlusion check for satellite targets
  if (target.targetType === 'satellite') {
    const EARTH_R = 6378.137;
    const vx = targetPos.x - satPos[0];
    const vy = targetPos.y - satPos[1];
    const vz = targetPos.z - satPos[2];
    const vDotV = vx * vx + vy * vy + vz * vz;
    const wx = -satPos[0], wy = -satPos[1], wz = -satPos[2];
    const wDotV = wx * vx + wy * vy + wz * vz;
    const t = Math.max(0, Math.min(1, wDotV / vDotV));
    const cx = satPos[0] + t * vx;
    const cy = satPos[1] + t * vy;
    const cz = satPos[2] + t * vz;
    const closest = Math.sqrt(cx * cx + cy * cy + cz * cz);
    if (closest <= EARTH_R) return false;
  }

  return true;
}

// ─────────── Main attitude resolver ─────────────────────────────

/**
 * Compute the attitude for one satellite at one timestep, with slew-rate limiting.
 *
 * @param {number[]} posECI_km          – satellite ECI position [x,y,z] in km
 * @param {number[]} velECI_kms         – satellite ECI velocity [vx,vy,vz] in km/s
 * @param {Object}   bodyFrameConfig    – { pointingMode, slewRateDegSec, pointingTargets[] }
 * @param {Object}   satPositionsKm     – all satellites' positions { satId: {x,y,z} }
 * @param {Array}    groundStations
 * @param {number}   utcMs
 * @param {number[]} prevQuaternion     – previous attitude [qx,qy,qz,qw]
 * @param {number}   dt                 – timestep size in seconds
 * @returns {{ quaternion: number[], pointingTargetId: string|null, isSlewing: boolean }}
 */
function computeAttitude(
  posECI_km,
  velECI_kms,
  bodyFrameConfig,
  satPositionsKm,
  groundStations,
  utcMs,
  prevQuaternion,
  dt,
) {
  const config = bodyFrameConfig || {};
  const mode = config.pointingMode || 'nadir';
  const slewRate = config.slewRateDegSec || 1;
  const targets = config.pointingTargets || [];

  // 1) Compute desired quaternion
  let desiredQ;
  let pointingTargetId = null;

  if (mode === 'nadir' || targets.length === 0) {
    desiredQ = computeLVLHQuaternion(posECI_km, velECI_kms);
  } else {
    // Target tracking: walk priority list, find first whose conditions are met
    desiredQ = computeLVLHQuaternion(posECI_km, velECI_kms); // fallback to nadir
    const sortedTargets = [...targets].sort((a, b) => (a.priority || 99) - (b.priority || 99));

    for (const tgt of sortedTargets) {
      const tPos = resolveTargetPos(tgt, satPositionsKm, groundStations, utcMs);
      if (!tPos) continue;
      if (checkConditions(tgt, posECI_km, tPos, groundStations, utcMs)) {
        desiredQ = computeTargetQuaternion(posECI_km, velECI_kms, [tPos.x, tPos.y, tPos.z]);
        pointingTargetId = tgt.targetId;
        break;
      }
    }
  }

  // 2) Slew-rate limiting via SLERP
  if (!prevQuaternion || prevQuaternion.every(v => v === 0)) {
    return { quaternion: desiredQ, pointingTargetId, isSlewing: false };
  }

  const angleDeg = quaternionAngleDeg(prevQuaternion, desiredQ);
  const maxAngleThisStep = slewRate * dt; // degrees we can rotate this step

  if (angleDeg <= maxAngleThisStep + 0.001) {
    // Can reach desired in this step
    return { quaternion: desiredQ, pointingTargetId, isSlewing: false };
  }

  // Partial slew
  const t = maxAngleThisStep / angleDeg;
  const slewedQ = slerpQuaternion(prevQuaternion, desiredQ, t);
  return { quaternion: slewedQ, pointingTargetId, isSlewing: true };
}

module.exports = {
  computeLVLHQuaternion,
  computeTargetQuaternion,
  slerpQuaternion,
  quaternionAngleDeg,
  computeAttitude,
  resolveTargetPos,
  checkConditions,
};
