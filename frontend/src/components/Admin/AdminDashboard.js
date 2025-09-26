import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Chat as ChatIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  getAssistantConfig,
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
  const { error } = useSelector((state) => state.assistant);
  
  const [tabValue, setTabValue] = useState(0);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  useEffect(() => {
    dispatch(getAssistantConfig());
    dispatch(getDocumentStats());
  }, [dispatch]);


  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };





  const handleClearDocuments = () => {
    dispatch(clearDocuments()).then(() => {
      dispatch(getDocumentStats());
      setClearDialogOpen(false);
    });
  };


  return (
    <Box sx={{ 
      width: '100%', 
      p: { xs: 1, sm: 2 },
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <Paper 
        elevation={8} 
        sx={{ 
          p: { xs: 2, sm: 3 }, 
          mb: 2,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}
      >
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
            variant="contained"
            startIcon={<ChatIcon />}
            onClick={() => navigate('/chat')}
            size="medium"
            sx={{ 
              alignSelf: { xs: 'flex-start', sm: 'auto' },
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: 2,
              px: 3,
              py: 1,
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                boxShadow: '0 6px 20px rgba(102, 126, 234, 0.6)',
                transform: 'translateY(-1px)'
              },
              transition: 'all 0.2s ease-in-out'
            }}
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
      <Paper 
        elevation={8}
        sx={{
          borderRadius: 3,
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          overflow: 'hidden'
        }}
      >
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
              px: { xs: 1, sm: 2 },
              fontWeight: 600,
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                background: 'rgba(102, 126, 234, 0.08)',
                transform: 'translateY(-1px)'
              },
              '&.Mui-selected': {
                background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                color: '#667eea'
              }
            },
            '& .MuiTabs-indicator': {
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              height: 3,
              borderRadius: '3px 3px 0 0'
            },
            '& .MuiTabs-scrollButtons': {
              display: { xs: 'flex', md: 'none' },
              '&.Mui-disabled': {
                opacity: 0.3
              }
            },
            '& .MuiTabScrollButton-root': {
              width: 40,
              color: '#667eea',
              '&:hover': {
                background: 'rgba(102, 126, 234, 0.08)'
              }
            }
          }}
        >
          <Tab label="Assistants" />
          <Tab label="Registration Codes" />
          <Tab label="Conversations" />
          <Tab label="Users" />
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
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button 
            onClick={() => setClearDialogOpen(false)}
            sx={{
              borderRadius: 2,
              px: 3,
              py: 1,
              color: '#667eea',
              border: '1px solid rgba(102, 126, 234, 0.3)',
              '&:hover': {
                background: 'rgba(102, 126, 234, 0.08)',
                border: '1px solid rgba(102, 126, 234, 0.5)',
                transform: 'translateY(-1px)'
              },
              transition: 'all 0.2s ease-in-out'
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleClearDocuments}
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              borderRadius: 2,
              px: 4,
              py: 1.2,
              fontSize: '1rem',
              fontWeight: 600,
              boxShadow: '0 4px 15px rgba(245, 87, 108, 0.4)',
              textTransform: 'none',
              '&:hover': {
                background: 'linear-gradient(135deg, #e078f0 0%, #e73c5e 100%)',
                boxShadow: '0 6px 20px rgba(245, 87, 108, 0.6)',
                transform: 'translateY(-1px) scale(1.02)'
              },
              '&:active': {
                transform: 'translateY(0px) scale(0.98)'
              },
              transition: 'all 0.2s ease-in-out'
            }}
          >
            Clear All
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDashboard;