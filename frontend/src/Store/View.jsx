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
  showLinkBudget: false,
  // Track Horizon: show only ±1 hr ground track window (default off = show all)
  trackWindow: false,
  // Orbit ring visibility (Keplerian ellipse in 3D)
  showOrbit: true,
  // Communication link lines in 3D view (default on)
  showLinkLines: true,
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
  },
  extraReducers: (builder) => {
    builder.addCase('SET_VIEW', (state, action) => {
      return action.payload;
    });
  },
});

export const { toggleGrid, toggleAxis, toggleVonAllenBelt, toggleHDEarth, toggleSun, toggleAmbientLight, toggleRefrenaceSystem, toggleCentralObject, setViewMode, toggleControlPanel, toggleLinkBudget, setTrackWindow, setShowOrbit, setShowLinkLines } = viewSlice.actions;

export default viewSlice.reducer;