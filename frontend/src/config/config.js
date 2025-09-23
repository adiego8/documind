// =================================
// DOCUMIND Frontend Configuration
// =================================

const config = {
  // Application
  appName: process.env.REACT_APP_NAME || 'DOCUMIND',
  appDescription: process.env.REACT_APP_DESCRIPTION || 'AI-powered document assistant platform',
  appVersion: process.env.REACT_APP_VERSION || '1.0.0',
  
  // API Configuration
  apiBaseUrl: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000',
  apiTimeout: parseInt(process.env.REACT_APP_API_TIMEOUT) || 30000,
  
  // Development
  debug: process.env.REACT_APP_DEBUG === 'true',
  
  // Styling
  primaryColor: process.env.REACT_APP_PRIMARY_COLOR || '#1976d2',
  secondaryColor: process.env.REACT_APP_SECONDARY_COLOR || '#dc004e',
  
  // Features
  enableAnalytics: process.env.REACT_APP_ENABLE_ANALYTICS === 'true',
  enableDevTools: process.env.REACT_APP_ENABLE_DEV_TOOLS === 'true',
};

export default config;