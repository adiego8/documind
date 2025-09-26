import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Send as SendIcon,
  ExpandMore as ExpandMoreIcon,
  Person as PersonIcon,
  SmartToy as BotIcon,
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { 
  getAssistants, 
  queryAssistant, 
  getAssistantHistory,
  clearError 
} from '../../store/slices/assistantsSlice';
import AssistantSelector from './AssistantSelector';

const MultiAssistantChat = () => {
  const dispatch = useDispatch();
  const { 
    assistants, 
    currentAssistantId, 
    queryHistory, 
    isQuerying, 
    error 
  } = useSelector((state) => state.assistants);
  

  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);

  const currentHistory = queryHistory[currentAssistantId] || [];

  useEffect(() => {
    // Load assistants on component mount
    dispatch(getAssistants());
  }, [dispatch]);

  useEffect(() => {
    // Always load fresh history when assistant changes
    if (currentAssistantId) {
      dispatch(getAssistantHistory({ assistantId: currentAssistantId }));
    }
  }, [currentAssistantId, dispatch]);

  useEffect(() => {
    // Auto-scroll to bottom when messages change or assistant changes
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentHistory.length, currentAssistantId]);

  const handleSendMessage = async () => {
    if (!message.trim() || !currentAssistantId || isQuerying) return;

    const userMessage = message.trim();
    setMessage('');

    try {
      await dispatch(queryAssistant({
        assistantId: currentAssistantId,
        question: userMessage
      })).unwrap();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const currentAssistant = assistants.find(a => a.id === currentAssistantId);

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: { xs: 'calc(100vh - 56px)', sm: '100%' },
      p: { xs: 1, sm: 2 },
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh'
    }}>
      {/* Assistant Selector */}
      <AssistantSelector />

      {error && (
        <Alert 
          severity="error" 
          onClose={() => dispatch(clearError())}
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}

      {/* Chat Messages */}
      <Paper 
        elevation={8}
        sx={{ 
          flex: 1, 
          p: { xs: 1, sm: 2 }, 
          mb: 2, 
          maxHeight: { xs: '50vh', sm: '60vh' }, 
          overflow: 'auto',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: 3,
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}
      >
        {currentHistory.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary">
              {currentAssistant ? `Start a conversation with ${currentAssistant.name}` : 'Select an assistant to start chatting'}
            </Typography>
            {currentAssistant?.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {currentAssistant.description}
              </Typography>
            )}
          </Box>
        ) : (
          <Box>
            {[...currentHistory].reverse().map((query) => (
              <Box key={query.id} sx={{ mb: 3 }}>
                {/* User Message */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                  <Box sx={{ 
                    maxWidth: { xs: '85%', sm: '70%' }, 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    p: { xs: 1.5, sm: 2 }, 
                    borderRadius: '20px 20px 6px 20px',
                    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                    position: 'relative',
                    animation: 'slideInRight 0.3s ease-out',
                    '@keyframes slideInRight': {
                      '0%': {
                        opacity: 0,
                        transform: 'translateX(20px)'
                      },
                      '100%': {
                        opacity: 1,
                        transform: 'translateX(0)'
                      }
                    }
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <PersonIcon sx={{ mr: 1, fontSize: 16 }} />
                      <Typography variant="caption">
                        {query.username || 'Unknown User'} • {formatTimestamp(query.timestamp)}
                      </Typography>
                    </Box>
                    <Typography variant="body1">{query.question}</Typography>
                  </Box>
                </Box>

                {/* Assistant Response */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <Box sx={{ 
                    maxWidth: { xs: '85%', sm: '70%' }, 
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                    p: { xs: 1.5, sm: 2 }, 
                    borderRadius: '20px 20px 20px 6px',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                    border: '1px solid rgba(102, 126, 234, 0.1)',
                    position: 'relative',
                    animation: 'slideInLeft 0.3s ease-out',
                    '@keyframes slideInLeft': {
                      '0%': {
                        opacity: 0,
                        transform: 'translateX(-20px)'
                      },
                      '100%': {
                        opacity: 1,
                        transform: 'translateX(0)'
                      }
                    }
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <BotIcon sx={{ mr: 1, fontSize: 16, color: '#1976d2' }} />
                      <Typography variant="caption">
                        {currentAssistant?.name || 'Assistant'}
                      </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                      {query.answer}
                    </Typography>

                    {/* Sources */}
                    {query.sources && query.sources.length > 0 && (
                      <Accordion sx={{ mt: 2, boxShadow: 'none' }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography variant="caption">
                            Sources ({query.sources.length})
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Box>
                            {query.sources.map((source, idx) => (
                              <Box key={idx} sx={{ mb: 2 }}>
                                <Typography variant="body2" fontWeight="bold">
                                  Source {idx + 1}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {source.source} • Similarity: {(source.similarity_score * 100).toFixed(1)}%
                                </Typography>
                                <Typography variant="body2" sx={{ mt: 1 }}>
                                  {source.content_preview}
                                </Typography>
                                {idx < query.sources.length - 1 && <Divider sx={{ mt: 1 }} />}
                              </Box>
                            ))}
                          </Box>
                        </AccordionDetails>
                      </Accordion>
                    )}
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        )}

        {/* Loading indicator */}
        {isQuerying && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
            <Box sx={{ 
              maxWidth: { xs: '85%', sm: '70%' }, 
              background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
              p: { xs: 1.5, sm: 2 }, 
              borderRadius: '20px 20px 20px 6px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(102, 126, 234, 0.1)',
              display: 'flex',
              alignItems: 'center',
              animation: 'pulse 1.5s ease-in-out infinite',
              '@keyframes pulse': {
                '0%, 100%': {
                  opacity: 0.8
                },
                '50%': {
                  opacity: 1
                }
              }
            }}>
              <CircularProgress size={16} sx={{ mr: 1 }} />
              <Typography variant="body2" color="text.secondary">
                {currentAssistant?.name || 'Assistant'} is thinking...
              </Typography>
            </Box>
          </Box>
        )}

        <div ref={messagesEndRef} />
      </Paper>

      {/* Message Input */}
      <Paper
        elevation={8}
        sx={{
          p: { xs: 1, sm: 1.5 },
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: 3,
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          gap: { xs: 0.5, sm: 1 },
          flexDirection: { xs: 'row' }
        }}>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={currentAssistant ? `Ask ${currentAssistant.name} a question...` : 'Select an assistant first...'}
          disabled={!currentAssistantId || isQuerying}
          variant="outlined"
          sx={{
            '& .MuiOutlinedInput-root': {
              fontSize: { xs: '0.875rem', sm: '1rem' },
              borderRadius: 2,
              background: 'rgba(255, 255, 255, 0.8)',
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.9)'
              },
              '&.Mui-focused': {
                background: 'rgba(255, 255, 255, 1)',
                boxShadow: '0 0 0 2px rgba(102, 126, 234, 0.2)'
              }
            }
          }}
        />
          <Button
            variant="contained"
            onClick={handleSendMessage}
            disabled={!message.trim() || !currentAssistantId || isQuerying}
            sx={{ 
              minWidth: { xs: 48, sm: 56 },
              px: { xs: 1, sm: 2 },
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: 2,
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                boxShadow: '0 6px 20px rgba(102, 126, 234, 0.6)',
                transform: 'translateY(-1px)'
              },
              '&:disabled': {
                background: 'rgba(0, 0, 0, 0.12)'
              },
              transition: 'all 0.2s ease-in-out'
            }}
          >
          {isQuerying ? <CircularProgress size={24} /> : <SendIcon />}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default MultiAssistantChat;