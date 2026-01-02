import { createSlice } from '@reduxjs/toolkit';

// Default link configuration parameters
const defaultLinkParams = {
  wavelengthNm: 1550,       // Operating wavelength (nm)
  txPowerMw: 300,           // Transmit power (mW)
  txAperture: 0.15,         // TX aperture (m)
  rxAperture: 0.5,          // RX aperture (m)
  pointingLoss: 2,          // Pointing loss (dB)
  atmosphericLoss: 1.5,     // Atmospheric loss (dB)
  marginDb: 2,              // Link margin requirement (dB)
  noiseFloor: -95,          // Noise floor (dBm)
  requiredSnr: 10,          // Required SNR (dB)
  minElevationDeg: 10,      // Minimum elevation for link (deg)
  dataRateTarget: 100,      // Target data rate (Mbps)
  modulationType: 'PPM',    // Modulation type
  codingGain: 0,            // FEC coding gain (dB)
};

const initialState = {
  // Currently active (established) links
  activeLinks: [],
  
  // Link configurations (saved link definitions)
  links: [],
  
  // Historical link records for analysis
  linkHistory: [],
  
  // Contact events (AOS/LOS)
  contactEvents: [],        // [{ id, satId, gsId, type: 'aos'|'los', time, elevation }]
  
  // Predicted contact windows
  predictedContacts: [],    // [{ satId, gsId, aos, los, maxElevation, duration }]
  
  // Current Doppler data per link
  dopplerData: {},          // { linkId: { shiftHz, rateHzPerSec, relativeVelocity } }
  
  // Link quality statistics
  linkStats: {},            // { linkId: { avgSnr, avgMargin, totalContactTime, passCount } }
  
  // Handover management
  handoverQueue: [],        // Upcoming handovers: [{ satId, fromGs, toGs, time }]
  activeHandovers: [],      // In-progress handovers
};

const communicationSlice = createSlice({
  name: 'communication',
  initialState,
  reducers: {
    // Active links management
    setActiveLinks: (state, action) => {
      state.activeLinks = action.payload || [];
    },
    
    // Link configuration management
    setLinks: (state, action) => {
      state.links = action.payload || [];
    },
    addLink: (state, action) => {
      const newLink = {
        ...defaultLinkParams,
        ...action.payload,
        id: action.payload.id || `link-${Date.now()}`,
        createdAt: Date.now(),
      };
      state.links.push(newLink);
    },
    updateLink: (state, action) => {
      const { id, changes } = action.payload;
      const link = state.links.find(l => l.id === id);
      if (link) {
        Object.assign(link, changes);
      }
    },
    deleteLink: (state, action) => {
      const id = action.payload;
      state.links = state.links.filter(l => l.id !== id);
    },
    
    // Link history
    addLinkRecord: (state, action) => {
      const record = action.payload;
      if (record) {
        state.linkHistory.push(record);
        // Keep history size manageable (last 10000 records)
        if (state.linkHistory.length > 10000) {
          state.linkHistory = state.linkHistory.slice(-10000);
        }
      }
    },
    clearLinkHistory: (state) => {
      state.linkHistory = [];
    },
    
    // Contact events (AOS/LOS logging)
    addContactEvent: (state, action) => {
      const event = {
        ...action.payload,
        id: action.payload.id || `event-${Date.now()}`,
        timestamp: Date.now(),
      };
      state.contactEvents.push(event);
      // Keep last 1000 events
      if (state.contactEvents.length > 1000) {
        state.contactEvents = state.contactEvents.slice(-1000);
      }
    },
    clearContactEvents: (state) => {
      state.contactEvents = [];
    },
    
    // Predicted contact windows
    setPredictedContacts: (state, action) => {
      state.predictedContacts = action.payload || [];
    },
    addPredictedContact: (state, action) => {
      state.predictedContacts.push(action.payload);
    },
    clearPredictedContacts: (state) => {
      state.predictedContacts = [];
    },
    
    // Doppler data
    updateDopplerData: (state, action) => {
      const { linkId, shiftHz, rateHzPerSec, relativeVelocity } = action.payload;
      state.dopplerData[linkId] = {
        shiftHz,
        rateHzPerSec,
        relativeVelocity,
        updatedAt: Date.now(),
      };
    },
    clearDopplerData: (state) => {
      state.dopplerData = {};
    },
    
    // Link statistics
    updateLinkStats: (state, action) => {
      const { linkId, stats } = action.payload;
      state.linkStats[linkId] = {
        ...state.linkStats[linkId],
        ...stats,
        updatedAt: Date.now(),
      };
    },
    clearLinkStats: (state) => {
      state.linkStats = {};
    },
    
    // Handover management
    addHandoverToQueue: (state, action) => {
      state.handoverQueue.push(action.payload);
      // Sort by time
      state.handoverQueue.sort((a, b) => a.time - b.time);
    },
    removeHandoverFromQueue: (state, action) => {
      const id = action.payload;
      state.handoverQueue = state.handoverQueue.filter(h => h.id !== id);
    },
    startHandover: (state, action) => {
      const handover = action.payload;
      state.activeHandovers.push({
        ...handover,
        startedAt: Date.now(),
      });
    },
    completeHandover: (state, action) => {
      const id = action.payload;
      state.activeHandovers = state.activeHandovers.filter(h => h.id !== id);
    },
    
    // Reset all communication state
    resetCommunication: (state) => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder.addCase('SET_COMMUNICATION', (state, action) => {
      return { ...initialState, ...action.payload };
    });
  },
});

export const { 
  setActiveLinks, 
  addLinkRecord, 
  setLinks,
  addLink,
  updateLink,
  deleteLink,
  clearLinkHistory,
  addContactEvent,
  clearContactEvents,
  setPredictedContacts,
  addPredictedContact,
  clearPredictedContacts,
  updateDopplerData,
  clearDopplerData,
  updateLinkStats,
  clearLinkStats,
  addHandoverToQueue,
  removeHandoverFromQueue,
  startHandover,
  completeHandover,
  resetCommunication,
} = communicationSlice.actions;

export { defaultLinkParams };
export default communicationSlice.reducer;
