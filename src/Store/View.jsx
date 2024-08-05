import { createSlice } from '@reduxjs/toolkit';

// Initial state for satellite configurations
const initialState = {
  Grid: false,
  Axis:false,
  VonAllenBelt:false,
  HDEarth: true,
  Sun: true,
  AmbientLight: false,
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
  },
  extraReducers: (builder) => {
    builder.addCase('SET_VIEW', (state, action) => {
      return action.payload;
    });
  },
});

export const { toggleGrid, toggleAxis, toggleVonAllenBelt, toggleHDEarth, toggleSun, toggleAmbientLight } = viewSlice.actions;

export default viewSlice.reducer;