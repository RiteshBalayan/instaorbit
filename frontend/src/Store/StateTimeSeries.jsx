import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  particles: [
  ],

};

const particleSlice = createSlice({
  name: 'particles',
  initialState,
  reducers: {
    initializeParticles: (state, action) => {
      const newParticle = action.payload;
      // Prevent duplicate entries — remove any existing particle with same id first
      state.particles = state.particles.filter(p => p.id !== newParticle.id);
      state.particles.push(newParticle);
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
    bulkLoadTracePoints: (state, action) => {
      const { id, tracePoints } = action.payload;
      const particle = state.particles.find(p => p.id === id);
      if (particle) {
        particle.tracePoints = tracePoints;
      }
    },
    resetTracePoints: (state, action) => {
      const id = action.payload;
      const particle = state.particles.find(p => p.id === id);
      if (particle) {
        particle.tracePoints = [];
      }
    },
    deleteParticle: (state, action) => {
      const idToDelete = action.payload;
      state.particles = state.particles.filter(particle => particle.id !== idToDelete);
    },
  },
  extraReducers: (builder) => {
    builder.addCase('SET_PARTICLES', (state, action) => {
      return { ...initialState, ...action.payload };
    });
  },
});

export const { initializeParticles, addTracePoint, bulkLoadTracePoints, resetTracePoints, deleteParticle } = particleSlice.actions;
export default particleSlice.reducer;
