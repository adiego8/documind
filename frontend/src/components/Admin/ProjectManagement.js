import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Grid,
  Alert,
  Tooltip,
  Tabs,
  Tab,
  Snackbar
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon, ContentCopy as CopyIcon,
  Analytics as StatsIcon,
  Code as CodeIcon
} from '@mui/icons-material';
import { projectsAPI } from '../../services/projectsAPI';
import apiClient from '../../utils/apiClient';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`project-tabpanel-${index}`}
      aria-labelledby={`project-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const ProjectManagement = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);

  // Selected project for operations
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectStats, setProjectStats] = useState(null);

  // Tab state
  const [tabValue, setTabValue] = useState(0);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    allowed_domains: [],
    allowed_assistants: [],
    requests_per_minute: 10,
    requests_per_day: 100,
    requests_per_session: 50,
    session_duration_minutes: 60,
    max_concurrent_sessions: 100,
    is_active: true
  });

  // Available assistants (you might want to fetch this from an API)
  const [availableAssistants, setAvailableAssistants] = useState([]);

  useEffect(() => {
    loadProjects();
    loadAvailableAssistants();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await projectsAPI.getProjects();
      setProjects(data);
    } catch (err) {
      setError('Failed to load projects: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableAssistants = async () => {
    try {
      // Fetch real assistants from the API using apiClient
      const response = await apiClient.get('/assistants');

      // Extract assistant names from the API response
      const assistantNames = response.data.assistants
        .filter(assistant => assistant.is_active)
        .map(assistant => assistant.name);

      setAvailableAssistants(assistantNames);
    } catch (err) {
      console.error('Error loading assistants:', err);
      // If there's an error, set empty array so no assistants are shown
      setAvailableAssistants([]);
    }
  };

  const handleCreateProject = async () => {
    try {
      await projectsAPI.createProject(formData);
      setSuccess('Project created successfully');
      setCreateDialogOpen(false);
      resetForm();
      loadProjects();
    } catch (err) {
      setError('Failed to create project: ' + err.message);
    }
  };

  const handleUpdateProject = async () => {
    try {
      await projectsAPI.updateProject(selectedProject.project_id, formData);
      setSuccess('Project updated successfully');
      setEditDialogOpen(false);
      resetForm();
      loadProjects();
    } catch (err) {
      setError('Failed to update project: ' + err.message);
    }
  };

  const handleDeleteProject = async () => {
    try {
      await projectsAPI.deleteProject(selectedProject.project_id);
      setSuccess('Project deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedProject(null);
      loadProjects();
    } catch (err) {
      setError('Failed to delete project: ' + err.message);
    }
  };

  const handleViewStats = async (project) => {
    try {
      setSelectedProject(project);
      const stats = await projectsAPI.getProjectStats(project.project_id);
      setProjectStats(stats);
      setStatsDialogOpen(true);
    } catch (err) {
      setError('Failed to load project stats: ' + err.message);
    }
  };

  const openCreateDialog = () => {
    resetForm();
    setCreateDialogOpen(true);
  };

  const openEditDialog = (project) => {
    setSelectedProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
      allowed_domains: project.allowed_domains || [],
      allowed_assistants: project.allowed_assistants || [],
      requests_per_minute: project.requests_per_minute,
      requests_per_day: project.requests_per_day,
      requests_per_session: project.requests_per_session,
      session_duration_minutes: project.session_duration_minutes,
      max_concurrent_sessions: project.max_concurrent_sessions,
      is_active: project.is_active
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (project) => {
    setSelectedProject(project);
    setDeleteDialogOpen(true);
  };

  const openCodeDialog = (project) => {
    setSelectedProject(project);
    setCodeDialogOpen(true);
  };

  const getExampleAssistantId = (project) => {
    if (project?.allowed_assistants && project.allowed_assistants.length > 0) {
      return project.allowed_assistants[0];
    }
    return 'your_assistant_name';
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      allowed_domains: [],
      allowed_assistants: [],
      requests_per_minute: 10,
      requests_per_day: 100,
      requests_per_session: 50,
      session_duration_minutes: 60,
      max_concurrent_sessions: 100,
      is_active: true
    });
    setSelectedProject(null);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleArrayInput = (field, value) => {
    const array = value.split(',').map(item => item.trim()).filter(item => item);
    setFormData(prev => ({ ...prev, [field]: array }));
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, pt: 2, px: 2 }}>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
          AssistantJS Projects
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreateDialog}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 2,
            px: 3,
            py: 1,
            textTransform: 'none',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
            '&:hover': {
              background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
              boxShadow: '0 6px 20px rgba(102, 126, 234, 0.6)',
              transform: 'translateY(-1px)'
            },
            transition: 'all 0.2s ease-in-out'
          }}
        >
          Create Project
        </Button>
      </Box>

      {/* Projects Table */}
      <TableContainer
        component={Paper}
        sx={{
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Project Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Project ID</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Rate Limits</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">Loading projects...</Typography>
                </TableCell>
              </TableRow>
            ) : projects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    No projects found. Create your first project to get started!
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              projects.map((project) => (
                <TableRow key={project.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {project.name}
                      </Typography>
                      {project.description && (
                        <Typography variant="caption" color="text.secondary">
                          {project.description}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {project.project_id}
                      </Typography>
                      <Tooltip title="Copy Project ID">
                        <IconButton
                          size="small"
                          onClick={() => copyToClipboard(project.project_id)}
                        >
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={project.is_active ? 'Active' : 'Inactive'}
                      color={project.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" display="block">
                      {project.requests_per_minute}/min
                    </Typography>
                    <Typography variant="caption" display="block">
                      {project.requests_per_day}/day
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(project.created_at)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="View Stats">
                        <IconButton
                          size="small"
                          onClick={() => handleViewStats(project)}
                          sx={{ color: '#667eea' }}
                        >
                          <StatsIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Integration Code">
                        <IconButton
                          size="small"
                          onClick={() => openCodeDialog(project)}
                          sx={{ color: '#4caf50' }}
                        >
                          <CodeIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => openEditDialog(project)}
                          sx={{ color: '#ff9800' }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={() => openDeleteDialog(project)}
                          sx={{ color: '#f44336' }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create/Edit Project Dialog */}
      <Dialog
        open={createDialogOpen || editDialogOpen}
        onClose={() => { setCreateDialogOpen(false); setEditDialogOpen(false); }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {createDialogOpen ? 'Create New Project' : 'Edit Project'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
            <TextField
              fullWidth
              label="Project Name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />

            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              multiline
              rows={2}
            />

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Requests per Minute"
                  type="number"
                  value={formData.requests_per_minute}
                  onChange={(e) => setFormData(prev => ({ ...prev, requests_per_minute: parseInt(e.target.value) }))}
                  inputProps={{ min: 1, max: 1000 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Requests per Day"
                  type="number"
                  value={formData.requests_per_day}
                  onChange={(e) => setFormData(prev => ({ ...prev, requests_per_day: parseInt(e.target.value) }))}
                  inputProps={{ min: 1, max: 10000 }}
                />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Requests per Session"
                  type="number"
                  value={formData.requests_per_session}
                  onChange={(e) => setFormData(prev => ({ ...prev, requests_per_session: parseInt(e.target.value) }))}
                  inputProps={{ min: 1, max: 1000 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Session Duration (minutes)"
                  type="number"
                  value={formData.session_duration_minutes}
                  onChange={(e) => setFormData(prev => ({ ...prev, session_duration_minutes: parseInt(e.target.value) }))}
                  inputProps={{ min: 5, max: 1440 }}
                />
              </Grid>
            </Grid>

            <TextField
              fullWidth
              label="Allowed Domains (comma-separated)"
              value={formData.allowed_domains.join(', ')}
              onChange={(e) => handleArrayInput('allowed_domains', e.target.value)}
              placeholder="example.com, *.mysite.com"
              helperText="Leave empty to allow all domains. Use *.domain.com for subdomains."
            />

            <FormControl fullWidth>
              <InputLabel>Allowed Assistants</InputLabel>
              <Select
                multiple
                value={formData.allowed_assistants}
                onChange={(e) => setFormData(prev => ({ ...prev, allowed_assistants: e.target.value }))}
                disabled={availableAssistants.length === 0}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {availableAssistants.map((assistant) => (
                  <MenuItem key={assistant} value={assistant}>
                    {assistant}
                  </MenuItem>
                ))}
              </Select>
              {availableAssistants.length === 0 ? (
                <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                  No active assistants found. Create assistants first to enable project restrictions.
                </Typography>
              ) : formData.allowed_assistants.length === 0 ? (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  No assistants selected - all assistants will be available
                </Typography>
              ) : null}
            </FormControl>

            {editDialogOpen && (
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  />
                }
                label="Active"
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => { setCreateDialogOpen(false); setEditDialogOpen(false); }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={createDialogOpen ? handleCreateProject : handleUpdateProject}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
              }
            }}
          >
            {createDialogOpen ? 'Create' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Stats Dialog */}
      <Dialog open={statsDialogOpen} onClose={() => setStatsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Project Statistics - {selectedProject?.name}</DialogTitle>
        <DialogContent>
          {projectStats && (
            <Grid container spacing={3} sx={{ pt: 2 }}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Sessions</Typography>
                    <Typography variant="h4" color="primary">{projectStats.active_sessions}</Typography>
                    <Typography variant="body2" color="text.secondary">Active Sessions</Typography>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2">Today: {projectStats.sessions_today}</Typography>
                      <Typography variant="body2">Last 30 days: {projectStats.sessions_30d}</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Requests</Typography>
                    <Typography variant="h4" color="secondary">{projectStats.requests_today}</Typography>
                    <Typography variant="body2" color="text.secondary">Today</Typography>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2">Last 30 days: {projectStats.requests_30d}</Typography>
                      <Typography variant="body2">Daily average: {projectStats.avg_daily_requests_30d.toFixed(1)}</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Integration Code Dialog */}
      <Dialog open={codeDialogOpen} onClose={() => setCodeDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Integration Code - {selectedProject?.name}</DialogTitle>
        <DialogContent>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="HTML/JavaScript" />
            <Tab label="React" />
            <Tab label="Vue.js" />
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>HTML Integration</Typography>
            <Box sx={{
              // bgcolor: '#f5f5f5',
              p: 2,
              borderRadius: 1,
              fontFamily: 'monospace',
              position: 'relative'
            }}>
              <IconButton
                sx={{ position: 'absolute', top: 8, right: 8 }}
                onClick={() => copyToClipboard(`<!-- Include AssistantJS SDK -->
<script src="${window.location.origin}/assistantjs.js"></script>

<script>
// Initialize AssistantJS
AssistantJS.init('${selectedProject?.project_id}')
  .then(() => {
    console.log('AssistantJS ready!');
  });

// Send a message
async function askAssistant() {
  try {
    const response = await AssistantJS.send({
      assistantId: '${getExampleAssistantId(selectedProject)}',
      message: 'Hello, I need help!',
      metadata: {
        page: window.location.pathname
      }
    });
    
    console.log('Assistant response:', response.message);
  } catch (error) {
    console.error('Error:', error.message);
  }
}
</script>`)}
              >
                <CopyIcon />
              </IconButton>
              <pre style={{ margin: 0, overflow: 'auto' }}>
                {`<!-- Include AssistantJS SDK -->
<script src="${window.location.origin}/assistantjs.js"></script>

<script>
// Initialize AssistantJS
AssistantJS.init('${selectedProject?.project_id}')
  .then(() => {
    console.log('AssistantJS ready!');
  });

// Send a message
async function askAssistant() {
  try {
    const response = await AssistantJS.send({
      assistantId: '${getExampleAssistantId(selectedProject)}',
      message: 'Hello, I need help!',
      metadata: {
        page: window.location.pathname
      }
    });
    
    console.log('Assistant response:', response.message);
  } catch (error) {
    console.error('Error:', error.message);
  }
}
</script>`}
              </pre>
            </Box>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>React Integration</Typography>
            <Box sx={{
              // bgcolor: '#f5f5f5',
              p: 2,
              borderRadius: 1,
              fontFamily: 'monospace',
              position: 'relative'
            }}>
              <IconButton
                sx={{ position: 'absolute', top: 8, right: 8 }}
                onClick={() => copyToClipboard(`import { useEffect, useState } from 'react';

// Load AssistantJS
const loadAssistantJS = () => {
  return new Promise((resolve) => {
    if (window.AssistantJS) {
      resolve(window.AssistantJS);
      return;
    }
    
    const script = document.createElement('script');
    script.src = '${window.location.origin}/assistantjs.js';
    script.onload = () => resolve(window.AssistantJS);
    document.head.appendChild(script);
  });
};

function MyComponent() {
  const [assistantJS, setAssistantJS] = useState(null);
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');

  useEffect(() => {
    const initAssistant = async () => {
      const sdk = await loadAssistantJS();
      await sdk.init('${selectedProject?.project_id}');
      setAssistantJS(sdk);
    };
    
    initAssistant();
  }, []);

  const sendMessage = async () => {
    if (!assistantJS) return;
    
    try {
      const result = await assistantJS.send({
        assistantId: '${getExampleAssistantId(selectedProject)}',
        message: message,
        metadata: { component: 'MyComponent' }
      });
      
      setResponse(result.message);
    } catch (error) {
      console.error('Error:', error.message);
    }
  };

  return (
    <div>
      <input 
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message..."
      />
      <button onClick={sendMessage}>Send</button>
      {response && <div>Response: {response}</div>}
    </div>
  );
}`)}
              >
                <CopyIcon />
              </IconButton>
              <pre style={{ margin: 0, overflow: 'auto', fontSize: '0.85em' }}>
                {`import { useEffect, useState } from 'react';

// Load AssistantJS
const loadAssistantJS = () => {
  return new Promise((resolve) => {
    if (window.AssistantJS) {
      resolve(window.AssistantJS);
      return;
    }
    
    const script = document.createElement('script');
    script.src = '${window.location.origin}/assistantjs.js';
    script.onload = () => resolve(window.AssistantJS);
    document.head.appendChild(script);
  });
};

function MyComponent() {
  const [assistantJS, setAssistantJS] = useState(null);
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');

  useEffect(() => {
    const initAssistant = async () => {
      const sdk = await loadAssistantJS();
      await sdk.init('${selectedProject?.project_id}');
      setAssistantJS(sdk);
    };
    
    initAssistant();
  }, []);

  const sendMessage = async () => {
    if (!assistantJS) return;
    
    try {
      const result = await assistantJS.send({
        assistantId: '${getExampleAssistantId(selectedProject)}',
        message: message,
        metadata: { component: 'MyComponent' }
      });
      
      setResponse(result.message);
    } catch (error) {
      console.error('Error:', error.message);
    }
  };

  return (
    <div>
      <input 
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message..."
      />
      <button onClick={sendMessage}>Send</button>
      {response && <div>Response: {response}</div>}
    </div>
  );
}`}
              </pre>
            </Box>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Vue.js Integration</Typography>
            <Box sx={{
              // bgcolor: '#f5f5f5',
              p: 2,
              borderRadius: 1,
              fontFamily: 'monospace',
              position: 'relative'
            }}>
              <IconButton
                sx={{ position: 'absolute', top: 8, right: 8 }}
                onClick={() => copyToClipboard(`<template>
  <div>
    <input 
      v-model="message"
      placeholder="Type your message..."
    />
    <button @click="sendMessage">Send</button>
    <div v-if="response">Response: {{ response }}</div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      assistantJS: null,
      message: '',
      response: ''
    };
  },
  
  async mounted() {
    this.assistantJS = await this.loadAssistantJS();
    await this.assistantJS.init('${selectedProject?.project_id}');
  },
  
  methods: {
    loadAssistantJS() {
      return new Promise((resolve) => {
        if (window.AssistantJS) {
          resolve(window.AssistantJS);
          return;
        }
        
        const script = document.createElement('script');
        script.src = '${window.location.origin}/assistantjs.js';
        script.onload = () => resolve(window.AssistantJS);
        document.head.appendChild(script);
      });
    },
    
    async sendMessage() {
      if (!this.assistantJS) return;
      
      try {
        const result = await this.assistantJS.send({
          assistantId: '${getExampleAssistantId(selectedProject)}',
          message: this.message,
          metadata: { component: 'VueComponent' }
        });
        
        this.response = result.message;
      } catch (error) {
        console.error('Error:', error.message);
      }
    }
  }
};
</script>`)}
              >
                <CopyIcon />
              </IconButton>
              <pre style={{ margin: 0, overflow: 'auto', fontSize: '0.85em' }}>
                {`<template>
  <div>
    <input 
      v-model="message"
      placeholder="Type your message..."
    />
    <button @click="sendMessage">Send</button>
    <div v-if="response">Response: {{ response }}</div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      assistantJS: null,
      message: '',
      response: ''
    };
  },
  
  async mounted() {
    this.assistantJS = await this.loadAssistantJS();
    await this.assistantJS.init('${selectedProject?.project_id}');
  },
  
  methods: {
    loadAssistantJS() {
      return new Promise((resolve) => {
        if (window.AssistantJS) {
          resolve(window.AssistantJS);
          return;
        }
        
        const script = document.createElement('script');
        script.src = '${window.location.origin}/assistantjs.js';
        script.onload = () => resolve(window.AssistantJS);
        document.head.appendChild(script);
      });
    },
    
    async sendMessage() {
      if (!this.assistantJS) return;
      
      try {
        const result = await this.assistantJS.send({
          assistantId: '${getExampleAssistantId(selectedProject)}',
          message: this.message,
          metadata: { component: 'VueComponent' }
        });
        
        this.response = result.message;
      } catch (error) {
        console.error('Error:', error.message);
      }
    }
  }
};
</script>`}
              </pre>
            </Box>
          </TabPanel>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCodeDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Project</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the project "{selectedProject?.name}"?
            This will invalidate all existing sessions and cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteProject}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbars */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
      >
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={3000}
        onClose={() => setSuccess('')}
      >
        <Alert severity="success" onClose={() => setSuccess('')}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProjectManagement;