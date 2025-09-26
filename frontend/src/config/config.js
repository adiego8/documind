// =================================
// DOCUMIND Frontend Configuration
// =================================

// Security: Validate API URL to prevent injection
const validateApiUrl = (url) => {
  if (!url) return 'http://localhost:8080';
  
  // Only allow http/https protocols
  const allowedProtocols = ['http:', 'https:'];
  try {
    const parsedUrl = new URL(url);
    if (!allowedProtocols.includes(parsedUrl.protocol)) {
      console.warn('Invalid API URL protocol. Using default.');
      return 'http://localhost:8080';
    }
    return url;
  } catch (error) {
    console.warn('Invalid API URL format. Using default.');
    return 'http://localhost:8080';
  }
};

const config = {
  // Application
  appName: process.env.REACT_APP_NAME || 'DOCUMIND',
  appDescription: process.env.REACT_APP_DESCRIPTION || 'AI-powered document assistant platform',
  appVersion: process.env.REACT_APP_VERSION || '1.0.0',

  // API Configuration - Validated for security
  apiBaseUrl: validateApiUrl(process.env.REACT_APP_API_BASE_URL),
  apiTimeout: Math.max(5000, Math.min(60000, parseInt(process.env.REACT_APP_API_TIMEOUT) || 30000)),

  // Development - Only enabled in development mode
  debug: process.env.NODE_ENV === 'development' && process.env.REACT_APP_DEBUG === 'true',

  // Styling
  primaryColor: process.env.REACT_APP_PRIMARY_COLOR || '#1976d2',
  secondaryColor: process.env.REACT_APP_SECONDARY_COLOR || '#dc004e',

  // Features - Only enabled in development for security
  enableAnalytics: process.env.REACT_APP_ENABLE_ANALYTICS === 'true',
  enableDevTools: process.env.NODE_ENV === 'development' && process.env.REACT_APP_ENABLE_DEV_TOOLS === 'true',
};

export default config;