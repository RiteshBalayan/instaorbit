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

export function eccentricToMeanAnomaly(E, e) {
    // Calculate the mean anomaly using Kepler's equation
    const M = E - e * Math.sin(E);
    return M;
}

export function trueToEccentricAnomaly(nu, e) {
    // Calculate the eccentric anomaly (E) from true anomaly (ν) and eccentricity (e)
    const tanEOver2 = Math.sqrt((1 - e) / (1 + e)) * Math.tan(nu / 2);
    let E = 2 * Math.atan(tanEOver2);

    // Adjust E to be within 0 to 2π
    if (E < 0) {
        E += 2 * Math.PI;
    }

    return E;
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
    const combinedRotation = multiplyMatrices(Rz1, multiplyMatrices(Rx, Rz2));

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
    const vx_prime = -(mu / h) * Math.sin(ν);
    const vy_prime = (mu / h) * (e + Math.cos(ν));
    const vz_prime = 0;

    const Position_prime = [x_prime, y_prime, z_prime];
    const Velocity_prime = [vx_prime, vy_prime, vz_prime];
    console.log("velocity without rotation")
    console.log(Math.sqrt(Velocity_prime[0]**2 + Velocity_prime[1]**2 + Velocity_prime[2]**2))

    const Position = applyZ_X_Z_Rotation(Position_prime, Ω, i, ω);
    const Velocity = applyZ_X_Z_Rotation(Velocity_prime, Ω, i, ω);

    return [Position, Velocity];
}

export function keplerianToCartesianTrueAnomly({a, e, ν, Ω, ω, i}) {
    // Constants
    const mu = 398600.4418; // Standard gravitational parameter for Earth in km^3/s^2

    // Calculate Eccentric Anomaly (E)
    const E = trueToEccentricAnomaly(ν, e);

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


export function cartesianToKeplerian({ position, velocity }) {
    const mu = 398600.4418; // Standard gravitational parameter for Earth in km^3/s^2
    const epsilon = 1e-8; // Small threshold to avoid division by zero

    const [x, y, z] = position;
    const [vx, vy, vz] = velocity;

    const r = Math.sqrt(x * x + y * y + z * z);
    const v = Math.sqrt(vx * vx + vy * vy + vz * vz);

    const hx = y * vz - z * vy;
    const hy = z * vx - x * vz;
    const hz = x * vy - y * vx;
    const h = Math.sqrt(hx * hx + hy * hy + hz * hz);

    let i = 0;
    if (h > epsilon) {
        i = Math.acos(hz / h);
    }

    const Nx = -hy;
    const Ny = hx;
    const N = Math.sqrt(Nx * Nx + Ny * Ny);

    let Ω = 0;
    if (i > epsilon && N > epsilon) { // Inclination not zero
        Ω = Math.acos(Nx / N);
        if (Ny < 0) Ω = 2 * Math.PI - Ω;
    }

    const ex = (vy * hz - vz * hy) / mu - x / r;
    const ey = (vz * hx - vx * hz) / mu - y / r;
    const ez = (vx * hy - vy * hx) / mu - z / r;
    const e = Math.sqrt(ex * ex + ey * ey + ez * ez);

    let ω = 0;
    let ν = 0;
    if (e > epsilon) { // Non-circular orbit
        if (N > epsilon) {
            ω = Math.acos((Nx * ex + Ny * ey) / (N * e));
            if (ez < 0) ω = 2 * Math.PI - ω;
        }
        ν = Math.acos((ex * x + ey * y + ez * z) / (e * r));
        if ((x * vx + y * vy + z * vz) < 0) ν = 2 * Math.PI - ν;
    } else { // Circular orbit
        if (N > epsilon) { // Circular inclined orbit
            ν = Math.acos((Nx * x + Ny * y) / (N * r));
            if (z < 0) ν = 2 * Math.PI - ν;
            ω = 0;
        } else { // Equatorial circular orbit
            ν = Math.acos(x / r);
            if (y < 0) ν = 2 * Math.PI - ν;
            Ω = 0;
        }
    }

    const a = 1 / (2 / r - (v * v) / mu);

    return { a, e, i, Ω, ω, ν };
}



function ensureDate(input) {
    if (!(input instanceof Date)) {
        return new Date(input);
    }
    return input;
}

export function getTLE(keplerElements, time) {
    const {
        a,        // Semi-major axis (km)
        e,        // Eccentricity
        M,        // Mean anomaly (radians)
        Ω,        // Right ascension of ascending node (radians)
        ω,        // Argument of periapsis (radians)
        i         // Inclination (radians)
    } = keplerElements;

    // Ensure time is a Date object
    time = ensureDate(time);
    const mu = 398600.4418; // Standard gravitational parameter for Earth in km^3/s^2

    // Convert radians to degrees
    const radToDeg = (rad) => rad * (180 / Math.PI);

    // Helper function to format numbers with leading zeros
    const formatNumber = (num, length) => num.toString().padStart(length, '0');

    const epochYear = time.getUTCFullYear() % 100;

    function getDayOfYear(date) {
        const startOfYear = new Date(date.getUTCFullYear(), 0, 1);
        
        // Calculate the day of the year
        const dayOfYear = Math.floor((date - startOfYear) / (1000 * 60 * 60 * 24)) + 1;
    
        // Format the day of the year to three significant figures
        const formattedDayOfYear = dayOfYear.toString().padStart(3, '0');

        return formattedDayOfYear;
    }

    const epochday = getDayOfYear(time);

    function getFractionOfDay(time) {

        const dayStart = new Date(time).setHours(0, 0, 0, 0);
    
        // Calculate the fraction of the day
        const fractionDay = (time - dayStart) / (1000 * 60 * 60 * 24);
    
        // Remove the decimal by multiplying with 100000000 and convert to integer
        const fractionScaled = Math.floor(fractionDay * 100000000);
    
        // Convert to string and get only the first 8 digits
        const resultString = fractionScaled.toString().substring(0, 8);
    
        // Convert back to number (if needed)
        const result = parseInt(resultString, 10);
    
        return result;
    }

    const fractionday = getFractionOfDay(time);

    // Placeholder for inclination, RAAN, etc.
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

    // Calculate mean motion
    // Convert to orbits per day
    const MeanMotion = Math.sqrt(mu / Math.pow(a, 3))
    const meanMotionOrbitsPerDay = ((MeanMotion * 86400) / (2 * Math.PI)).toFixed(8);
    const formatedMeanMotion = meanMotionOrbitsPerDay.toString().padStart(11, '0');

    // Construct TLE strings
    const line1 = `1 25544U 98067A   ${epochYear}${epochday}.${fractionday} -.00002182  00000-0 -11606-4 0  2927`;
    const line2 = `2 25544 ${formatedinclination} ${formatedraan} ${formattedeccentricity} ${formatedarOfPeriapsis} ${formatedmeanAnomly} ${formatedMeanMotion}000000`;

    return [line1, line2];
}