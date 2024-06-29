import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  particles: [],
};

const particleSlice = createSlice({
  name: 'particles',
  initialState,
  reducers: {
    initializeParticles: (state, action) => {
      state.particles = action.payload;
    },
    addTracePoint: (state, action) => {
      const { id, tracePoint } = action.payload;
      state.particles[id].tracePoints.push(tracePoint);
    },
  },
});

export const { initializeParticles, addTracePoint } = particleSlice.actions;
export default particleSlice.reducer;
