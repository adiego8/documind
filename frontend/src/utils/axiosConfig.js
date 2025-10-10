import axios from 'axios';
import { tokenUtils } from './tokenUtils';
import store from '../store/store';
import { forceLogout } from '../store/slices/authSlice';

// Create axios instance
const apiClient = axios.create();

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = tokenUtils.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Check if error is due to unauthorized access (401) or forbidden (403)
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      // Check if it's a token expiration or invalid token
      const errorMessage = error.response.data?.detail || '';
      
      if (
        errorMessage.includes('token') || 
        errorMessage.includes('expired') || 
        errorMessage.includes('invalid') ||
        error.response.status === 401
      ) {
        // Force logout and redirect to login
        store.dispatch(forceLogout());
        
        // Redirect to login page
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;