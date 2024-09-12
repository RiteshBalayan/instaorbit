import { meanToEccentricAnomaly, eccentricToTrueAnomaly, applyZ_X_Z_Rotation } from "./Functions";



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