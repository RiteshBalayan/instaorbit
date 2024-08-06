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
      const { id, coordinates, visibility } = action.payload;
      const existingsatelite = state.satelite.find(p => p.id === id);

      if (existingsatelite) {
        // Update existing satelite's coordinates
        existingsatelite.coordinates = coordinates;
        existingsatelite.visibility = visibility;
      } else {
        // Add new satelite with coordinates
        state.satelite.push({ id, coordinates, visibility });
      }
    },
    deleteState: (state, action) => {
      const idToDelete = action.payload;
      state.satelite = state.satelite.filter(s => s.id !== idToDelete);
    }
  },
  extraReducers: (builder) => {
    builder.addCase('SET_CURRENTSTATE', (state, action) => {
      return action.payload;
    });
  },
});

export const { updateCoordinate, deleteState } = CurrentState.actions;
export default CurrentState.reducer;
