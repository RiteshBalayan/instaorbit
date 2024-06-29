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
    resetTracePoints: (state, action) => {
        const id = action.payload;
        const particle = state.particles.find(p => p.id === id);
        if (particle) {
          particle.tracePoints = [];
        }
    },
  },
});

export const { initializeParticles, addTracePoint,  resetTracePoints} = particleSlice.actions;
export default particleSlice.reducer;
