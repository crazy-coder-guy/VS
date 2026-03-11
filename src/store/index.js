import { configureStore } from '@reduxjs/toolkit';
import fileReducer from './fileSlice';
import extensionReducer from './extensionSlice';
import gitReducer from './gitSlice';

export const store = configureStore({
  reducer: {
    files: fileReducer,
    extensions: extensionReducer,
    git: gitReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store;
