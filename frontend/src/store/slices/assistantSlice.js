import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import config from '../../config/config';

const API_BASE_URL = config.apiBaseUrl;

// Async thunks for assistant configuration
export const getAssistantConfig = createAsyncThunk(
  'assistant/getConfig',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const response = await axios.get(
        `${API_BASE_URL}/assistant/config`,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data.detail || 'Failed to get assistant config');
    }
  }
);

export const updateAssistantConfig = createAsyncThunk(
  'assistant/updateConfig',
  async (configData, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const response = await axios.put(
        `${API_BASE_URL}/assistant/config`,
        configData,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data.detail || 'Failed to update assistant config');
    }
  }
);

export const uploadDocuments = createAsyncThunk(
  'assistant/uploadDocuments',
  async (formData, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const response = await axios.post(
        `${API_BASE_URL}/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data.detail || 'Failed to upload documents');
    }
  }
);

export const getDocumentStats = createAsyncThunk(
  'assistant/getStats',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const response = await axios.get(
        `${API_BASE_URL}/stats`,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data.detail || 'Failed to get stats');
    }
  }
);

export const clearDocuments = createAsyncThunk(
  'assistant/clearDocuments',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const response = await axios.delete(
        `${API_BASE_URL}/documents`,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data.detail || 'Failed to clear documents');
    }
  }
);

const assistantSlice = createSlice({
  name: 'assistant',
  initialState: {
    config: {
      name: 'Assistant',
      initial_context: 'You are a helpful AI assistant. Use the provided documents to answer questions accurately and helpfully.',
      temperature: 0.7,
      max_tokens: 1000,
    },
    stats: {
      document_count: 0,
      collection_name: '',
    },
    isLoading: false,
    isUploading: false,
    error: null,
    uploadProgress: 0,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUploadProgress: (state, action) => {
      state.uploadProgress = action.payload;
    },
    updateConfigLocally: (state, action) => {
      state.config = { ...state.config, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      // Get assistant config
      .addCase(getAssistantConfig.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getAssistantConfig.fulfilled, (state, action) => {
        state.isLoading = false;
        state.config = { ...state.config, ...action.payload };
      })
      .addCase(getAssistantConfig.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Update assistant config
      .addCase(updateAssistantConfig.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateAssistantConfig.fulfilled, (state, action) => {
        state.isLoading = false;
        state.config = { ...state.config, ...action.payload };
      })
      .addCase(updateAssistantConfig.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Upload documents
      .addCase(uploadDocuments.pending, (state) => {
        state.isUploading = true;
        state.error = null;
        state.uploadProgress = 0;
      })
      .addCase(uploadDocuments.fulfilled, (state, action) => {
        state.isUploading = false;
        state.uploadProgress = 100;
      })
      .addCase(uploadDocuments.rejected, (state, action) => {
        state.isUploading = false;
        state.error = action.payload;
        state.uploadProgress = 0;
      })
      // Get document stats
      .addCase(getDocumentStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      })
      // Clear documents
      .addCase(clearDocuments.fulfilled, (state) => {
        state.stats.document_count = 0;
      });
  },
});

export const { clearError, setUploadProgress, updateConfigLocally } = assistantSlice.actions;
export default assistantSlice.reducer;