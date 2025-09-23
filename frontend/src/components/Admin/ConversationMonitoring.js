import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Chip,
  Alert,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Chat as ChatIcon,
  Person as PersonIcon,
  SmartToy as BotIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { 
  getAdminConversations, 
  getConversationMessages, 
  clearError,
  clearConversationMessages 
} from '../../store/slices/adminSlice';
import { getAssistants } from '../../store/slices/assistantsSlice';

// Helper function to format errors consistently
const formatError = (error) => {
  if (error && typeof error === 'object') {
    if (Array.isArray(error)) {
      return error.map(err => err.msg || err).join(', ');
    }
    if (error.msg) return error.msg;
    if (error.detail) return error.detail;
    if (error.message) return error.message;
    return 'An error occurred';
  }
  return error || 'An error occurred';
};

const ConversationMonitoring = () => {
  const dispatch = useDispatch();
  const { conversations, conversationMessages, isLoading, error } = useSelector((state) => state.admin);
  const { assistants } = useSelector((state) => state.assistants);

  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messagesDialogOpen, setMessagesDialogOpen] = useState(false);
  
  // Filter state
  const [filters, setFilters] = useState({
    username: '',
    assistant_id: '',
    limit: 100
  });

  useEffect(() => {
    dispatch(getAdminConversations(filters));
    dispatch(getAssistants());
  }, [dispatch]);

  // Apply filters when filters change
  useEffect(() => {
    const filterParams = {};
    if (filters.username.trim()) filterParams.username = filters.username.trim();
    if (filters.assistant_id) filterParams.assistant_id = filters.assistant_id;
    filterParams.limit = filters.limit;

    dispatch(getAdminConversations(filterParams));
  }, [filters, dispatch]);

  const handleViewMessages = async (conversation) => {
    setSelectedConversation(conversation);
    await dispatch(getConversationMessages(conversation.id));
    setMessagesDialogOpen(true);
  };

  const handleCloseMessages = () => {
    setMessagesDialogOpen(false);
    setSelectedConversation(null);
    if (selectedConversation) {
      dispatch(clearConversationMessages(selectedConversation.id));
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const handleFilterChange = (field) => (event) => {
    setFilters(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      username: '',
      assistant_id: '',
      limit: 100
    });
  };

  const handleRefresh = () => {
    const filterParams = {};
    if (filters.username.trim()) filterParams.username = filters.username.trim();
    if (filters.assistant_id) filterParams.assistant_id = filters.assistant_id;
    filterParams.limit = filters.limit;
    dispatch(getAdminConversations(filterParams));
  };

  const currentMessages = selectedConversation 
    ? conversationMessages[selectedConversation.id] || []
    : [];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          User Conversations
        </Typography>
        <Button
          variant="outlined"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert 
          severity="error" 
          onClose={() => dispatch(clearError())}
          sx={{ mb: 3 }}
        >
          {formatError(error)}
        </Alert>
      )}

      {/* Filter Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <FilterIcon sx={{ mr: 1 }} />
          <Typography variant="h6">Filters</Typography>
        </Box>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              fullWidth
              label="Username"
              value={filters.username}
              onChange={handleFilterChange('username')}
              placeholder="Search by username..."
              size="small"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Assistant</InputLabel>
              <Select
                value={filters.assistant_id}
                label="Assistant"
                onChange={handleFilterChange('assistant_id')}
              >
                <MenuItem value="">All Assistants</MenuItem>
                {assistants.map((assistant) => (
                  <MenuItem key={assistant.id} value={assistant.id}>
                    {assistant.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <TextField
              fullWidth
              label="Limit"
              type="number"
              value={filters.limit}
              onChange={handleFilterChange('limit')}
              inputProps={{ min: 10, max: 1000 }}
              size="small"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }} sx={{ display: 'flex', alignItems: 'center' }}>
            <Button
              variant="outlined"
              startIcon={<ClearIcon />}
              onClick={handleClearFilters}
              sx={{ 
                height: 40, // Match the height of TextField small
                minWidth: 120,
                ml: 'auto' // Push to the right side of the grid
              }}
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        {conversations.map((conversation) => (
          <Grid size={{ xs: 12, md: 6, lg: 4 }} key={conversation.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                    <PersonIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" component="h3">
                      {conversation.username}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      User ID: {conversation.user_id}
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <BotIcon sx={{ mr: 1, color: 'primary.main', fontSize: 16 }} />
                  <Typography variant="body2">
                    <strong>Assistant:</strong> {conversation.assistant_name}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  <Chip 
                    label={`${conversation.message_count} messages`} 
                    size="small" 
                    variant="outlined" 
                  />
                  <Chip 
                    label={`ID: ${conversation.id}`} 
                    size="small" 
                    variant="outlined" 
                  />
                </Box>

                <Typography variant="caption" color="text.secondary">
                  <strong>Started:</strong> {formatDate(conversation.created_at)}
                </Typography>
                <br />
                <Typography variant="caption" color="text.secondary">
                  <strong>Last activity:</strong> {formatTimestamp(conversation.last_message_at)}
                </Typography>
              </CardContent>

              <CardActions>
                <Button
                  size="small"
                  startIcon={<ViewIcon />}
                  onClick={() => handleViewMessages(conversation)}
                  variant="outlined"
                >
                  View Messages
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {conversations.length === 0 && !isLoading && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <ChatIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No conversations yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Conversations from your users will appear here
          </Typography>
        </Box>
      )}

      {/* Messages Dialog */}
      <Dialog
        open={messagesDialogOpen}
        onClose={handleCloseMessages}
        maxWidth="md"
        fullWidth
        sx={{ '& .MuiDialog-paper': { height: '80vh' } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6">
              Conversation: {selectedConversation?.username} ↔ {selectedConversation?.assistant_name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {selectedConversation && formatTimestamp(selectedConversation.created_at)}
            </Typography>
          </Box>
          <IconButton onClick={handleCloseMessages}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ height: '100%', overflow: 'auto', p: 2 }}>
            {currentMessages.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  Loading messages...
                </Typography>
              </Box>
            ) : (
              <Box>
                {currentMessages.map((message, index) => (
                  <Box key={message.id} sx={{ mb: 3 }}>
                    {message.role === 'user' ? (
                      // User Message
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                        <Paper sx={{ 
                          maxWidth: '70%', 
                          backgroundColor: '#1976d2', 
                          color: 'white',
                          p: 2, 
                          borderRadius: '18px 18px 4px 18px'
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <PersonIcon sx={{ mr: 1, fontSize: 16 }} />
                            <Typography variant="caption">
                              {message.sender_name || message.username} • {formatTimestamp(message.created_at)}
                            </Typography>
                          </Box>
                          <Typography variant="body1">{message.content}</Typography>
                        </Paper>
                      </Box>
                    ) : (
                      // Assistant Message
                      <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                        <Paper sx={{ 
                          maxWidth: '70%', 
                          backgroundColor: 'white',
                          p: 2, 
                          borderRadius: '18px 18px 18px 4px',
                          boxShadow: 1
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <BotIcon sx={{ mr: 1, fontSize: 16, color: '#1976d2' }} />
                            <Typography variant="caption">
                              {message.assistant_name} • {formatTimestamp(message.created_at)}
                            </Typography>
                          </Box>
                          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                            {message.content}
                          </Typography>

                          {/* Sources */}
                          {message.metadata?.sources && message.metadata.sources.length > 0 && (
                            <Accordion sx={{ mt: 2, boxShadow: 'none' }}>
                              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography variant="caption">
                                  Sources ({message.metadata.sources.length})
                                </Typography>
                              </AccordionSummary>
                              <AccordionDetails>
                                {message.metadata.sources.map((source, sourceIndex) => (
                                  <Box key={sourceIndex} sx={{ mb: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                                    <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                                      {source.source}
                                    </Typography>
                                    <Typography variant="caption" display="block">
                                      Similarity: {(source.similarity_score * 100).toFixed(1)}%
                                    </Typography>
                                    <Typography variant="caption" sx={{ fontStyle: 'italic' }}>
                                      {source.content_preview}
                                    </Typography>
                                  </Box>
                                ))}
                              </AccordionDetails>
                            </Accordion>
                          )}
                        </Paper>
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseMessages}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ConversationMonitoring;