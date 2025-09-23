import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import assistantReducer from './slices/assistantSlice';
import assistantsReducer from './slices/assistantsSlice';
import adminReducer from './slices/adminSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    assistant: assistantReducer,
    assistants: assistantsReducer,
    admin: adminReducer,
  },
});

export default store;