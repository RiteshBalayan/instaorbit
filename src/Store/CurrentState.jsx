import { createSlice } from '@reduxjs/toolkit';

// Initial state for current coordinates
const initialState = {
  satelite: [
  ],
};

const CurrentState = createSlice({
  name: 'CurrentState',
  initialState,
  reducers: {
    updateCoordinate: (state, action) => {
      const { id, coordinates } = action.payload;
      const existingsatelite = state.satelite.find(p => p.id === id);

      if (existingsatelite) {
        // Update existing satelite's coordinates
        existingsatelite.coordinates = coordinates;
      } else {
        // Add new satelite with coordinates
        state.satelite.push({ id, coordinates });
      }
    },
  },
});

export const { updateCoordinate } = CurrentState.actions;
export default CurrentState.reducer;
