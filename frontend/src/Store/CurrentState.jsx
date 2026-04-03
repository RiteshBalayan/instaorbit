import { createSlice } from '@reduxjs/toolkit';

// Constants
const EARTH_RADIUS_KM = 6378.137;
const SCALE_TO_KM = 3185.5;

// Helper function to calculate derived orbital values
const calculateDerivedValues = (coordinates, velocity, elements) => {
  if (!coordinates || coordinates.x === undefined) {
    return {};
  }

  // Position in km (coordinates are scaled)
  const xKm = coordinates.x * SCALE_TO_KM;
  const yKm = coordinates.y * SCALE_TO_KM;
  const zKm = coordinates.z * SCALE_TO_KM;

  // Distance from Earth center (km)
  const radiusKm = Math.sqrt(xKm * xKm + yKm * yKm + zKm * zKm);

  // Altitude above Earth surface (km)
  // Prefer geodetic alt from backend if available, else compute from ECI radius
  const altitudeKm = (coordinates.alt != null) ? coordinates.alt : (radiusKm - EARTH_RADIUS_KM);

  // Latitude and Longitude
  // Prefer proper geodetic lat/lon from backend (GMST-based ECEF→geodetic)
  // Fall back to ECI-based spherical coords (incorrect for Earth-fixed display)
  let latDeg, lonDeg;
  if (coordinates.lat != null && coordinates.lon != null) {
    latDeg = coordinates.lat;
    lonDeg = coordinates.lon;
  } else {
    const latRad = Math.asin(zKm / radiusKm);
    const lonRad = Math.atan2(yKm, xKm);
    latDeg = latRad * (180 / Math.PI);
    lonDeg = lonRad * (180 / Math.PI);
  }

  // Speed magnitude (km/s)
  let speedKmS = 0;
  if (velocity && Array.isArray(velocity) && velocity.length >= 3) {
    speedKmS = Math.sqrt(
      velocity[0] * velocity[0] + 
      velocity[1] * velocity[1] + 
      velocity[2] * velocity[2]
    );
  }

  // Orbital period (seconds) - from semi-major axis if available
  let orbitalPeriodSec = null;
  if (elements && elements.a) {
    const mu = 398600.4418; // km³/s²
    orbitalPeriodSec = 2 * Math.PI * Math.sqrt(Math.pow(elements.a, 3) / mu);
  }

  // Mean motion (rad/s)
  let meanMotionRadS = null;
  if (orbitalPeriodSec) {
    meanMotionRadS = (2 * Math.PI) / orbitalPeriodSec;
  }

  // Perigee and Apogee altitudes
  let perigeeAltKm = null;
  let apogeeAltKm = null;
  if (elements && elements.a && elements.e !== undefined) {
    const perigeeRadius = elements.a * (1 - elements.e);
    const apogeeRadius = elements.a * (1 + elements.e);
    perigeeAltKm = perigeeRadius - EARTH_RADIUS_KM;
    apogeeAltKm = apogeeRadius - EARTH_RADIUS_KM;
  }

  return {
    // Position derived
    radiusKm,
    altitudeKm,
    latDeg,
    lonDeg,
    
    // Velocity derived
    speedKmS,
    
    // Orbital derived
    orbitalPeriodSec,
    orbitalPeriodMin: orbitalPeriodSec ? orbitalPeriodSec / 60 : null,
    meanMotionRadS,
    perigeeAltKm,
    apogeeAltKm,
  };
};

// Initial state for current coordinates
const initialState = {
  satelite: [],
};

const CurrentState = createSlice({
  name: 'CurrentState',
  initialState,
  reducers: {
    updateCoordinate: (state, action) => {
      const { 
        id, 
        coordinates, 
        elements, 
        timefix, 
        velocity, 
        kineticEnergy, 
        potentialEnergy, 
        totalEnergy,
        attitude,
      } = action.payload;
      
      const existingIndex = state.satelite.findIndex(p => p.id === id);

      // Calculate derived values
      const derived = calculateDerivedValues(coordinates, velocity, elements);

      if (existingIndex !== -1) {
        // Create a new object with updated properties to ensure reference change
        state.satelite[existingIndex] = {
          ...state.satelite[existingIndex],
          coordinates: coordinates ? { ...coordinates } : state.satelite[existingIndex].coordinates,
          elements: elements ? { ...elements } : state.satelite[existingIndex].elements,
          timefix,
          velocity: velocity !== undefined ? velocity : state.satelite[existingIndex].velocity,
          kineticEnergy: kineticEnergy !== undefined ? kineticEnergy : state.satelite[existingIndex].kineticEnergy,
          potentialEnergy: potentialEnergy !== undefined ? potentialEnergy : state.satelite[existingIndex].potentialEnergy,
          totalEnergy: totalEnergy !== undefined ? totalEnergy : state.satelite[existingIndex].totalEnergy,
          attitude: attitude !== undefined ? attitude : state.satelite[existingIndex].attitude,
          // Derived values
          ...derived,
          lastUpdate: Date.now(),
        };
      } else {
        // Add new satelite with coordinates
        state.satelite.push({ 
          id, 
          coordinates: coordinates ? { ...coordinates } : {}, 
          elements: elements ? { ...elements } : {}, 
          timefix,
          velocity,
          kineticEnergy,
          potentialEnergy,
          totalEnergy,
          attitude: attitude || { quaternion: [0, 0, 0, 1], pointingTarget: null, isSlewing: false, slewProgress: 0 },
          // Derived values
          ...derived,
          lastUpdate: Date.now(),
        });
      }
    },
    
    // Update eclipse state for a satellite
    updateEclipseState: (state, action) => {
      const { id, inEclipse, eclipseFraction } = action.payload;
      const sat = state.satelite.find(s => s.id === id);
      if (sat) {
        sat.inEclipse = inEclipse;
        sat.eclipseFraction = eclipseFraction; // 0 = full sunlight, 1 = full shadow
        sat.lastUpdate = Date.now();
      }
    },
    
    // Update sub-satellite point (ground track position)
    updateSubSatellitePoint: (state, action) => {
      const { id, subSatLat, subSatLon } = action.payload;
      const sat = state.satelite.find(s => s.id === id);
      if (sat) {
        sat.subSatLat = subSatLat;
        sat.subSatLon = subSatLon;
        sat.lastUpdate = Date.now();
      }
    },

    // Update attitude (quaternion + pointing target) for a satellite
    updateAttitude: (state, action) => {
      const { id, attitude } = action.payload;
      const sat = state.satelite.find(s => s.id === id);
      if (sat) {
        sat.attitude = { ...(sat.attitude || {}), ...attitude };
        sat.lastUpdate = Date.now();
      }
    },
    
    // Batch update multiple satellites
    updateMultipleCoordinates: (state, action) => {
      const updates = action.payload; // Array of { id, coordinates, elements, ... }
      updates.forEach(update => {
        const { id, coordinates, elements, timefix, velocity, kineticEnergy, potentialEnergy, totalEnergy, attitude } = update;
        const existingIndex = state.satelite.findIndex(p => p.id === id);
        const derived = calculateDerivedValues(coordinates, velocity, elements);
        
        if (existingIndex !== -1) {
          state.satelite[existingIndex] = {
            ...state.satelite[existingIndex],
            coordinates: coordinates ? { ...coordinates } : state.satelite[existingIndex].coordinates,
            elements: elements ? { ...elements } : state.satelite[existingIndex].elements,
            timefix,
            velocity: velocity !== undefined ? velocity : state.satelite[existingIndex].velocity,
            kineticEnergy: kineticEnergy !== undefined ? kineticEnergy : state.satelite[existingIndex].kineticEnergy,
            potentialEnergy: potentialEnergy !== undefined ? potentialEnergy : state.satelite[existingIndex].potentialEnergy,
            totalEnergy: totalEnergy !== undefined ? totalEnergy : state.satelite[existingIndex].totalEnergy,
            attitude: attitude !== undefined ? attitude : state.satelite[existingIndex].attitude,
            ...derived,
            lastUpdate: Date.now(),
          };
        } else {
          state.satelite.push({
            id,
            coordinates: coordinates ? { ...coordinates } : {},
            elements: elements ? { ...elements } : {},
            timefix,
            velocity,
            kineticEnergy,
            potentialEnergy,
            totalEnergy,
            attitude: attitude || { quaternion: [0, 0, 0, 1], pointingTarget: null, isSlewing: false, slewProgress: 0 },
            ...derived,
            lastUpdate: Date.now(),
          });
        }
      });
    },
    
    deleteState: (state, action) => {
      const idToDelete = action.payload;
      state.satelite = state.satelite.filter(s => s.id !== idToDelete);
    },
    
    // Clear all satellite states
    clearAllStates: (state) => {
      state.satelite = [];
    },
  },
  extraReducers: (builder) => {
    builder.addCase('SET_CURRENTSTATE', (state, action) => {
      return action.payload;
    });
  },
});

export const { 
  updateCoordinate, 
  deleteState,
  updateEclipseState,
  updateSubSatellitePoint,
  updateAttitude,
  updateMultipleCoordinates,
  clearAllStates,
} = CurrentState.actions;

export { EARTH_RADIUS_KM, SCALE_TO_KM };
export default CurrentState.reducer;
