// src/redux/timerSlice.js
import { createSlice } from '@reduxjs/toolkit';

const roundToThreeDecimals = (num) => Math.round(num * 1000) / 1000;

// Event types for timeline markers
const EVENT_TYPES = {
  BURN: 'burn',
  ECLIPSE_ENTRY: 'eclipse_entry',
  ECLIPSE_EXIT: 'eclipse_exit',
  AOS: 'aos',           // Acquisition of Signal
  LOS: 'los',           // Loss of Signal
  APOGEE: 'apogee',
  PERIGEE: 'perigee',
  NODE_CROSSING: 'node_crossing',
  CUSTOM: 'custom',
};

const timerSlice = createSlice({
  name: 'timer',
  initialState: {
    // Core timing
    isRunning: false,
    starttime: Date.now(),
    elapsedTime: 0,           // Simulation time (seconds)
    RenderTime: 0,            // View/render time (seconds)
    
    // Coupling between simulation and render time
    coupled: true,
    
    // Simulation configuration (previously only in local state)
    timeStep: 1,              // Simulation time step (seconds)
    renderStep: 0.1,          // Render/animation step (seconds)
    playbackSpeed: 1,         // Playback multiplier (1x, 2x, 10x, etc.)
    
    // Simulation bounds
    simulationDuration: null, // Max simulation duration (seconds), null = unlimited
    loopMode: false,          // Whether to loop at end of duration
    
    // Time bookmarks/markers
    timePoints: [],           // User-set bookmark times
    
    // Timeline event markers
    events: [],               // [{ id, type, time, satId, label, data }]
    
    // Eclipse tracking
    eclipseStates: {},        // { satId: { inEclipse: bool, entryTime, exitTime } }
    
    // Orbital events
    orbitalEvents: [],        // [{ satId, type, time }] - apogee, perigee, nodes
  },
  reducers: {
    // Play/pause controls
    startPauseTimer(state) {
      state.isRunning = !state.isRunning;
    },
    setIsRunning(state, action) {
      state.isRunning = action.payload;
    },
    
    // Start time management
    setstarttime(state, action) {
      state.starttime = action.payload;
    },
    
    // Coupling toggle
    toggleCoupled(state) {
      state.coupled = !state.coupled;
    },
    setCoupled(state, action) {
      state.coupled = action.payload;
    },
    
    // Reset timer
    resetTimer(state) {
      state.isRunning = false;
      state.elapsedTime = 0;
      state.RenderTime = 0;
      state.timePoints = [];
      state.events = [];
      state.eclipseStates = {};
      state.orbitalEvents = [];
    },
    
    // Time updates
    updateElapsedTime(state, action) {
      state.elapsedTime = roundToThreeDecimals(action.payload);
    },
    updateRenderTime(state, action) {
      state.RenderTime = roundToThreeDecimals(action.payload);
    },
    setElapsedTime(state, action) {
      state.elapsedTime = roundToThreeDecimals(action.payload);
    },
    
    // Time step configuration
    setTimeStep(state, action) {
      state.timeStep = action.payload;
    },
    setRenderStep(state, action) {
      state.renderStep = action.payload;
    },
    setPlaybackSpeed(state, action) {
      state.playbackSpeed = action.payload;
    },
    
    // Simulation bounds
    setSimulationDuration(state, action) {
      state.simulationDuration = action.payload;
    },
    toggleLoopMode(state) {
      state.loopMode = !state.loopMode;
    },
    setLoopMode(state, action) {
      state.loopMode = action.payload;
    },
    
    // Time points/bookmarks
    addTimePoint(state, action) {
      const time = roundToThreeDecimals(action.payload);
      if (!state.timePoints.includes(time)) {
        state.timePoints.push(time);
        state.timePoints.sort((a, b) => a - b);
      }
    },
    removeTimePoint(state, action) {
      const time = roundToThreeDecimals(action.payload);
      state.timePoints = state.timePoints.filter(t => t !== time);
    },
    clearTimePoints(state) {
      state.timePoints = [];
    },
    goToTimePoint(state, action) {
      state.elapsedTime = roundToThreeDecimals(action.payload);
      state.RenderTime = roundToThreeDecimals(action.payload);
      state.isRunning = false;
    },
    
    // Timeline event markers
    addEvent(state, action) {
      const event = {
        id: action.payload.id || `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: action.payload.type || EVENT_TYPES.CUSTOM,
        time: action.payload.time,
        satId: action.payload.satId,
        gsId: action.payload.gsId,
        label: action.payload.label || '',
        data: action.payload.data || {},
        createdAt: Date.now(),
      };
      state.events.push(event);
      // Keep events sorted by time
      state.events.sort((a, b) => a.time - b.time);
    },
    removeEvent(state, action) {
      const id = action.payload;
      state.events = state.events.filter(e => e.id !== id);
    },
    updateEvent(state, action) {
      const { id, changes } = action.payload;
      const event = state.events.find(e => e.id === id);
      if (event) {
        Object.assign(event, changes);
        state.events.sort((a, b) => a.time - b.time);
      }
    },
    clearEvents(state) {
      state.events = [];
    },
    clearEventsByType(state, action) {
      const type = action.payload;
      state.events = state.events.filter(e => e.type !== type);
    },
    clearEventsBySatellite(state, action) {
      const satId = action.payload;
      state.events = state.events.filter(e => e.satId !== satId);
    },
    
    // Eclipse state tracking
    updateEclipseState(state, action) {
      const { satId, inEclipse, entryTime, exitTime } = action.payload;
      state.eclipseStates[satId] = {
        inEclipse,
        entryTime: entryTime !== undefined ? entryTime : state.eclipseStates[satId]?.entryTime,
        exitTime: exitTime !== undefined ? exitTime : state.eclipseStates[satId]?.exitTime,
        updatedAt: Date.now(),
      };
    },
    clearEclipseStates(state) {
      state.eclipseStates = {};
    },
    
    // Orbital events
    addOrbitalEvent(state, action) {
      const event = {
        id: action.payload.id || `orbital-${Date.now()}`,
        satId: action.payload.satId,
        type: action.payload.type, // 'apogee', 'perigee', 'ascending_node', 'descending_node'
        time: action.payload.time,
        data: action.payload.data || {},
      };
      state.orbitalEvents.push(event);
      state.orbitalEvents.sort((a, b) => a.time - b.time);
      // Keep last 100 orbital events per satellite
      const satEvents = state.orbitalEvents.filter(e => e.satId === event.satId);
      if (satEvents.length > 100) {
        const toRemove = satEvents.slice(0, satEvents.length - 100);
        state.orbitalEvents = state.orbitalEvents.filter(e => !toRemove.includes(e));
      }
    },
    clearOrbitalEvents(state) {
      state.orbitalEvents = [];
    },
    clearOrbitalEventsBySatellite(state, action) {
      const satId = action.payload;
      state.orbitalEvents = state.orbitalEvents.filter(e => e.satId !== satId);
    },
  },
  extraReducers: (builder) => {
    builder.addCase('SET_TIMER', (state, action) => {
      return { ...state, ...action.payload };
    });
  },
});

export const {
  startPauseTimer,
  setIsRunning,
  resetTimer,
  toggleCoupled,
  setCoupled,
  updateElapsedTime,
  updateRenderTime,
  addTimePoint,
  removeTimePoint,
  clearTimePoints,
  goToTimePoint,
  setElapsedTime,
  setstarttime,
  setTimeStep,
  setRenderStep,
  setPlaybackSpeed,
  setSimulationDuration,
  toggleLoopMode,
  setLoopMode,
  addEvent,
  removeEvent,
  updateEvent,
  clearEvents,
  clearEventsByType,
  clearEventsBySatellite,
  updateEclipseState,
  clearEclipseStates,
  addOrbitalEvent,
  clearOrbitalEvents,
  clearOrbitalEventsBySatellite,
} = timerSlice.actions;

export { EVENT_TYPES };
export default timerSlice.reducer;
