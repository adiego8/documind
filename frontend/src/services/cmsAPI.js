import apiClient from '../utils/apiClient';

// CMS API service for handling all CMS-related API calls
export const cmsAPI = {
  // Get CMS statistics
  getStats: async () => {
    const response = await apiClient.get('/cms/stats');
    return response.data;
  },

  // Get all articles
  getArticles: async (params = {}) => {
    const response = await apiClient.get('/cms/articles', { params });
    return response.data;
  },

  // Get article by ID
  getArticleById: async (id) => {
    const response = await apiClient.get(`/cms/articles/${id}`);
    return response.data;
  },

  // Create new article
  createArticle: async (articleData) => {
    const response = await apiClient.post('/cms/articles', articleData);
    return response.data;
  },

  // Update existing article
  updateArticle: async (id, articleData) => {
    const response = await apiClient.put(`/cms/articles/${id}`, articleData);
    return response.data;
  },

  // Publish article
  publishArticle: async (id) => {
    const response = await apiClient.post(`/cms/articles/${id}/publish`);
    return response.data;
  },

  // Delete article
  deleteArticle: async (id) => {
    const response = await apiClient.delete(`/cms/articles/${id}`);
    return response.data;
  },

  // Generate AI content
  generateContent: async (generationData) => {
    const response = await apiClient.post('/cms/generate', generationData);
    return response.data;
  },

  // Public API methods (for public-facing websites)
  public: {
    // Get published articles (requires admin code in header)
    getPublishedArticles: async (adminCode, params = {}) => {
      const response = await apiClient.get('/cms/public/articles', {
        params,
        headers: {
          'X-Admin-Code': adminCode
        }
      });
      return response.data;
    },

    // Get published article by slug (requires admin code in header)
    getPublishedArticleBySlug: async (adminCode, slug) => {
      const response = await apiClient.get(`/cms/public/articles/${slug}`, {
        headers: {
          'X-Admin-Code': adminCode
        }
      });
      return response.data;
    },

    // Get public stats (requires admin code in header)
    getPublicStats: async (adminCode) => {
      const response = await apiClient.get('/cms/public/stats', {
        headers: {
          'X-Admin-Code': adminCode
        }
      });
      return response.data;
    }
  }
};

export default cmsAPI;