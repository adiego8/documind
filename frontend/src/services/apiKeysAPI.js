import apiClient from '../utils/apiClient';

// API Keys service for handling all API key management calls
export const apiKeysAPI = {
  // Get all API keys for the current admin
  getAPIKeys: async () => {
    const response = await apiClient.get('/api-keys');
    return response.data;
  },

  // Get specific API key by ID
  getAPIKey: async (keyId) => {
    const response = await apiClient.get(`/api-keys/${keyId}`);
    return response.data;
  },

  // Create new API key
  createAPIKey: async (keyData) => {
    const response = await apiClient.post('/api-keys', keyData);
    return response.data;
  },

  // Update existing API key
  updateAPIKey: async (keyId, keyData) => {
    const response = await apiClient.put(`/api-keys/${keyId}`, keyData);
    return response.data;
  },

  // Delete API key
  deleteAPIKey: async (keyId) => {
    const response = await apiClient.delete(`/api-keys/${keyId}`);
    return response.data;
  },

  // Regenerate API key
  regenerateAPIKey: async (keyId) => {
    const response = await apiClient.post(`/api-keys/${keyId}/regenerate`);
    return response.data;
  },

  // Get usage statistics for API key
  getUsageStats: async (keyId, days = 30) => {
    const response = await apiClient.get(`/api-keys/${keyId}/usage`, {
      params: { days }
    });
    return response.data;
  }
};

export default apiKeysAPI;