import { configureStore } from '@reduxjs/toolkit';
import particleReducer from './StateTimeSeries';
import timerReducer from './timeSlice';
import CurrentStateReducer from './CurrentState';
import satelliteReducer from './satelliteSlice';
import groupReducer from './groupSlice';
import authReducer from './authSlice';
import workingProjectReducer from './workingProject';
import viewReducer from './View';

const store = configureStore({
  reducer: {
    auth: authReducer,
    particles: particleReducer,
    timer: timerReducer,
    CurrentState: CurrentStateReducer,
    satellites: satelliteReducer,
    groups: groupReducer,
    workingProject: workingProjectReducer,
    view: viewReducer,
  },
});

export default store;
