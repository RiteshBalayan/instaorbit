import { createSlice } from '@reduxjs/toolkit';

// Initial state for satellite configurations
const initialRefrenceSystem = 'EarthInertial';
const InitialCentralObject = 'Moon';

const initialState = {
  Grid: false,
  Axis:false,
  VonAllenBelt:false,
  HDEarth: true,
  Sun: true,
  AmbientLight: false,
  ReferenceSystem: initialRefrenceSystem,
  CentralObject: InitialCentralObject,
  viewMode: 'globe',
  showControlPanel: true,
  showConfigPanel: false,
  showLinkBudget: false,
  // Track Horizon: show only ±1 hr ground track window (default off = show all)
  trackWindow: false,
  // Orbit ring visibility (Keplerian ellipse in 3D)
  showOrbit: true,
  // Communication link lines in 3D view (default on)
  showLinkLines: true,
  // Body-frame axis arrows (default on)
  showBodyFrameAxes: true,

  // Feature flag: use node-level (laser-to-laser) link rendering
  // When true, LinkEngine uses connectedPairsTimeSeries with node IDs.
  // When false, falls back to satellite-center links (legacy).
  useNodeLevelLinks: true,

  /* ─── Flexible layout system ──────────────────────────────── */
  // layout.mode: 'single' | 'split'
  // layout.left / right: { type: '3d' | '2d' | 'bodyFrame', satelliteId?: number }
  layout: {
    mode: 'single',
    left: { type: '3d' },
    right: null,
  },
};

const viewSlice = createSlice({
  name: 'view',
  initialState,
  reducers: {
    toggleGrid: (state, action) => {
      state.Grid = action.payload;
      },
    toggleAxis: (state, action) => {
        state.Axis = action.payload;
      },
    toggleVonAllenBelt: (state, action) => {
        state.VonAllenBelt = action.payload;
      },  
    toggleHDEarth: (state, action) => {
        state.HDEarth = action.payload;
      }, 
    toggleSun: (state, action) => {
        state.Sun = action.payload;
      },  
    toggleAmbientLight: (state, action) => {
        state.AmbientLight = action.payload;
      },   
    toggleRefrenaceSystem: (state, action) => {
      state.ReferenceSystem = action.payload;
      }, 
    toggleCentralObject: (state, action) => {
      state.CentralObject = action.payload;
      }, 
    setViewMode: (state, action) => {
      state.viewMode = action.payload;
    },
    toggleControlPanel: (state) => {
      state.showControlPanel = !state.showControlPanel;
    },
    toggleConfigPanel: (state) => {
      state.showConfigPanel = !state.showConfigPanel;
    },
    toggleLinkBudget: (state) => {
      state.showLinkBudget = !state.showLinkBudget;
    },
    setTrackWindow: (state, action) => {
      state.trackWindow = action.payload;
    },
    setShowOrbit: (state, action) => {
      state.showOrbit = action.payload;
    },
    setShowLinkLines: (state, action) => {
      state.showLinkLines = action.payload;
    },
    setShowBodyFrameAxes: (state, action) => {
      state.showBodyFrameAxes = action.payload;
    },
    setUseNodeLevelLinks: (state, action) => {
      state.useNodeLevelLinks = action.payload;
    },

    /* ─── Layout actions ─────────────────────────────────────── */

    /** Set the full layout object */
    setLayout: (state, action) => {
      state.layout = action.payload;
    },

    /** Set one panel (left or right) */
    setViewPanel: (state, action) => {
      const { side, config } = action.payload; // side: 'left'|'right', config: { type, satelliteId? }
      state.layout[side] = config;
    },

    /** Toggle between single and split mode */
    toggleSplit: (state) => {
      if (state.layout.mode === 'single') {
        state.layout.mode = 'split';
        if (!state.layout.right) {
          state.layout.right = { type: '2d' }; // default right pane
        }
      } else {
        state.layout.mode = 'single';
        state.layout.right = null;
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase('SET_VIEW', (state, action) => {
      return { ...initialState, ...action.payload };
    });
  },
});

export const { toggleGrid, toggleAxis, toggleVonAllenBelt, toggleHDEarth, toggleSun, toggleAmbientLight, toggleRefrenaceSystem, toggleCentralObject, setViewMode, toggleControlPanel, toggleConfigPanel, toggleLinkBudget, setTrackWindow, setShowOrbit, setShowLinkLines, setShowBodyFrameAxes, setUseNodeLevelLinks, setLayout, setViewPanel, toggleSplit } = viewSlice.actions;

export default viewSlice.reducer;