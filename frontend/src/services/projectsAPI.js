import apiClient from '../utils/apiClient';

/**
 * Projects API Service
 * Service layer for managing AssistantJS projects
 */
export const projectsAPI = {
  // Get all projects for the current admin
  getProjects: async () => {
    const response = await apiClient.get('/projects');
    return response.data;
  },

  // Get specific project by ID
  getProject: async (projectId) => {
    const response = await apiClient.get(`/projects/${projectId}`);
    return response.data;
  },

  // Create new project
  createProject: async (projectData) => {
    const response = await apiClient.post('/projects', projectData);
    return response.data;
  },

  // Update existing project
  updateProject: async (projectId, projectData) => {
    const response = await apiClient.put(`/projects/${projectId}`, projectData);
    return response.data;
  },

  // Delete project
  deleteProject: async (projectId) => {
    const response = await apiClient.delete(`/projects/${projectId}`);
    return response.data;
  },

  // Get project usage statistics
  getProjectStats: async (projectId) => {
    const response = await apiClient.get(`/projects/${projectId}/stats`);
    return response.data;
  }
};