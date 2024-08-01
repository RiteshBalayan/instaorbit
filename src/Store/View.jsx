import { createSlice } from '@reduxjs/toolkit';

// Initial state for satellite configurations
const initialState = {
  Grid: false,
  Axis:false,
  VonAllenBelt:false,
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
  },
  extraReducers: (builder) => {
    builder.addCase('SET_VIEW', (state, action) => {
      return action.payload;
    });
  },
});

export const { toggleGrid, toggleAxis, toggleVonAllenBelt } = viewSlice.actions;

export default viewSlice.reducer;