import axios from 'axios';
import config from '../config/config';
import { tokenUtils } from './tokenUtils';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: config.apiTimeout,
});

// Add request interceptor to automatically include token
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

// Add response interceptor to handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // If we get a 401, clear the token and redirect to login
    if (error.response?.status === 401) {
      tokenUtils.clearAuth();
      // Don't redirect here to avoid circular dependencies
      // Let the component handle the redirect
      window.dispatchEvent(new CustomEvent('auth-error'));
    }
    return Promise.reject(error);
  }
);

export default apiClient;