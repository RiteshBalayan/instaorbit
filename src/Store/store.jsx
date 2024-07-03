import { configureStore } from '@reduxjs/toolkit';
import particleReducer from './StateTimeSeries';
import timerReducer from './timeSlice';
import CurrentStateReducer from './CurrentState';
import satelliteReducer from './satelliteSlice';

const store = configureStore({
  reducer: {
    particles: particleReducer,
    timer: timerReducer,
    CurrentState: CurrentStateReducer,
    satellites: satelliteReducer,
  },
});

export default store;
