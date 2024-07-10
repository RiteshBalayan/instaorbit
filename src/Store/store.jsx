import { configureStore } from '@reduxjs/toolkit';
import particleReducer from './StateTimeSeries';
import timerReducer from './timeSlice';
import CurrentStateReducer from './CurrentState';
import satelliteReducer from './satelliteSlice';
import authReducer from './authSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    particles: particleReducer,
    timer: timerReducer,
    CurrentState: CurrentStateReducer,
    satellites: satelliteReducer,
  },
});

export default store;
