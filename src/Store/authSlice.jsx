import { createSlice } from '@reduxjs/toolkit';

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
  },
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
    },
    clearUser: (state) => {
      state.user = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase('SET_AUTH', (state, action) => {
      return action.payload;
    });
  },
});

export const { setUser, clearUser } = authSlice.actions;
export default authSlice.reducer;
