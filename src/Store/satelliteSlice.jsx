import { createSlice } from '@reduxjs/toolkit';

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
      const { id, newConfig } = action.payload;
      const satelliteToUpdate = state.satellitesConfig.find(s => s.id === id);
      if (satelliteToUpdate) {
        Object.assign(satelliteToUpdate, newConfig);
      }
    },
    deleteSatellite: (state, action) => {
      const idToDelete = action.payload;
      state.satellitesConfig = state.satellitesConfig.filter(s => s.id !== idToDelete);
    },
  },
});

export const { updateSatellites, addSatellite, updateSatellite, deleteSatellite } = satelliteSlice.actions;

export default satelliteSlice.reducer;