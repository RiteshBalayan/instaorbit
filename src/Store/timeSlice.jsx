// src/redux/timerSlice.js
import { createSlice } from '@reduxjs/toolkit';

const roundToThreeDecimals = (num) => Math.round(num * 1000) / 1000;

const timerSlice = createSlice({
  name: 'timer',
  initialState: {
    isRunning: false,
    elapsedTime: 0,
    timePoints: [],
  },
  reducers: {
    startPauseTimer(state) {
      state.isRunning = !state.isRunning;
    },
    resetTimer(state) {
      state.isRunning = false;
      state.elapsedTime = 0;
      state.timePoints = [];
    },
    updateElapsedTime(state, action) {
      state.elapsedTime = roundToThreeDecimals(action.payload);
    },
    addTimePoint(state, action) {
      state.timePoints.push(roundToThreeDecimals(action.payload));
    },
    goToTimePoint(state, action) {
      state.elapsedTime = roundToThreeDecimals(action.payload);
      state.isRunning = false;
    },
    setElapsedTime(state, action) {
        state.elapsedTime = roundToThreeDecimals(action.payload);
    },
  },
});

export const {
  startPauseTimer,
  resetTimer,
  updateElapsedTime,
  addTimePoint,
  goToTimePoint,
  setElapsedTime,
} = timerSlice.actions;

export default timerSlice.reducer;
