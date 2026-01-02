import { configureStore } from '@reduxjs/toolkit';
import particleReducer from './StateTimeSeries';
import timerReducer from './timeSlice';
import CurrentStateReducer from './CurrentState';
import satelliteReducer from './satelliteSlice';
import groupReducer from './groupSlice';
import authReducer from './authSlice';
import workingProjectReducer from './workingProject';
import viewReducer from './View';
import trajectoryReducer from './trajectorySlice';
import groundStationsReducer from './groundStationSlice';
import communicationReducer from './communicationSlice';

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
    trajectoryList: trajectoryReducer,
    groundStations: groundStationsReducer,
    communication: communicationReducer,
  },
});

export default store;
