import { configureStore } from '@reduxjs/toolkit';
import particleReducer from './StateTimeSeries';
import timerReducer from './timeSlice';
import CurrentStateReducer from './CurrentState';

const store = configureStore({
  reducer: {
    particles: particleReducer,
    timer: timerReducer,
    CurrentState: CurrentStateReducer,
  },
});

export default store;
