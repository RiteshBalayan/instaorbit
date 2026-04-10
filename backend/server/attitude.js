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
  if (target.targetType === 'sun') {
    const sunDir = transforms.sunDirectionECI(utcMs);
    // Return a point very far along the sun direction (AU-scale)
    const AU_KM = 1.496e8;
    return { x: sunDir[0] * AU_KM, y: sunDir[1] * AU_KM, z: sunDir[2] * AU_KM };
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

  // Sun occlusion (Earth shadow) check for sun targets
  // Uses cylindrical shadow model: if the satellite is behind Earth relative
  // to the sun direction, the sun is occluded.
  if (target.targetType === 'sun' && cond.checkSunOcclusion !== false) {
    const EARTH_R = 6378.137;
    // Sun direction unit vector (from Earth to sun)
    const sunDir = transforms.sunDirectionECI(utcMs);
    // Project satellite position onto sun direction
    const dot = satPos[0] * sunDir[0] + satPos[1] * sunDir[1] + satPos[2] * sunDir[2];
    // If satellite is on the anti-sun side of Earth
    if (dot < 0) {
      // Perpendicular distance from satellite to sun-Earth line
      const projX = satPos[0] - dot * sunDir[0];
      const projY = satPos[1] - dot * sunDir[1];
      const projZ = satPos[2] - dot * sunDir[2];
      const perpDist = Math.sqrt(projX * projX + projY * projY + projZ * projZ);
      if (perpDist < EARTH_R) return false;  // In Earth's shadow
    }
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

// ─────────── Quaternion rotation helper ─────────────────────────

/**
 * Rotate a 3-vector by a unit quaternion q = [qx, qy, qz, qw].
 */
function quatRotateVec(q, v) {
  const [qx, qy, qz, qw] = q;
  // t = 2 * (q_vec × v)
  const tx = 2 * (qy * v[2] - qz * v[1]);
  const ty = 2 * (qz * v[0] - qx * v[2]);
  const tz = 2 * (qx * v[1] - qy * v[0]);
  return [
    v[0] + qw * tx + (qy * tz - qz * ty),
    v[1] + qw * ty + (qz * tx - qx * tz),
    v[2] + qw * tz + (qx * ty - qy * tx),
  ];
}

/**
 * Quaternion conjugate (inverse for unit quaternions).
 */
function quatConj(q) {
  return [-q[0], -q[1], -q[2], q[3]];
}

// ─────────── Parent axis helpers ────────────────────────────────

/**
 * Map a parentAxis string ('+X', '-Y', etc.) to a unit vector in body frame.
 */
function parentAxisToVec(axis) {
  switch (axis) {
    case '+X': return [1, 0, 0];
    case '-X': return [-1, 0, 0];
    case '+Y': return [0, 1, 0];
    case '-Y': return [0, -1, 0];
    case '+Z': return [0, 0, 1];
    case '-Z': return [0, 0, -1];
    default:   return [0, 1, 0];
  }
}

// ─────────── Component attitude computation ─────────────────────

/**
 * Compute articulation angles for all components of a satellite.
 *
 * For each component we compute:
 *   • solarPanel (1-DOF): a single rotation angle about the hinge axis
 *     so the panel normal faces the target (sun by default).
 *   • laserPointer (2-DOF): azimuth + elevation angles.
 *
 * The angles are expressed as deflections from the rest (zero) position
 * in the parent-axis frame.
 *
 * @param {Object[]} components       – array of component configs
 * @param {number[]} bodyQuaternion   – satellite body quaternion [qx,qy,qz,qw] (ECI→body)
 * @param {number[]} posECI_km        – satellite ECI position [x,y,z] km
 * @param {number[]} velECI_kms       – satellite ECI velocity km/s
 * @param {Object}   satPositionsKm   – all satellites' positions
 * @param {Array}    groundStations
 * @param {number}   utcMs
 * @param {Object}   prevComponentAngles – { compId: { a1, a2 } } from previous step
 * @param {number}   dt               – timestep seconds
 * @returns {Object} { compId: { a1, a2?, targetId } }
 */
function computeComponentAttitudes(
  components,
  bodyQuaternion,
  posECI_km,
  velECI_kms,
  satPositionsKm,
  groundStations,
  utcMs,
  prevComponentAngles,
  dt,
) {
  if (!components || components.length === 0) return {};

  const result = {};
  const bodyQInv = quatConj(bodyQuaternion);

  for (const comp of components) {
    const prev = (prevComponentAngles && prevComponentAngles[comp.id]) || { a1: 0, a2: 0 };
    const slewRate = comp.slewRateDegSec || 5;
    // ── Constraint ranges ─────────────────────────────────────
    // Solar panel (1-DOF): range for a1 (symmetric or asymmetric)
    // Laser (2-DOF):       range for a1, and max half-angle cone for a2
    //                      (a2 clamped so beam can't point through body)
    const constraint = comp.constraint || {};
    // Backward compat: if only maxAngleDeg exists, use it as symmetric ±range
    const legacyMax = constraint.maxAngleDeg != null ? constraint.maxAngleDeg : 180;
    const a1Min = constraint.minA1Deg != null ? constraint.minA1Deg : -legacyMax;
    const a1Max = constraint.maxA1Deg != null ? constraint.maxA1Deg : legacyMax;
    const a2Min = constraint.minA2Deg != null ? constraint.minA2Deg : -legacyMax;
    const a2Max = constraint.maxA2Deg != null ? constraint.maxA2Deg : legacyMax;

    // Fixed mode — just return the fixed angles
    if (comp.pointingMode === 'fixed') {
      const fa = comp.fixedAnglesDeg || { a1: 0, a2: 0 };
      result[comp.id] = {
        a1: clampRange(fa.a1, a1Min, a1Max),
        a2: comp.dof === 2 ? clampRange(fa.a2 || 0, a2Min, a2Max) : 0,
        targetId: null,
      };
      continue;
    }

    // Resolve target direction in ECI
    let targetPosECI = null;
    let targetId = null;

    if (comp.pointingMode === 'target' && comp.pointingTargets && comp.pointingTargets.length > 0) {
      const sorted = [...comp.pointingTargets].sort((a, b) => (a.priority || 99) - (b.priority || 99));
      for (const tgt of sorted) {
        const tPos = resolveTargetPos(tgt, satPositionsKm, groundStations, utcMs);
        if (!tPos) continue;
        if (checkConditions(tgt, posECI_km, tPos, groundStations, utcMs)) {
          targetPosECI = [tPos.x, tPos.y, tPos.z];
          targetId = tgt.targetId || tgt.id;
          break;
        }
      }
    }

    // Default target: sun for solar panels, nadir for laser pointers
    if (!targetPosECI) {
      if (comp.type === 'solarPanel') {
        const sunDir = transforms.sunDirectionECI(utcMs);
        const AU_KM = 1.496e8;
        targetPosECI = [sunDir[0] * AU_KM, sunDir[1] * AU_KM, sunDir[2] * AU_KM];
        targetId = 'sun';
      } else {
        // Nadir (Earth center)
        targetPosECI = [0, 0, 0];
        targetId = 'nadir';
      }
    }

    // Direction from satellite to target in ECI
    const dirECI = vec3Normalize(vec3Sub(targetPosECI, posECI_km));

    // Transform direction to body frame using inverse body quaternion
    const dirBody = quatRotateVec(bodyQInv, dirECI);

    // Get the parent (mounting) axis in body frame
    const pAxis = parentAxisToVec(comp.parentAxis || '+Y');

    if (comp.type === 'solarPanel' || comp.dof === 1) {
      // 1-DOF: rotate about the parent axis so the panel normal faces the target.
      // The panel normal at rest points along the parent axis.
      // The hinge axis is perpendicular to both the parent axis and a reference
      // axis (we pick the body-X or body-Z depending on parentAxis orientation).
      //
      // Project the target direction onto the plane perpendicular to the parent axis,
      // then measure the angle in that plane.

      // Project dirBody onto the plane perpendicular to pAxis
      const dot = vec3Dot(dirBody, pAxis);
      const proj = [
        dirBody[0] - dot * pAxis[0],
        dirBody[1] - dot * pAxis[1],
        dirBody[2] - dot * pAxis[2],
      ];
      const projLen = vec3Length(proj);

      let desiredA1 = 0;
      if (projLen > 1e-10) {
        // Reference direction: find a vector perpendicular to pAxis
        // If pAxis is ±Y, use X as reference; if ±X use Y; if ±Z use X
        let refVec;
        if (Math.abs(pAxis[1]) > 0.9) refVec = [1, 0, 0];
        else if (Math.abs(pAxis[0]) > 0.9) refVec = [0, 1, 0];
        else refVec = [1, 0, 0];

        // Make refVec perpendicular to pAxis
        const rDot = vec3Dot(refVec, pAxis);
        refVec = vec3Normalize([
          refVec[0] - rDot * pAxis[0],
          refVec[1] - rDot * pAxis[1],
          refVec[2] - rDot * pAxis[2],
        ]);

        const perpVec = vec3Normalize(vec3Cross(pAxis, refVec));
        const projNorm = vec3Normalize(proj);
        const c = vec3Dot(projNorm, refVec);
        const s = vec3Dot(projNorm, perpVec);
        desiredA1 = Math.atan2(s, c) * (180 / Math.PI);
      }

      // Apply constraint (per-axis range)
      desiredA1 = clampRange(desiredA1, a1Min, a1Max);

      // Apply slew rate limiting
      const a1 = slewLimitAngle(prev.a1, desiredA1, slewRate, dt);

      result[comp.id] = { a1, a2: 0, targetId };

    } else {
      // 2-DOF (alt-az gimbal, e.g. laserPointer)
      // Azimuth: rotation about parent axis
      // Elevation: tilt away from the parent-axis plane

      const dot = vec3Dot(dirBody, pAxis);

      // Project onto the plane perpendicular to pAxis for azimuth
      const proj = [
        dirBody[0] - dot * pAxis[0],
        dirBody[1] - dot * pAxis[1],
        dirBody[2] - dot * pAxis[2],
      ];
      const projLen = vec3Length(proj);

      // Elevation: angle between dirBody and the projection plane
      let desiredA2 = Math.atan2(dot, projLen) * (180 / Math.PI);

      // Azimuth
      let desiredA1 = 0;
      if (projLen > 1e-10) {
        let refVec;
        if (Math.abs(pAxis[1]) > 0.9) refVec = [1, 0, 0];
        else if (Math.abs(pAxis[0]) > 0.9) refVec = [0, 1, 0];
        else refVec = [1, 0, 0];

        const rDot = vec3Dot(refVec, pAxis);
        refVec = vec3Normalize([
          refVec[0] - rDot * pAxis[0],
          refVec[1] - rDot * pAxis[1],
          refVec[2] - rDot * pAxis[2],
        ]);
        const perpVec = vec3Normalize(vec3Cross(pAxis, refVec));
        const projNorm = vec3Normalize(proj);
        const c = vec3Dot(projNorm, refVec);
        const s = vec3Dot(projNorm, perpVec);
        desiredA1 = Math.atan2(s, c) * (180 / Math.PI);
      }

      // Apply per-axis range constraints
      desiredA1 = clampRange(desiredA1, a1Min, a1Max);
      desiredA2 = clampRange(desiredA2, a2Min, a2Max);

      const a1 = slewLimitAngle(prev.a1, desiredA1, slewRate, dt);
      const a2 = slewLimitAngle(prev.a2 || 0, desiredA2, slewRate, dt);

      result[comp.id] = { a1, a2, targetId };
    }
  }

  return result;
}

/**
 * Clamp an angle to [-maxAngle, +maxAngle].  (legacy, still used by body-level attitude)
 */
function clampAngle(deg, maxAngle) {
  return Math.max(-maxAngle, Math.min(maxAngle, deg));
}

/**
 * Clamp an angle to [minDeg, maxDeg] (asymmetric range).
 */
function clampRange(deg, minDeg, maxDeg) {
  return Math.max(minDeg, Math.min(maxDeg, deg));
}

/**
 * Apply slew-rate limiting to an angle transition.
 */
function slewLimitAngle(prevDeg, desiredDeg, slewRateDegSec, dt) {
  const maxStep = slewRateDegSec * dt;
  const diff = desiredDeg - prevDeg;
  if (Math.abs(diff) <= maxStep + 0.001) return desiredDeg;
  return prevDeg + Math.sign(diff) * maxStep;
}

module.exports = {
  computeLVLHQuaternion,
  computeTargetQuaternion,
  slerpQuaternion,
  quaternionAngleDeg,
  computeAttitude,
  resolveTargetPos,
  checkConditions,
  computeComponentAttitudes,
};
