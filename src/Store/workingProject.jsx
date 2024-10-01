// src/redux/timerSlice.js
import { createSlice } from '@reduxjs/toolkit';

const workingProject = createSlice({
  name: 'workingProject',
  initialState: {
    trajectoryID: null,
    trajectoryName: 'Unsaved Project',
    itterationID: null,
    itterationImage: null,
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
    updateIterationImage(state, action) {
      state.itterationImage = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase('SETworkingProject', (state, action) => {
      return action.payload;
    });
  },
});

export const {
  updatetrajectoryID,
  updateitterationID,
  updateitterationName,
  updateIterationImage,
} = workingProject.actions;

export default workingProject.reducer;
