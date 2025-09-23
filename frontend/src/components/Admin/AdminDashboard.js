import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  TextField,
  Button,
  Card,
  CardContent,
  Grid,
  Alert,
  LinearProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Upload as UploadIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Description as FileIcon,
  Chat as ChatIcon,
  SmartToy as BotIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  getAssistantConfig,
  updateAssistantConfig,
  uploadDocuments,
  getDocumentStats,
  clearDocuments,
} from '../../store/slices/assistantSlice';
import AssistantManagement from './AssistantManagement';
import AdminCodeManagement from './AdminCodeManagement';
import ConversationMonitoring from './ConversationMonitoring';
import UserManagement from './UserManagement';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const AdminDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { config, stats, isLoading, isUploading, error } = useSelector((state) => state.assistant);
  
  const [tabValue, setTabValue] = useState(0);
  const [configForm, setConfigForm] = useState(config);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  useEffect(() => {
    dispatch(getAssistantConfig());
    dispatch(getDocumentStats());
  }, [dispatch]);

  useEffect(() => {
    setConfigForm(config);
  }, [config]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleConfigChange = (field) => (e) => {
    const value = field === 'temperature' || field === 'max_tokens' 
      ? parseFloat(e.target.value) 
      : e.target.value;
    
    setConfigForm({
      ...configForm,
      [field]: value,
    });
  };

  const handleSaveConfig = () => {
    dispatch(updateAssistantConfig(configForm));
  };

  const handleFileSelect = (e) => {
    setSelectedFiles(Array.from(e.target.files));
  };

  const handleUpload = () => {
    if (selectedFiles.length === 0) return;

    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append('files', file);
    });

    dispatch(uploadDocuments(formData)).then(() => {
      setSelectedFiles([]);
      dispatch(getDocumentStats());
    });
  };

  const handleClearDocuments = () => {
    dispatch(clearDocuments()).then(() => {
      dispatch(getDocumentStats());
      setClearDialogOpen(false);
    });
  };

  const removeFile = (index) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  return (
    <Box sx={{ width: '100%', p: { xs: 1, sm: 2 } }}>
      {/* Header */}
      <Paper elevation={1} sx={{ p: { xs: 2, sm: 3 }, mb: 2 }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 2, sm: 0 }
        }}>
          <Typography 
            variant="h4"
            component="h1"
            sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}
          >
            Admin Dashboard
          </Typography>
          <Button
            variant="outlined"
            startIcon={<ChatIcon />}
            onClick={() => navigate('/chat')}
            size="medium"
            sx={{ alignSelf: { xs: 'flex-start', sm: 'auto' } }}
          >
            Go to Chat
          </Button>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Paper elevation={1}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            '& .MuiTab-root': {
              fontSize: { xs: '0.875rem', sm: '0.875rem' },
              minWidth: { xs: 'auto', sm: 120 },
              px: { xs: 1, sm: 2 }
            }
          }}
        >
          <Tab label="Assistants" />
          <Tab label="Registration Codes" />
          <Tab label="Conversations" />
          <Tab label="Users" />
          <Tab label="Statistics" />
        </Tabs>

        {/* Assistants Management Tab */}
        <TabPanel value={tabValue} index={0}>
          <AssistantManagement />
        </TabPanel>

        {/* Registration Codes Tab */}
        <TabPanel value={tabValue} index={1}>
          <AdminCodeManagement />
        </TabPanel>

        {/* Conversations Tab */}
        <TabPanel value={tabValue} index={2}>
          <ConversationMonitoring />
        </TabPanel>

        {/* Users Tab */}
        <TabPanel value={tabValue} index={3}>
          <UserManagement />
        </TabPanel>

        {/* Statistics Tab */}
        <TabPanel value={tabValue} index={4}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Document Statistics
                  </Typography>
                  <Typography variant="h4" color="primary">
                    {stats.document_count}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Documents
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Collection Info
                  </Typography>
                  <Typography variant="body1">
                    Collection: {stats.collection_name || 'Default'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

      </Paper>

      {/* Clear Documents Dialog */}
      <Dialog
        open={clearDialogOpen}
        onClose={() => setClearDialogOpen(false)}
      >
        <DialogTitle>Clear All Documents</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to clear all documents from the database? 
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleClearDocuments}
            color="error"
            variant="contained"
          >
            Clear All
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDashboard;