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