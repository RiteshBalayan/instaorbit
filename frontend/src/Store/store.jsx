import { configureStore } from '@reduxjs/toolkit';
import particleReducer from './StateTimeSeries';
import timerReducer from './timeSlice';
import CurrentStateReducer from './CurrentState';
import satelliteReducer from './satelliteSlice';
import groupReducer from './groupSlice';
import authReducer from './authSlice';
import workingProjectReducer from './workingProject';
import viewReducer from './View';
import trajectoryReducer from './trajectorySlice';
import groundStationsReducer from './groundStationSlice';
import communicationReducer from './communicationSlice';
import { createBroadcastMiddleware, FULL_STATE_SYNC } from './broadcastMiddleware';

/* ── Detect if this tab is a daughter display ────────────────── */
const isDaughter = new URLSearchParams(window.location.search).has('display')
                || window.location.pathname === '/display';

/**
 * Wraps a slice reducer so that FULL_STATE_SYNC wholesale replaces its state
 * with the corresponding slice from the master tab's broadcast.
 */
function withSync(sliceKey, reducer) {
  return (state, action) => {
    if (action.type === FULL_STATE_SYNC && action.payload?.[sliceKey] !== undefined) {
      return action.payload[sliceKey];
    }
    return reducer(state, action);
  };
}

/* Slices that daughter tabs receive from master via broadcast */
const SYNCED_SLICES = [
  'particles', 'timer', 'CurrentState', 'satellites',
  'view', 'groundStations', 'communication',
];

/* Build the reducer map — synced slices get the wrapper on daughter tabs */
const reducerMap = {
  auth: authReducer,
  particles: particleReducer,
  timer: timerReducer,
  CurrentState: CurrentStateReducer,
  satellites: satelliteReducer,
  groups: groupReducer,
  workingProject: workingProjectReducer,
  view: viewReducer,
  trajectoryList: trajectoryReducer,
  groundStations: groundStationsReducer,
  communication: communicationReducer,
};

if (isDaughter) {
  SYNCED_SLICES.forEach(key => {
    if (reducerMap[key]) {
      reducerMap[key] = withSync(key, reducerMap[key]);
    }
  });
}

/* ── Middleware ──────────────────────────────────────────────── */
const extraMiddleware = [];
// Only master tabs broadcast state; daughter tabs just listen
if (!isDaughter) {
  extraMiddleware.push(createBroadcastMiddleware());
}

const store = configureStore({
  reducer: reducerMap,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // The state includes large arrays (tracePoints) — skip serialisability checks
      serializableCheck: false,
      immutableCheck: false,
    }).concat(extraMiddleware),
});

export { isDaughter };
export default store;
