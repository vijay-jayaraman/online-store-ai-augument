// Side effects of Redux actions (applying and saving the theme; later, saving the guest cart).

import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import { selectTheme, themeSet, themeToggled } from '../features/ui/uiSlice.js';
import { applyTheme, saveTheme } from '../lib/theme.js';

export function createListeners() {
  const listenerMiddleware = createListenerMiddleware();

  listenerMiddleware.startListening({
    matcher: isAnyOf(themeToggled, themeSet),
    effect: (action, listenerApi) => {
      const theme = selectTheme(listenerApi.getState());
      applyTheme(theme);
      saveTheme(theme);
    },
  });

  return listenerMiddleware;
}
