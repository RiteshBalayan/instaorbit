import { createSlice } from '@reduxjs/toolkit';

/**
 * Default body-frame configuration applied to every newly-created satellite.
 * Kept as a factory so each satellite gets its own object reference.
 */
export const defaultBodyFrame = () => ({
  bodyShape: 'rectangle',              // 'rectangle' | 'cone' | 'circle'
  pointingMode: 'nadir',              // 'nadir' | 'target'
  slewRateDegSec: 1,                  // max slew speed (°/s)
  pointingTargets: [],                // priority-ordered list of { id, targetType, targetId, conditions, priority }
});

// Initial state for satellite configurations
const initialState = {
  satellitesConfig: [
    
  ],
};

const satelliteSlice = createSlice({
  name: 'satellites',
  initialState,
  reducers: {
    updateSatellites: (state, action) => {
      state.satellitesConfig = action.payload;
    },
    addSatellite: (state, action) => {
      const newSatellite = action.payload;
      state.satellitesConfig.push(newSatellite);
    },
    updateSatellite: (state, action) => {
      const { id, conf } = action.payload;
      const satelliteToUpdate = state.satellitesConfig.find(s => s.id === id);
      if (satelliteToUpdate) {
        Object.assign(satelliteToUpdate, conf);
      }
    },
    togglePreview: (state, action) => {
      const { id, preview } = action.payload;
      const satelliteToUpdate = state.satellitesConfig.find(s => s.id === id);
      if (satelliteToUpdate) {
        satelliteToUpdate.preview = preview;
      } 
    },
    toggleSimulation: (state, action) => {
      const { id, Simulation } = action.payload;
      const satelliteToUpdate = state.satellitesConfig.find(s => s.id === id);
      if (satelliteToUpdate) {
        satelliteToUpdate.Simulation = Simulation;
      } 
    },
    toggleTube: (state, action) => {
      const { id, Tube } = action.payload;
      const satelliteToUpdate = state.satellitesConfig.find(s => s.id === id);
      if (satelliteToUpdate) {
        satelliteToUpdate.Tube = Tube;
      } 
    },
    updateBurn: (state, action) => {
      const { id, burnID, data } = action.payload;
      const satelliteToUpdate = state.satellitesConfig.find(s => s.id === id);
      if (satelliteToUpdate) {
        const burnToUpdate = satelliteToUpdate.burns.find(b => b.id === burnID);
        if (burnToUpdate) {
          Object.assign(burnToUpdate, data);
        }
      }
    },
    deleteSatellite: (state, action) => {
      const idToDelete = action.payload;
      state.satellitesConfig = state.satellitesConfig.filter(s => s.id !== idToDelete);
    },

    /* ─── Body-frame reducers ────────────────────────────────── */

    /** Replace the entire bodyFrame config for a satellite */
    updateBodyFrame: (state, action) => {
      const { id, bodyFrame } = action.payload;
      const sat = state.satellitesConfig.find(s => s.id === id);
      if (sat) {
        sat.bodyFrame = { ...(sat.bodyFrame || defaultBodyFrame()), ...bodyFrame };
      }
    },

    /** Add a pointing target to a satellite's priority list */
    addPointingTarget: (state, action) => {
      const { id, target } = action.payload;
      const sat = state.satellitesConfig.find(s => s.id === id);
      if (sat) {
        if (!sat.bodyFrame) sat.bodyFrame = defaultBodyFrame();
        // Auto-assign priority = list length + 1
        const nextPriority = sat.bodyFrame.pointingTargets.length + 1;
        sat.bodyFrame.pointingTargets.push({ priority: nextPriority, ...target });
      }
    },

    /** Update a single pointing target by its id */
    updatePointingTarget: (state, action) => {
      const { id, targetId, data } = action.payload;
      const sat = state.satellitesConfig.find(s => s.id === id);
      if (sat?.bodyFrame) {
        const t = sat.bodyFrame.pointingTargets.find(pt => pt.id === targetId);
        if (t) Object.assign(t, data);
      }
    },

    /** Remove a pointing target */
    removePointingTarget: (state, action) => {
      const { id, targetId } = action.payload;
      const sat = state.satellitesConfig.find(s => s.id === id);
      if (sat?.bodyFrame) {
        sat.bodyFrame.pointingTargets = sat.bodyFrame.pointingTargets.filter(pt => pt.id !== targetId);
        // Re-number priorities
        sat.bodyFrame.pointingTargets.forEach((pt, i) => { pt.priority = i + 1; });
      }
    },

    /** Reorder pointing targets (drag-to-reorder) — payload is full new array */
    reorderPointingTargets: (state, action) => {
      const { id, pointingTargets } = action.payload;
      const sat = state.satellitesConfig.find(s => s.id === id);
      if (sat?.bodyFrame) {
        sat.bodyFrame.pointingTargets = pointingTargets.map((pt, i) => ({ ...pt, priority: i + 1 }));
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase('SET_SATELLITES', (state, action) => {
      return action.payload;
    });
  },
});

export const {
  updateSatellites, 
  addSatellite, 
  updateSatellite, 
  deleteSatellite, 
  togglePreview, 
  updateBurn, 
  toggleSimulation,
  toggleTube,
  updateBodyFrame,
  addPointingTarget,
  updatePointingTarget,
  removePointingTarget,
  reorderPointingTargets,
} = satelliteSlice.actions;

export default satelliteSlice.reducer;