import { createSlice } from '@reduxjs/toolkit';

const initialState = [];

const trajectorySlice = createSlice({
  name: 'trajectoryList',
  initialState,
  reducers: {
    setTrajectories(state, action) {
      return action.payload;
    },
    
    addTrajectory(state, action) {
      // Destructure to separate protected fields from user-provided data
      const { 
        createdAt: _createdAt, // Ignore any provided createdAt
        updatedAt: _updatedAt, // Ignore any provided updatedAt
        ...userPayload 
      } = action.payload;
      
      const trajectory = {
        id: userPayload.id || `traj-${Date.now()}`,
        name: userPayload.name || 'Untitled Trajectory',
        description: userPayload.description || '',
        archived: false,
        createdBy: userPayload.createdBy || null,
        iterationCount: 1,
        tags: userPayload.tags || [],
        thumbnail: userPayload.thumbnail || null,
        ...userPayload,
        // Protected timestamps - always set by server, AFTER spread
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      state.push(trajectory);
    },
    
    updateTrajectory(state, action) {
      const { id, changes } = action.payload;
      return state.map(t => 
        t.id === id 
          ? { ...t, ...changes, updatedAt: Date.now() } 
          : t
      );
    },
    
    deleteTrajectory(state, action) {
      const id = action.payload;
      return state.filter(t => t.id !== id);
    },
    
    toggleArchive(state, action) {
      const { id, archived } = action.payload;
      return state.map(t => 
        t.id === id 
          ? { ...t, archived, updatedAt: Date.now() } 
          : t
      );
    },
    
    incrementIterationCount(state, action) {
      const id = action.payload;
      return state.map(t => 
        t.id === id 
          ? { ...t, iterationCount: (t.iterationCount || 1) + 1, updatedAt: Date.now() } 
          : t
      );
    },
    
    addTagToTrajectory(state, action) {
      const { id, tag } = action.payload;
      return state.map(t => {
        if (t.id === id) {
          const tags = t.tags || [];
          if (!tags.includes(tag)) {
            return { ...t, tags: [...tags, tag], updatedAt: Date.now() };
          }
        }
        return t;
      });
    },
    
    removeTagFromTrajectory(state, action) {
      const { id, tag } = action.payload;
      return state.map(t => {
        if (t.id === id && t.tags) {
          return { ...t, tags: t.tags.filter(tg => tg !== tag), updatedAt: Date.now() };
        }
        return t;
      });
    },
    
    setThumbnail(state, action) {
      const { id, thumbnail } = action.payload;
      return state.map(t => 
        t.id === id 
          ? { ...t, thumbnail, updatedAt: Date.now() } 
          : t
      );
    },
  },
  extraReducers: (builder) => {
    builder.addCase('SET_TRAJECTORIES', (state, action) => {
      return action.payload;
    });
  },
});

export const { 
  setTrajectories, 
  addTrajectory,
  updateTrajectory,
  deleteTrajectory,
  toggleArchive,
  incrementIterationCount,
  addTagToTrajectory,
  removeTagFromTrajectory,
  setThumbnail,
} = trajectorySlice.actions;

export default trajectorySlice.reducer;
