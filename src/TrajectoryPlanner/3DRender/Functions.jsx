import * as THREE from 'three';

export function meanToEccentricAnomaly(M, e, tolerance = 1e-6) {
    // Normalize mean anomaly M to the range 0 to 2π
      M = M % (2 * Math.PI);
      if (M < 0) {
          M += 2 * Math.PI;
      }
  
      let E = M; // Initial guess for E is M
      let delta = 1;
      
      while (Math.abs(delta) > tolerance) {
          delta = (M - (E - e * Math.sin(E))) / (1 - e * Math.cos(E));
          E += delta;
      }
      
      return E;
  }

  export function eccentricToTrueAnomaly(E, e) {
    // Calculate the true anomaly (ν) from eccentric anomaly (E) and eccentricity (e)
    const tanNuOver2 = Math.sqrt((1 + e) / (1 - e)) * Math.tan(E / 2);
    let nu = 2 * Math.atan(tanNuOver2);

    // Adjust ν to be within 0 to 2π
    if (nu < 0) {
        nu += 2 * Math.PI;
    }

    return nu;
}

export function applyZ_X_Z_Rotation(vector, thetaZ1, thetaX, thetaZ2) {
    // https://www.mecademic.com/academic_articles/space-orientation-euler-angles/
    // Convert degrees to radians
    // Create rotation matrix for Z-axis
    function rotateZ(rad) {
        return [
            [Math.cos(rad), -Math.sin(rad), 0],
            [Math.sin(rad), Math.cos(rad), 0],
            [0, 0, 1]
        ];
    }

    // Create rotation matrix for X-axis
    function rotateX(rad) {
        return [
            [1, 0, 0],
            [0, Math.cos(rad), -Math.sin(rad)],
            [0, Math.sin(rad), Math.cos(rad)]
        ];
    }

    // Multiply two 3x3 matrices
    function multiplyMatrices(a, b) {
        const result = [
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0]
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

    // Create rotation matrices
    const Rz1 = rotateZ(thetaZ1); // First Z-axis rotation
    const Rx = rotateX(thetaX);   // X-axis rotation
    const Rz2 = rotateZ(thetaZ2); // Second Z-axis rotation

    // Combine rotations: R = Rz2 * Rx * Rz1
    const combinedRotation = multiplyMatrices(Rz2, multiplyMatrices(Rx, Rz1));

    // Apply the combined rotation matrix to the vector
    const result = [
        combinedRotation[0][0] * vector[0] + combinedRotation[0][1] * vector[1] + combinedRotation[0][2] * vector[2],
        combinedRotation[1][0] * vector[0] + combinedRotation[1][1] * vector[1] + combinedRotation[1][2] * vector[2],
        combinedRotation[2][0] * vector[0] + combinedRotation[2][1] * vector[1] + combinedRotation[2][2] * vector[2]
    ];

    return result;
}



export function keplerianToCartesian({a, e, M, Ω, ω, i}) {
    // Constants
    const mu = 398600.4418; // Standard gravitational parameter for Earth in km^3/s^2

    // Calculate Eccentric Anomaly (E)
    const E = meanToEccentricAnomaly(M, e);

    // Calculate True Anomaly (ν)
    const ν = eccentricToTrueAnomaly(E, e);

    // Calculate the distance (r) from the focus to the satellite
    const r = a * (1 - e * Math.cos(E));

    // Calculate position in the orbital plane (x', y', 0)
    const x_prime = r * Math.cos(ν);
    const y_prime = r * Math.sin(ν);
    const z_prime = 0;

    // Calculate velocity in the orbital plane (vx', vy', 0)
    const h = Math.sqrt(mu * a * (1 - e * e)); // Specific angular momentum
    const vx_prime = -mu / h * Math.sin(E);
    const vy_prime = mu / h * Math.sqrt(1 - e * e) * Math.cos(E);
    const vz_prime = 0;

    const Position_prime = [x_prime, y_prime, z_prime];
    const Velocity_prime = [vx_prime, vy_prime, vz_prime];

    const Position = applyZ_X_Z_Rotation(Position_prime, Ω, i, ω);
    const Velocity = applyZ_X_Z_Rotation(Velocity_prime, Ω, i, ω);

    return [Position, Velocity];
}

export function cartesianToKeplerian(position, velocity) {
    // Constants
    const mu = 398600.4418; // Standard gravitational parameter for Earth in km^3/s^2

    // Extract position and velocity components
    const x = position.x;
    const y = position.y;
    const z = position.z;
    const vx = velocity.x;
    const vy = velocity.y;
    const vz = velocity.z;

    // Calculate the distance (r) and speed (v)
    const r = Math.sqrt(x*x + y*y + z*z);
    const v = Math.sqrt(vx*vx + vy*vy + vz*vz);

    // Specific angular momentum vector (h = r x v)
    const hx = y*vz - z*vy;
    const hy = z*vx - x*vz;
    const hz = x*vy - y*vx;
    const h = Math.sqrt(hx*hx + hy*hy + hz*hz);

    // Inclination (i)
    const i = Math.acos(hz / h);

    // Node line (N = k x h)
    const Nx = -hy;
    const Ny = hx;
    const Nz = 0;
    const N = Math.sqrt(Nx*Nx + Ny*Ny);

    // Longitude of ascending node (Ω)
    let Ω = Math.acos(Nx / N);
    if (Ny < 0) {
        Ω = 2 * Math.PI - Ω;
    }

    // Eccentricity vector (e = (v x h)/mu - r/r)
    const ex = (vy*hz - vz*hy) / mu - x / r;
    const ey = (vz*hx - vx*hz) / mu - y / r;
    const ez = (vx*hy - vy*hx) / mu - z / r;
    const e = Math.sqrt(ex*ex + ey*ey + ez*ez);

    // Argument of periapsis (ω)
    let ω = Math.acos((Nx*ex + Ny*ey) / (N * e));
    if (ez < 0) {
        ω = 2 * Math.PI - ω;
    }

    // True anomaly (ν)
    let ν = Math.acos((ex*x + ey*y + ez*z) / (e * r));
    if ((x*vx + y*vy + z*vz) < 0) {
        ν = 2 * Math.PI - ν;
    }

    // Semi-major axis (a)
    const a = 1 / (2/r - v*v/mu);

    return {
        a: a,
        e: e,
        i: i * 180 / Math.PI, // convert to degrees
        Ω: Ω * 180 / Math.PI, // convert to degrees
        ω: ω * 180 / Math.PI, // convert to degrees
        ν: ν * 180 / Math.PI  // convert to degrees
    };
}