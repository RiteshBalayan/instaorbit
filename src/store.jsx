import { configureStore } from '@reduxjs/toolkit';
import particleReducer from './StateTimeSeries';

const store = configureStore({
  reducer: {
    particles: particleReducer,
  },
});

export default store;
