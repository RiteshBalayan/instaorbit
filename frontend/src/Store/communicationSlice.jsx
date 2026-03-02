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
  
  // ── Coalesced contact windows ──────────────────────────────────
  // Each window: { id, txId, rxId, simStart, simEnd, metrics }
  // A "window" is a continuous period where a link is active.
  // When the link drops, the window is closed; a new window opens
  // when the link re-establishes.  This replaces the old per-step
  // linkHistory array (which grew to 10k records).
  contactWindows: [],

  // Legacy linkHistory kept for backward compat with saved projects
  // but no longer appended to during live simulation.
  linkHistory: [],
  
  // Contact events (AOS/LOS)
  contactEvents: [],

  // Predicted contact windows
  predictedContacts: [],

  // Current Doppler data per link
  dopplerData: {},

  // Link quality statistics
  linkStats: {},

  // Handover management
  handoverQueue: [],
  activeHandovers: [],

  // ── Bulk-sim pre-computed link data ────────────────────────
  // activeLinksAtTime: { [elapsedSeconds]: activeLinks[] }
  // Populated by bulk sim response. When non-null, LinkEngine
  // and LeafletMapOverlays look up by RenderTime instead of
  // computing links on-the-fly.
  activeLinksAtTime: null,
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
    
    // Link history (legacy — no longer appended during live sim)
    addLinkRecord: (state, action) => {
      const record = action.payload;
      if (record) {
        state.linkHistory.push(record);
        if (state.linkHistory.length > 10000) {
          state.linkHistory = state.linkHistory.slice(-10000);
        }
      }
    },
    clearLinkHistory: (state) => {
      state.linkHistory = [];
      state.contactWindows = [];
    },

    // ── Coalesced contact windows ────────────────────────────────
    // Called every sim step with the list of currently-active link IDs
    // and their sim-time timestamp.  Opens, extends, or closes windows.
    updateContactWindows: (state, action) => {
      const { activeLinkIds, simTimeMs } = action.payload;
      // activeLinkIds: ['sat-0→gs-1', ...] — link pairs that are in-link NOW
      // simTimeMs: starttime + renderTime*1000 (absolute UTC ms)

      const activeSet = new Set(activeLinkIds);

      // 1. Extend or close existing open windows
      state.contactWindows.forEach((w) => {
        if (!w.closed) {
          if (activeSet.has(w.pairId)) {
            // Still active → extend end time
            w.simEnd = simTimeMs;
            activeSet.delete(w.pairId); // handled
          } else {
            // No longer active → close the window
            w.closed = true;
          }
        }
      });

      // 2. Open new windows for newly active links
      activeSet.forEach((pairId) => {
        const [txId, rxId] = pairId.split('→');
        state.contactWindows.push({
          id: `cw-${pairId}-${simTimeMs}`,
          pairId,
          txId,
          rxId,
          simStart: simTimeMs,
          simEnd: simTimeMs,
          closed: false,
        });
      });

      // 3. Keep max 500 windows (trim oldest closed ones first)
      if (state.contactWindows.length > 500) {
        const closed = state.contactWindows.filter((w) => w.closed);
        const open = state.contactWindows.filter((w) => !w.closed);
        const keep = closed.slice(-Math.max(0, 500 - open.length));
        state.contactWindows = [...keep, ...open];
      }
    },

    clearContactWindows: (state) => {
      state.contactWindows = [];
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
    
    // ── Bulk-sim data loaders ─────────────────────────────────
    // Replace contact windows with pre-computed ones from backend
    bulkLoadContactWindows: (state, action) => {
      state.contactWindows = action.payload || [];
    },
    // Store the full pre-computed activeLinks map { time: activeLinks[] }
    bulkLoadActiveLinksAtTime: (state, action) => {
      state.activeLinksAtTime = action.payload || null;
    },
    // Clear bulk link data (when switching back to live mode)
    clearBulkLinkData: (state) => {
      state.activeLinksAtTime = null;
    },

    // Reset all communication state
    resetCommunication: () => {
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
  updateContactWindows,
  clearContactWindows,
  bulkLoadContactWindows,
  bulkLoadActiveLinksAtTime,
  clearBulkLinkData,
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
