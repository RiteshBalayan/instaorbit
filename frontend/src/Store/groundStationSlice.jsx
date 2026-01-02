import { createSlice } from '@reduxjs/toolkit';

// Default ground station configuration
const defaultGroundStationParams = {
  // Antenna parameters
  txAperture: 0.5,          // TX aperture diameter (meters)
  rxAperture: 0.5,          // RX aperture diameter (meters)
  antennaType: 'dish',      // 'dish', 'phased_array', 'horn', 'patch'
  antennaEfficiency: 0.55,  // Antenna efficiency (0-1)
  
  // Frequency/wavelength
  wavelengthNm: 1550,       // Operating wavelength (nm) - optical
  frequencyGHz: null,       // Operating frequency (GHz) - RF (optional)
  
  // Power and losses
  txPowerMw: 300,           // Transmit power (mW)
  systemLoss: 2,            // System implementation loss (dB)
  pointingLoss: 2,          // Pointing loss (dB)
  atmosphericLoss: 1.5,     // Atmospheric loss (dB)
  
  // Receiver parameters
  noiseFloor: -95,          // Receiver noise floor (dBm)
  requiredSnr: 10,          // Required SNR for link closure (dB)
  
  // Antenna constraints
  minElevationDeg: 5,       // Minimum elevation angle (degrees)
  maxElevationDeg: 90,      // Maximum elevation angle (degrees)
  azimuthMin: 0,            // Minimum azimuth (degrees)
  azimuthMax: 360,          // Maximum azimuth (degrees)
  slewRateDegSec: 5,        // Antenna slew rate (deg/sec)
  
  // Operational
  status: 'online',         // 'online', 'offline', 'maintenance'
  operationalHoursStart: 0, // Start hour (0-23, UTC)
  operationalHoursEnd: 24,  // End hour (0-24, UTC), 24 = 24/7
};

const initialState = {
  groundStations: [],
  // Track current visibility/contact info per ground station
  contactWindows: {},       // { gsId: [{ satId, aos, los, maxElevation }] }
  currentTracking: {},      // { gsId: satId } - which satellite each GS is tracking
};

const groundStationSlice = createSlice({
  name: 'groundStations',
  initialState,
  reducers: {
    addGroundStation: (state, action) => {
      // Merge provided data with defaults
      const newStation = {
        ...defaultGroundStationParams,
        ...action.payload,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      state.groundStations.push(newStation);
    },
    updateGroundStation: (state, action) => {
      const { id, changes } = action.payload;
      const station = state.groundStations.find((gs) => gs.id === id);
      if (station) {
        Object.assign(station, changes, { updatedAt: Date.now() });
      }
    },
    deleteGroundStation: (state, action) => {
      const id = action.payload;
      state.groundStations = state.groundStations.filter((gs) => gs.id !== id);
      // Clean up related data
      delete state.contactWindows[id];
      delete state.currentTracking[id];
    },
    // Update contact windows for a ground station
    setContactWindows: (state, action) => {
      const { gsId, windows } = action.payload;
      state.contactWindows[gsId] = windows;
    },
    // Clear all contact windows
    clearContactWindows: (state) => {
      state.contactWindows = {};
    },
    // Set which satellite a ground station is tracking
    setTracking: (state, action) => {
      const { gsId, satId } = action.payload;
      state.currentTracking[gsId] = satId;
    },
    // Clear tracking for a ground station
    clearTracking: (state, action) => {
      const gsId = action.payload;
      delete state.currentTracking[gsId];
    },
    // Update ground station status
    setStationStatus: (state, action) => {
      const { id, status } = action.payload;
      const station = state.groundStations.find((gs) => gs.id === id);
      if (station) {
        station.status = status;
        station.updatedAt = Date.now();
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase('SET_GROUNDSTATIONS', (state, action) => {
      return action.payload;
    });
  },
});

export const { 
  addGroundStation, 
  updateGroundStation, 
  deleteGroundStation,
  setContactWindows,
  clearContactWindows,
  setTracking,
  clearTracking,
  setStationStatus,
} = groundStationSlice.actions;

export { defaultGroundStationParams };
export default groundStationSlice.reducer;
