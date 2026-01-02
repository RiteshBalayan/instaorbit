// Simulation helper functions ported from frontend `Functions.jsx`

function meanToEccentricAnomaly(M, e, tolerance = 1e-6) {
  M = M % (2 * Math.PI);
  if (M < 0) M += 2 * Math.PI;
  let E = M;
  let delta = 1;
  while (Math.abs(delta) > tolerance) {
    delta = (M - (E - e * Math.sin(E))) / (1 - e * Math.cos(E));
    E += delta;
  }
  return E;
}

function eccentricToTrueAnomaly(E, e) {
  const tanNuOver2 = Math.sqrt((1 + e) / (1 - e)) * Math.tan(E / 2);
  let nu = 2 * Math.atan(tanNuOver2);
  if (nu < 0) nu += 2 * Math.PI;
  return nu;
}

function eccentricToMeanAnomaly(E, e) {
  return E - e * Math.sin(E);
}

function trueToEccentricAnomaly(nu, e) {
  const tanEOver2 = Math.sqrt((1 - e) / (1 + e)) * Math.tan(nu / 2);
  let E = 2 * Math.atan(tanEOver2);
  if (E < 0) E += 2 * Math.PI;
  return E;
}

function applyZ_X_Z_Rotation(vector, thetaZ1, thetaX, thetaZ2) {
  function rotateZ(rad) {
    return [
      [Math.cos(rad), -Math.sin(rad), 0],
      [Math.sin(rad), Math.cos(rad), 0],
      [0, 0, 1],
    ];
  }
  function rotateX(rad) {
    return [
      [1, 0, 0],
      [0, Math.cos(rad), -Math.sin(rad)],
      [0, Math.sin(rad), Math.cos(rad)],
    ];
  }
  function multiplyMatrices(a, b) {
    const result = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        for (let k = 0; k < 3; k++) {
          result[i][j] += a[i][k] * b[k][j];
        }
      }
    }
    return result;
  }
  const Rz1 = rotateZ(thetaZ1);
  const Rx = rotateX(thetaX);
  const Rz2 = rotateZ(thetaZ2);
  const combinedRotation = multiplyMatrices(Rz1, multiplyMatrices(Rx, Rz2));
  return [
    combinedRotation[0][0] * vector[0] + combinedRotation[0][1] * vector[1] + combinedRotation[0][2] * vector[2],
    combinedRotation[1][0] * vector[0] + combinedRotation[1][1] * vector[1] + combinedRotation[1][2] * vector[2],
    combinedRotation[2][0] * vector[0] + combinedRotation[2][1] * vector[1] + combinedRotation[2][2] * vector[2],
  ];
}

function keplerianToCartesian({ a, e, M, Ω, ω, i }) {
  const mu = 398600.4418;
  const E = meanToEccentricAnomaly(M, e);
  const ν = eccentricToTrueAnomaly(E, e);
  const r = a * (1 - e * Math.cos(E));
  const x_prime = r * Math.cos(ν);
  const y_prime = r * Math.sin(ν);
  const h = Math.sqrt(mu * a * (1 - e * e));
  const vx_prime = -(mu / h) * Math.sin(ν);
  const vy_prime = (mu / h) * (e + Math.cos(ν));
  const Position = applyZ_X_Z_Rotation([x_prime, y_prime, 0], Ω, i, ω);
  const Velocity = applyZ_X_Z_Rotation([vx_prime, vy_prime, 0], Ω, i, ω);
  return [Position, Velocity];
}

function keplerianToCartesianTrueAnomly({ a, e, ν, Ω, ω, i }) {
  const mu = 398600.4418;
  const E = trueToEccentricAnomaly(ν, e);
  const r = a * (1 - e * Math.cos(E));
  const x_prime = r * Math.cos(ν);
  const y_prime = r * Math.sin(ν);
  const h = Math.sqrt(mu * a * (1 - e * e));
  const vx_prime = -mu / h * Math.sin(E);
  const vy_prime = mu / h * Math.sqrt(1 - e * e) * Math.cos(E);
  const Position = applyZ_X_Z_Rotation([x_prime, y_prime, 0], Ω, i, ω);
  const Velocity = applyZ_X_Z_Rotation([vx_prime, vy_prime, 0], Ω, i, ω);
  return [Position, Velocity];
}

function cartesianToKeplerian({ position, velocity }) {
  const mu = 398600.4418;
  const epsilon = 1e-8;
  const [x, y, z] = position;
  const [vx, vy, vz] = velocity;
  const r = Math.sqrt(x * x + y * y + z * z);
  const v = Math.sqrt(vx * vx + vy * vy + vz * vz);
  const hx = y * vz - z * vy;
  const hy = z * vx - x * vz;
  const hz = x * vy - y * vx;
  const h = Math.sqrt(hx * hx + hy * hy + hz * hz);
  let i = 0;
  if (h > epsilon) i = Math.acos(hz / h);
  const Nx = -hy;
  const Ny = hx;
  const N = Math.sqrt(Nx * Nx + Ny * Ny);
  let Ω = 0;
  if (i > epsilon && N > epsilon) {
    Ω = Math.acos(Nx / N);
    if (Ny < 0) Ω = 2 * Math.PI - Ω;
  }
  const ex = (vy * hz - vz * hy) / mu - x / r;
  const ey = (vz * hx - vx * hz) / mu - y / r;
  const ez = (vx * hy - vy * hx) / mu - z / r;
  const e = Math.sqrt(ex * ex + ey * ey + ez * ez);
  let ω = 0;
  let ν = 0;
  if (e > epsilon) {
    if (N > epsilon) {
      ω = Math.acos((Nx * ex + Ny * ey) / (N * e));
      if (ez < 0) ω = 2 * Math.PI - ω;
    }
    ν = Math.acos((ex * x + ey * y + ez * z) / (e * r));
    if ((x * vx + y * vy + z * vz) < 0) ν = 2 * Math.PI - ν;
  } else {
    if (N > epsilon) {
      ν = Math.acos((Nx * x + Ny * y) / (N * r));
      if (z < 0) ν = 2 * Math.PI - ν;
      ω = 0;
    } else {
      ν = Math.acos(x / r);
      if (y < 0) ν = 2 * Math.PI - ν;
      Ω = 0;
    }
  }
  const a = 1 / (2 / r - (v * v) / mu);
  return { a, e, i, Ω, ω, ν };
}

function ensureDate(input) {
  if (!(input instanceof Date)) return new Date(input);
  return input;
}

function getTLE(keplerElements, time) {
  const { a, e, M, Ω, ω, i } = keplerElements;
  time = ensureDate(time);
  const mu = 398600.4418;
  const radToDeg = (rad) => rad * (180 / Math.PI);
  const epochYear = time.getUTCFullYear() % 100;
  function getDayOfYear(date) {
    const startOfYear = new Date(date.getUTCFullYear(), 0, 1);
    const dayOfYear = Math.floor((date - startOfYear) / (1000 * 60 * 60 * 24)) + 1;
    return dayOfYear.toString().padStart(3, '0');
  }
  const epochday = getDayOfYear(time);
  function getFractionOfDay(time) {
    const dayStart = new Date(time).setHours(0, 0, 0, 0);
    const fractionDay = (time - dayStart) / (1000 * 60 * 60 * 24);
    const fractionScaled = Math.floor(fractionDay * 100000000);
    const resultString = fractionScaled.toString().substring(0, 8);
    return parseInt(resultString, 10);
  }
  const fractionday = getFractionOfDay(time);
  const inclination = radToDeg(i).toFixed(4);
  const formatedinclination = inclination.toString().padStart(8, '0');
  const raan = radToDeg(Ω).toFixed(4);
  const formatedraan = raan.toString().padStart(8, '0');
  const argOfPeriapsis = radToDeg(ω).toFixed(4);
  const formatedarOfPeriapsis = argOfPeriapsis.toString().padStart(8, '0');
  const meanAnomaly = radToDeg(M).toFixed(4);
  const formatedmeanAnomly = meanAnomaly.toString().padStart(8, '0');
  const eccentricity = Math.floor(e * 10000000);
  const formattedeccentricity = eccentricity.toString().padStart(7, '0');
  const MeanMotion = Math.sqrt(mu / Math.pow(a, 3));
  const meanMotionOrbitsPerDay = ((MeanMotion * 86400) / (2 * Math.PI)).toFixed(8);
  const formatedMeanMotion = meanMotionOrbitsPerDay.toString().padStart(11, '0');
  const line1 = `1 25544U 98067A   ${epochYear}${epochday}.${fractionday} -.00002182  00000-0 -11606-4 0  2927`;
  const line2 = `2 25544 ${formatedinclination} ${formatedraan} ${formattedeccentricity} ${formatedarOfPeriapsis} ${formatedmeanAnomly} ${formatedMeanMotion}000000`;
  return [line1, line2];
}

module.exports = {
  meanToEccentricAnomaly,
  eccentricToTrueAnomaly,
  eccentricToMeanAnomaly,
  trueToEccentricAnomaly,
  applyZ_X_Z_Rotation,
  keplerianToCartesian,
  keplerianToCartesianTrueAnomly,
  cartesianToKeplerian,
  getTLE,
};
