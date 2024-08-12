// src/redux/timerSlice.js
import { createSlice } from '@reduxjs/toolkit';

const workingProject = createSlice({
  name: 'workingProject',
  initialState: {
    trajectoryID: null,
    trajectoryName: 'Unsaved Project',
    itterationID: null,
  },
  reducers: {
    updatetrajectoryID(state, action) {
      state.trajectoryID = action.payload;
    },
    updateitterationID(state, action) {
      state.itterationID = action.payload;
    },
    updateitterationName(state, action) {
      state.trajectoryName = action.payload;
    },
  },
});

export const {
  updatetrajectoryID,
  updateitterationID,
  updateitterationName,
} = workingProject.actions;

export default workingProject.reducer;
