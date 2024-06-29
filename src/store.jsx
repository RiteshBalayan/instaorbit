import { configureStore } from '@reduxjs/toolkit';
import particleReducer from './StateTimeSeries';
import timerReducer from './timeSlice';

const store = configureStore({
  reducer: {
    particles: particleReducer,
    timer: timerReducer,
  },
});

export default store;
