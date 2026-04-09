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
  components: [],                     // articulated sub-components (solar panels, laser pointers, etc.)
});

/**
 * Factory for a new satellite component (solar panel, laser pointer, etc.).
 *
 * @param {Object} overrides – partial component fields to merge.
 * @returns {Object} full component config object.
 *
 * Component types:
 *   'solarPanel'    – 1-DOF rotation about hinge axis (tracks sun by default)
 *   'laserPointer'  – 2-DOF alt-az gimbal (tracks a target)
 *
 * parentAxis – body-frame axis that the component extends from:
 *   '+X' | '-X' | '+Y' | '-Y' | '+Z' | '-Z'
 *
 * pointingMode:
 *   'default' – type-specific default (sun for panels, nadir for lasers)
 *   'target'  – walk pointingTargets priority list (same schema as body)
 *   'fixed'   – locked at fixedAnglesDeg
 */
let _componentIdCounter = 0;
export const createComponent = (overrides = {}) => ({
  id: `comp-${Date.now()}-${++_componentIdCounter}`,
  type: 'solarPanel',                 // 'solarPanel' | 'laserPointer'
  name: 'Solar Panel',
  parentAxis: '+Y',                   // body-frame mounting axis (preset)
  axisDirection: [0, 1, 0],           // custom axis direction vector (overrides parentAxis when edited)
  positionOffset: [0, 0.04, 0],       // custom position offset [x, y, z] in body-frame scene units
  offset: 0.04,                       // distance from body center (scene units) — legacy
  // DOF
  dof: 1,                             // 1 = single-axis, 2 = alt-az gimbal
  // Constraints — per-axis ranges
  // Solar panel (1-DOF): only a1 range matters.  Default ±90° (half hemisphere)
  // Laser (2-DOF):       a1 = azimuth range, a2 = elevation range.
  //                      Default a2: -10° to +80° keeps beam away from body.
  constraint: {
    maxAngleDeg: 180,                 // legacy fallback (symmetric ±)
    minA1Deg: -90,                    // azimuth / rotation min
    maxA1Deg:  90,                    // azimuth / rotation max
    minA2Deg: -10,                    // elevation min (neg = slight below horizon)
    maxA2Deg:  80,                    // elevation max (< 90 prevents body pierce)
  },
  slewRateDegSec: 5,                 // component slew rate (°/s)
  // Pointing
  pointingMode: 'default',           // 'default' | 'target' | 'fixed'
  pointingTargets: [],               // same schema as body-level targets
  fixedAnglesDeg: { a1: 0, a2: 0 }, // used when pointingMode === 'fixed'
  ...overrides,
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

    /* ─── Component reducers ─────────────────────────────────── */

    /** Add a component to a satellite's bodyFrame.components array */
    addComponent: (state, action) => {
      const { id, component } = action.payload;
      const sat = state.satellitesConfig.find(s => s.id === id);
      if (sat) {
        if (!sat.bodyFrame) sat.bodyFrame = defaultBodyFrame();
        if (!sat.bodyFrame.components) sat.bodyFrame.components = [];
        sat.bodyFrame.components.push(component);
      }
    },

    /** Update a single component by its id */
    updateComponent: (state, action) => {
      const { id, componentId, data } = action.payload;
      const sat = state.satellitesConfig.find(s => s.id === id);
      if (sat?.bodyFrame?.components) {
        const comp = sat.bodyFrame.components.find(c => c.id === componentId);
        if (comp) Object.assign(comp, data);
      }
    },

    /** Remove a component */
    removeComponent: (state, action) => {
      const { id, componentId } = action.payload;
      const sat = state.satellitesConfig.find(s => s.id === id);
      if (sat?.bodyFrame?.components) {
        sat.bodyFrame.components = sat.bodyFrame.components.filter(c => c.id !== componentId);
      }
    },

    /** Add a pointing target to a specific component */
    addComponentPointingTarget: (state, action) => {
      const { id, componentId, target } = action.payload;
      const sat = state.satellitesConfig.find(s => s.id === id);
      if (sat?.bodyFrame?.components) {
        const comp = sat.bodyFrame.components.find(c => c.id === componentId);
        if (comp) {
          if (!comp.pointingTargets) comp.pointingTargets = [];
          const nextPriority = comp.pointingTargets.length + 1;
          comp.pointingTargets.push({ priority: nextPriority, ...target });
        }
      }
    },

    /** Update a pointing target within a component */
    updateComponentPointingTarget: (state, action) => {
      const { id, componentId, targetId, data } = action.payload;
      const sat = state.satellitesConfig.find(s => s.id === id);
      if (sat?.bodyFrame?.components) {
        const comp = sat.bodyFrame.components.find(c => c.id === componentId);
        if (comp?.pointingTargets) {
          const t = comp.pointingTargets.find(pt => pt.id === targetId);
          if (t) Object.assign(t, data);
        }
      }
    },

    /** Remove a pointing target from a component */
    removeComponentPointingTarget: (state, action) => {
      const { id, componentId, targetId } = action.payload;
      const sat = state.satellitesConfig.find(s => s.id === id);
      if (sat?.bodyFrame?.components) {
        const comp = sat.bodyFrame.components.find(c => c.id === componentId);
        if (comp?.pointingTargets) {
          comp.pointingTargets = comp.pointingTargets.filter(pt => pt.id !== targetId);
          comp.pointingTargets.forEach((pt, i) => { pt.priority = i + 1; });
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase('SET_SATELLITES', (state, action) => {
      return { ...initialState, ...action.payload };
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
  addComponent,
  updateComponent,
  removeComponent,
  addComponentPointingTarget,
  updateComponentPointingTarget,
  removeComponentPointingTarget,
} = satelliteSlice.actions;

export default satelliteSlice.reducer;