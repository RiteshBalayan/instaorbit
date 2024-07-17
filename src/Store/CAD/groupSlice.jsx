// groupSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  groups: [],
  selectedGroup: null,
};

const groupSlice = createSlice({
  name: 'groups',
  initialState,
  reducers: {
    addGroup: (state, action) => {
      const newGroup = {
        id: Date.now(),
        name: action.payload,
        layers: [],
        visible: true,
      };
      state.groups.push(newGroup);
    },
    addLayer: (state, action) => {
      const { groupId, layer } = action.payload;
      const group = state.groups.find(group => group.id === groupId);
      if (group) {
        group.layers.push(layer);
      }
    },
    setSelectedGroup: (state, action) => {
      state.selectedGroup = action.payload;
    },
    toggleGroupVisibility: (state, action) => {
      const group = state.groups.find(group => group.id === action.payload);
      if (group) {
        group.visible = !group.visible;
      }
    },
    updateLayer: (state, action) => {
      const { groupId, layerId, updatedLayer } = action.payload;
      const group = state.groups.find(group => group.id === groupId);
      if (group) {
        const layerIndex = group.layers.findIndex(layer => layer.id === layerId);
        if (layerIndex !== -1) {
          group.layers[layerIndex] = updatedLayer;
        }
      }
    },
    deleteLayer: (state, action) => {
      const { groupId, layerId } = action.payload;
      const group = state.groups.find(group => group.id === groupId);
      if (group) {
        group.layers = group.layers.filter(layer => layer.id !== layerId);
      }
    },
  },
});

export const {
  addGroup,
  addLayer,
  setSelectedGroup,
  toggleGroupVisibility,
  updateLayer,
  deleteLayer,
} = groupSlice.actions;

export default groupSlice.reducer;
