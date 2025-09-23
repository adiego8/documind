import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { login, logout } from './authSlice';
import config from '../../config/config';

// Helper function to format API errors
const formatError = (error) => {
  if (error.response?.data?.detail) {
    // If detail is an array (validation errors), format it
    if (Array.isArray(error.response.data.detail)) {
      return error.response.data.detail.map(err => err.msg || err).join(', ');
    }
    // If detail is a string, return it
    return error.response.data.detail;
  }
  // Fallback to error message
  return error.message || 'An error occurred';
};

const API_BASE_URL = config.apiBaseUrl;

// Async thunks for assistant operations
export const getAssistants = createAsyncThunk(
  'assistants/getAssistants',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const response = await axios.get(
        `${API_BASE_URL}/assistants`,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(formatError(error) || 'Failed to get assistants');
    }
  }
);

export const createAssistant = createAsyncThunk(
  'assistants/createAssistant',
  async (assistantData, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const response = await axios.post(
        `${API_BASE_URL}/assistants`,
        assistantData,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(formatError(error) || 'Failed to create assistant');
    }
  }
);

export const updateAssistant = createAsyncThunk(
  'assistants/updateAssistant',
  async ({ assistantId, assistantData }, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const response = await axios.put(
        `${API_BASE_URL}/assistants/${assistantId}`,
        assistantData,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(formatError(error) || 'Failed to update assistant');
    }
  }
);

export const deleteAssistant = createAsyncThunk(
  'assistants/deleteAssistant',
  async (assistantId, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      await axios.delete(
        `${API_BASE_URL}/assistants/${assistantId}`,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        }
      );
      return assistantId;
    } catch (error) {
      return rejectWithValue(formatError(error) || 'Failed to delete assistant');
    }
  }
);

export const queryAssistant = createAsyncThunk(
  'assistants/queryAssistant',
  async ({ assistantId, question }, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const response = await axios.post(
        `${API_BASE_URL}/assistants/${assistantId}/query`,
        {
          question,
          assistant_id: assistantId,
        },
        {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        }
      );
      return { ...response.data, assistantId };
    } catch (error) {
      return rejectWithValue(formatError(error) || 'Failed to query assistant');
    }
  }
);

export const getAssistantHistory = createAsyncThunk(
  'assistants/getAssistantHistory',
  async ({ assistantId, limit = 50 }, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const response = await axios.get(
        `${API_BASE_URL}/assistants/${assistantId}/history?limit=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        }
      );
      return { assistantId, queries: response.data.queries };
    } catch (error) {
      return rejectWithValue(formatError(error) || 'Failed to get assistant history');
    }
  }
);

export const uploadDocumentsToAssistant = createAsyncThunk(
  'assistants/uploadDocumentsToAssistant',
  async ({ assistantId, files }, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });

      const response = await axios.post(
        `${API_BASE_URL}/assistants/${assistantId}/documents`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return { assistantId, ...response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to upload documents');
    }
  }
);

export const getAssistantDocumentStats = createAsyncThunk(
  'assistants/getAssistantDocumentStats',
  async (assistantId, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const response = await axios.get(
        `${API_BASE_URL}/assistants/${assistantId}/documents/stats`,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        }
      );
      return { assistantId, stats: response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to get document stats');
    }
  }
);

export const clearAssistantDocuments = createAsyncThunk(
  'assistants/clearAssistantDocuments',
  async (assistantId, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const response = await axios.delete(
        `${API_BASE_URL}/assistants/${assistantId}/documents`,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        }
      );
      return { assistantId, ...response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to clear documents');
    }
  }
);

export const getAssistantDocuments = createAsyncThunk(
  'assistants/getAssistantDocuments',
  async (assistantId, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const response = await axios.get(
        `${API_BASE_URL}/assistants/${assistantId}/documents`,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        }
      );
      return { assistantId, documents: response.data.documents };
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to get documents');
    }
  }
);

export const deleteAssistantDocument = createAsyncThunk(
  'assistants/deleteAssistantDocument',
  async ({ assistantId, documentId }, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const response = await axios.delete(
        `${API_BASE_URL}/assistants/${assistantId}/documents/${documentId}`,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        }
      );
      return { assistantId, documentId, ...response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to delete document');
    }
  }
);

const assistantsSlice = createSlice({
  name: 'assistants',
  initialState: {
    assistants: [],
    currentAssistantId: null,
    queryHistory: {}, // { assistantId: [queries] }
    documentStats: {}, // { assistantId: { file_count, total_chunks, total_size } }
    documents: {}, // { assistantId: [documents] }
    isLoading: false,
    isQuerying: false,
    isUploading: false,
    isDeletingDocument: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentAssistant: (state, action) => {
      state.currentAssistantId = action.payload;
    },
    clearQueryHistory: (state, action) => {
      if (action.payload) {
        // Clear specific assistant history
        delete state.queryHistory[action.payload];
      } else {
        // Clear all history
        state.queryHistory = {};
      }
    },
    clearAllData: (state) => {
      // Reset to initial state
      state.assistants = [];
      state.currentAssistantId = null;
      state.queryHistory = {};
      state.documentStats = {};
      state.documents = {};
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get assistants
      .addCase(getAssistants.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getAssistants.fulfilled, (state, action) => {
        state.isLoading = false;
        state.assistants = action.payload.assistants;
        // Set first assistant as current if none selected
        if (!state.currentAssistantId && action.payload.assistants.length > 0) {
          state.currentAssistantId = action.payload.assistants[0].id;
        }
      })
      .addCase(getAssistants.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Create assistant
      .addCase(createAssistant.fulfilled, (state, action) => {
        state.assistants.push(action.payload);
      })
      // Update assistant
      .addCase(updateAssistant.fulfilled, (state, action) => {
        const index = state.assistants.findIndex(a => a.id === action.payload.id);
        if (index !== -1) {
          state.assistants[index] = action.payload;
        }
      })
      // Delete assistant
      .addCase(deleteAssistant.fulfilled, (state, action) => {
        state.assistants = state.assistants.filter(a => a.id !== action.payload);
        if (state.currentAssistantId === action.payload) {
          state.currentAssistantId = state.assistants.length > 0 ? state.assistants[0].id : null;
        }
        delete state.queryHistory[action.payload];
      })
      // Query assistant
      .addCase(queryAssistant.pending, (state) => {
        state.isQuerying = true;
        state.error = null;
      })
      .addCase(queryAssistant.fulfilled, (state, action) => {
        state.isQuerying = false;
        const { assistantId, ...queryData } = action.payload;
        
        // Add query to history
        if (!state.queryHistory[assistantId]) {
          state.queryHistory[assistantId] = [];
        }
        state.queryHistory[assistantId].unshift(queryData);
      })
      .addCase(queryAssistant.rejected, (state, action) => {
        state.isQuerying = false;
        state.error = action.payload;
      })
      // Get assistant history
      .addCase(getAssistantHistory.fulfilled, (state, action) => {
        const { assistantId, queries } = action.payload;
        state.queryHistory[assistantId] = queries;
      })
      // Upload documents
      .addCase(uploadDocumentsToAssistant.pending, (state) => {
        state.isUploading = true;
        state.error = null;
      })
      .addCase(uploadDocumentsToAssistant.fulfilled, (state, action) => {
        state.isUploading = false;
        // Refresh document stats will be handled separately
      })
      .addCase(uploadDocumentsToAssistant.rejected, (state, action) => {
        state.isUploading = false;
        state.error = action.payload;
      })
      // Get document stats
      .addCase(getAssistantDocumentStats.fulfilled, (state, action) => {
        const { assistantId, stats } = action.payload;
        state.documentStats[assistantId] = stats;
      })
      // Clear documents
      .addCase(clearAssistantDocuments.fulfilled, (state, action) => {
        const { assistantId } = action.payload;
        // Reset document stats for this assistant
        if (state.documentStats[assistantId]) {
          state.documentStats[assistantId].file_count = 0;
          state.documentStats[assistantId].total_chunks = 0;
          state.documentStats[assistantId].total_size = 0;
        }
        // Clear documents list
        if (state.documents[assistantId]) {
          state.documents[assistantId] = [];
        }
      })
      // Get assistant documents
      .addCase(getAssistantDocuments.fulfilled, (state, action) => {
        const { assistantId, documents } = action.payload;
        state.documents[assistantId] = documents;
      })
      .addCase(getAssistantDocuments.rejected, (state, action) => {
        state.error = action.payload;
      })
      // Delete assistant document
      .addCase(deleteAssistantDocument.pending, (state) => {
        state.isDeletingDocument = true;
        state.error = null;
      })
      .addCase(deleteAssistantDocument.fulfilled, (state, action) => {
        state.isDeletingDocument = false;
        const { assistantId, documentId } = action.payload;
        // Remove document from list
        if (state.documents[assistantId]) {
          state.documents[assistantId] = state.documents[assistantId].filter(
            doc => doc.id !== documentId
          );
        }
        // Update stats - will be refreshed by component
      })
      .addCase(deleteAssistantDocument.rejected, (state, action) => {
        state.isDeletingDocument = false;
        state.error = action.payload;
      })
      // Clear all data on logout
      .addCase(logout.fulfilled, (state) => {
        state.assistants = [];
        state.currentAssistantId = null;
        state.queryHistory = {};
        state.documentStats = {};
        state.documents = {};
        state.error = null;
      })
      // Clear all data on login (new user)
      .addCase(login.fulfilled, (state) => {
        state.assistants = [];
        state.currentAssistantId = null;
        state.queryHistory = {};
        state.documentStats = {};
        state.documents = {};
        state.error = null;
      });
  },
});

export const { 
  clearError, 
  setCurrentAssistant, 
  clearQueryHistory,
  clearAllData
} = assistantsSlice.actions;

export default assistantsSlice.reducer;