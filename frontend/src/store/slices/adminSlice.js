import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import config from '../../config/config';

const API_BASE_URL = config.apiBaseUrl;

// Async thunks for admin operations
export const getAdminCodes = createAsyncThunk(
  'admin/getAdminCodes',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const response = await axios.get(
        `${API_BASE_URL}/admin/codes`,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to get admin codes');
    }
  }
);


export const getAdminConversations = createAsyncThunk(
  'admin/getAdminConversations',
  async (filters = {}, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const { limit = 100, user_id, assistant_id, username } = filters;
      
      // Build query parameters
      const params = new URLSearchParams({ limit: limit.toString() });
      if (user_id) params.append('user_id', user_id);
      if (assistant_id) params.append('assistant_id', assistant_id);
      if (username) params.append('username', username);
      
      const response = await axios.get(
        `${API_BASE_URL}/admin/conversations?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to get conversations');
    }
  }
);

export const getConversationMessages = createAsyncThunk(
  'admin/getConversationMessages',
  async (conversationId, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const response = await axios.get(
        `${API_BASE_URL}/admin/conversations/${conversationId}/messages`,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        }
      );
      return { conversationId, messages: response.data.messages };
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to get conversation messages');
    }
  }
);

const adminSlice = createSlice({
  name: 'admin',
  initialState: {
    adminCodes: [],
    conversations: [],
    conversationMessages: {}, // { conversationId: [messages] }
    isLoading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearConversationMessages: (state, action) => {
      if (action.payload) {
        // Clear specific conversation messages
        delete state.conversationMessages[action.payload];
      } else {
        // Clear all messages
        state.conversationMessages = {};
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Get admin codes
      .addCase(getAdminCodes.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getAdminCodes.fulfilled, (state, action) => {
        state.isLoading = false;
        state.adminCodes = action.payload.codes;
      })
      .addCase(getAdminCodes.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Get admin conversations
      .addCase(getAdminConversations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getAdminConversations.fulfilled, (state, action) => {
        state.isLoading = false;
        state.conversations = action.payload.conversations;
      })
      .addCase(getAdminConversations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Get conversation messages
      .addCase(getConversationMessages.fulfilled, (state, action) => {
        const { conversationId, messages } = action.payload;
        state.conversationMessages[conversationId] = messages;
      })
      .addCase(getConversationMessages.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { 
  clearError, 
  clearConversationMessages 
} = adminSlice.actions;

export default adminSlice.reducer;