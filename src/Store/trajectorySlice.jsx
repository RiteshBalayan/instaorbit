import { createSlice } from '@reduxjs/toolkit';

const initialState = [];

const trajectorySlice = createSlice({
  name: 'trajectoryList',
  initialState,
  reducers: {
    setTrajectories(state, action) {
      return action.payload;
    },
    toggleArchive(state, action) {
      const { id, archived } = action.payload;
      return state.map(t => (t.id === id ? { ...t, archived } : t));
    },
  },
  extraReducers: (builder) => {
    builder.addCase('SET_TRAJECTORIES', (state, action) => {
      return action.payload;
    });
  },
});

export const { setTrajectories, toggleArchive } = trajectorySlice.actions;
export default trajectorySlice.reducer;
