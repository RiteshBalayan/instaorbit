// src/redux/timerSlice.js
import { createSlice } from '@reduxjs/toolkit';

const workingProject = createSlice({
  name: 'workingProject',
  initialState: {
    trajectoryID: null,
    itterationID: null,
  },
  reducers: {
    updatetrajectoryID(state, action) {
      state.trajectoryID = action.payload;
    },
    updateitterationID(state, action) {
        state.itterationID = action.payload;
      },
  },
});

export const {
  updatetrajectoryID,
  updateitterationID,
} = workingProject.actions;

export default workingProject.reducer;
