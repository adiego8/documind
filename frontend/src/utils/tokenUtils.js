// Secure token storage utilities
// Uses sessionStorage instead of localStorage for better security
// Sessions expire when browser is closed, reducing token persistence risk

const TOKEN_KEY = 'auth_token';
const ROLE_KEY = 'user_role';

export const tokenUtils = {
  // Store token securely
  setToken: (token) => {
    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token);
    }
  },

  // Store user role
  setRole: (role) => {
    if (role) {
      sessionStorage.setItem(ROLE_KEY, role);
    }
  },

  // Get token
  getToken: () => {
    return sessionStorage.getItem(TOKEN_KEY);
  },

  // Get user role
  getRole: () => {
    return sessionStorage.getItem(ROLE_KEY);
  },

  // Remove all auth data (logout)
  clearAuth: () => {
    // Clear sessionStorage
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(ROLE_KEY);
    
    // Clean up any old localStorage tokens for security
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
  },

  // Check if token exists
  hasToken: () => {
    return !!sessionStorage.getItem(TOKEN_KEY);
  }
};