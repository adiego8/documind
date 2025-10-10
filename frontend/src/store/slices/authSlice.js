import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../utils/axiosConfig';
import config from '../../config/config';
import { tokenUtils } from '../../utils/tokenUtils';

const API_BASE_URL = config.apiBaseUrl;

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

// Async thunks for auth operations
export const login = createAsyncThunk(
  'auth/login',
  async ({ username, password }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(`${API_BASE_URL}/auth/login`, {
        username,
        password,
      });
      tokenUtils.setToken(response.data.access_token);
      tokenUtils.setRole(response.data.role);
      return response.data;
    } catch (error) {
      return rejectWithValue(formatError(error) || 'Login failed');
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async ({ username, password, role, adminCode, userCode }, { rejectWithValue }) => {
    try {
      let url = `${API_BASE_URL}/auth/register`;
      
      // If registering as admin, use admin_code
      if (role === 'admin' && adminCode) {
        url += `?admin_code=${adminCode}`;
      }
      // If registering as user, use user_code  
      else if (role === 'user' && userCode) {
        url += `?user_code=${userCode}`;
      }
      
      const response = await apiClient.post(url, {
        username,
        password,
        role,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(formatError(error) || 'Registration failed');
    }
  }
);

export const validateUserCode = createAsyncThunk(
  'auth/validateUserCode',
  async (code, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`${API_BASE_URL}/user-codes/${code}/validate`);
      return response.data;
    } catch (error) {
      return rejectWithValue(formatError(error) || 'User code validation failed');
    }
  }
);

// Legacy function for admin code validation (still uses old endpoint)
export const validateAdminCode = createAsyncThunk(
  'auth/validateAdminCode',
  async (code, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`${API_BASE_URL}/admin/codes/${code}/validate`);
      return response.data;
    } catch (error) {
      return rejectWithValue(formatError(error) || 'Admin code validation failed');
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  tokenUtils.clearAuth();
  return {};
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: tokenUtils.getToken(),
    role: tokenUtils.getRole(),
    isLoading: false,
    error: null,
    isAuthenticated: tokenUtils.hasToken(),
    adminCodeValidation: null,
    isValidatingCode: false,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearAdminCodeValidation: (state) => {
      state.adminCodeValidation = null;
    },
    initializeAuth: (state) => {
      const token = tokenUtils.getToken();
      const role = tokenUtils.getRole();
      if (token) {
        state.token = token;
        state.role = role;
        state.isAuthenticated = true;
      }
    },
    forceLogout: (state) => {
      tokenUtils.clearAuth();
      state.user = null;
      state.token = null;
      state.role = null;
      state.isAuthenticated = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.access_token;
        state.role = action.payload.role;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      })
      // Register
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.role = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      // Validate User Code
      .addCase(validateUserCode.pending, (state) => {
        state.isValidatingCode = true;
        state.adminCodeValidation = null;
      })
      .addCase(validateUserCode.fulfilled, (state, action) => {
        state.isValidatingCode = false;
        state.adminCodeValidation = action.payload;
      })
      .addCase(validateUserCode.rejected, (state, action) => {
        state.isValidatingCode = false;
        state.adminCodeValidation = { valid: false, error: action.payload };
      })
      // Legacy Admin Code validation (same as user code)
      .addCase(validateAdminCode.pending, (state) => {
        state.isValidatingCode = true;
        state.adminCodeValidation = null;
      })
      .addCase(validateAdminCode.fulfilled, (state, action) => {
        state.isValidatingCode = false;
        state.adminCodeValidation = action.payload;
      })
      .addCase(validateAdminCode.rejected, (state, action) => {
        state.isValidatingCode = false;
        state.adminCodeValidation = { valid: false, error: action.payload };
      });
  },
});

export const { clearError, initializeAuth, clearAdminCodeValidation, forceLogout } = authSlice.actions;
export default authSlice.reducer;