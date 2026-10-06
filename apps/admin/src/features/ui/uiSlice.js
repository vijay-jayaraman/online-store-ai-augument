import { createSlice } from '@reduxjs/toolkit';
import { THEMES, getInitialTheme } from '../../lib/theme.js';

const uiSlice = createSlice({
  name: 'ui',
  initialState: () => ({ theme: getInitialTheme() }),
  reducers: {
    themeToggled(state) {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
    },
    themeSet(state, action) {
      if (THEMES.includes(action.payload)) state.theme = action.payload;
    },
  },
});

export const { themeToggled, themeSet } = uiSlice.actions;

export const selectTheme = (state) => state.ui.theme;

export default uiSlice.reducer;
