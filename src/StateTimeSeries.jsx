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
      const particle = state.particles.find(p => p.id === id);
      if (particle) {
        // Check if the trace point already exists
        const existingTracePoint = particle.tracePoints.find(tp => (
          tp.time === tracePoint.time &&
          tp.x === tracePoint.x &&
          tp.y === tracePoint.y &&
          tp.z === tracePoint.z
        ));
        if (!existingTracePoint) {
          particle.tracePoints.push(tracePoint);
        }
      }
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

export const { initializeParticles, addTracePoint, resetTracePoints } = particleSlice.actions;
export default particleSlice.reducer;
