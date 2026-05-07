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

  // Global link thresholds (applied to all links unless overridden per-link)
  globalThresholds: {
    minElevationDeg: 10,     // Minimum elevation angle for GS links (°)
    maxDistanceKm: null,     // Maximum link distance (km) — null = no limit
  },

  // Global max concurrent connections per node — used by the connectivity
  // solver. 1 = legacy behavior (each laser/antenna gets one target).
  // Editable from both the Link Manager (Configure Links) and the
  // Connection Manager so it can be set before the connectivity run.
  maxConnectionsPerNode: 1,
  
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

  // ── TSDB-backed windowed link states ──────────────────────
  // Array of { time_s, active_links: [...] } for the visible time window.
  // Set by TimeSeriesClient.syncToTime().
  visibleLinkStates: [],

  // ── Feature 1: Link Availability (isolated data output) ────
  // Time series of all available (in-link) pairs at each timestep.
  // Each entry: { time, pairs: [{ txId, rxId, rangeKm, elevationDeg, snrDb, linkMargin, inLink }] }
  availablePairsTimeSeries: [],

  // ── Feature 2: Link Connectivity (node-level connections) ──
  // Output from /link-connectivity API.  Each entry:
  //   { time, connections: [{ txNodeId, rxNodeId, txParentId, rxParentId, rangeKm, elevationDeg }] }
  connectedPairsTimeSeries: [],
  // Node-level contact windows from connectivity API
  //   { id, pairId, txNodeId, rxNodeId, simStart, simEnd, closed }
  connectionWindows: [],

  // ── TSDB-backed windowed connectivity states ──────────────
  // Sliding ±60 s window of connectivity states from TSDB.
  // When present, ConnectivityLinks/BodyFrameView read this for the visible
  // window instead of the full connectedPairsTimeSeries in memory.
  visibleConnectivityStates: [],

  // ── Link display mode (single source of truth for all views) ──
  // 'connected' — show only links that passed the connectivity solver
  // 'available' — show all links that are physically available (line-of-sight)
  // All render surfaces (3D globe, LVLH, 2D map, timeline) MUST read this.
  linkDisplayMode: 'connected',
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

    // Global link thresholds
    setGlobalThresholds: (state, action) => {
      state.globalThresholds = { ...(state.globalThresholds || {}), ...action.payload };
    },

    // Global max concurrent connections per node (connectivity solver)
    setMaxConnectionsPerNode: (state, action) => {
      const v = Math.max(1, Math.min(64, Number(action.payload) || 1));
      state.maxConnectionsPerNode = v;
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

    // ── TSDB windowed link states ─────────────────────────────
    // payload: [ { time_s, active_links: [...] } ]
    setVisibleLinkStates: (state, action) => {
      state.visibleLinkStates = action.payload || [];
    },

    // ── TSDB windowed connectivity states ─────────────────────
    // payload: [ { time, connections: [...] } ]
    setVisibleConnectivityStates: (state, action) => {
      state.visibleConnectivityStates = action.payload || [];
    },

    // ── Feature 1: Link Availability time series ──────────────
    setAvailablePairsTimeSeries: (state, action) => {
      state.availablePairsTimeSeries = action.payload || [];
    },
    clearAvailablePairsTimeSeries: (state) => {
      state.availablePairsTimeSeries = [];
    },

    // ── Feature 2: Link Connectivity time series ──────────────
    setConnectedPairsTimeSeries: (state, action) => {
      state.connectedPairsTimeSeries = action.payload || [];
    },
    clearConnectedPairsTimeSeries: (state) => {
      state.connectedPairsTimeSeries = [];
    },
    setConnectionWindows: (state, action) => {
      state.connectionWindows = action.payload || [];
    },
    clearConnectionWindows: (state) => {
      state.connectionWindows = [];
    },

    // ── Link display mode toggle ──────────────────────────────
    setLinkDisplayMode: (state, action) => {
      const mode = action.payload;
      if (mode === 'connected' || mode === 'available') {
        state.linkDisplayMode = mode;
      }
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
  setVisibleLinkStates,
  setVisibleConnectivityStates,
  setAvailablePairsTimeSeries,
  clearAvailablePairsTimeSeries,
  setConnectedPairsTimeSeries,
  clearConnectedPairsTimeSeries,
  setConnectionWindows,
  clearConnectionWindows,
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
  setGlobalThresholds,
  setMaxConnectionsPerNode,
  setLinkDisplayMode,
} = communicationSlice.actions;

export { defaultLinkParams };
export default communicationSlice.reducer;
