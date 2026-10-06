import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { baseApi } from '../api/baseApi.js';
import uiReducer from '../features/ui/uiSlice.js';
import { createListeners } from './listeners.js';

const rootReducer = combineReducers({
  ui: uiReducer,
  [baseApi.reducerPath]: baseApi.reducer,
});

// Tests call makeStore() for a fresh store, optionally with preloaded state.
export function makeStore(preloadedState) {
  const listenerMiddleware = createListeners();
  return configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().prepend(listenerMiddleware.middleware).concat(baseApi.middleware),
  });
}

export const store = makeStore();

// Refetch on window focus and when the network reconnects.
setupListeners(store.dispatch);
