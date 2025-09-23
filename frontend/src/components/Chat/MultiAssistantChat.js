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
  Chip,
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
  
  const { user } = useSelector((state) => state.auth);

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
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
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
        sx={{ 
          flex: 1, 
          p: 2, 
          mb: 2, 
          maxHeight: '60vh', 
          overflow: 'auto',
          backgroundColor: '#f5f5f5'
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
                    maxWidth: '70%', 
                    backgroundColor: '#1976d2', 
                    color: 'white',
                    p: 2, 
                    borderRadius: '18px 18px 4px 18px'
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
                    maxWidth: '70%', 
                    backgroundColor: 'white',
                    p: 2, 
                    borderRadius: '18px 18px 18px 4px',
                    boxShadow: 1
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
              maxWidth: '70%', 
              backgroundColor: 'white',
              p: 2, 
              borderRadius: '18px 18px 18px 4px',
              boxShadow: 1,
              display: 'flex',
              alignItems: 'center'
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
      <Box sx={{ display: 'flex', gap: 1 }}>
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
        />
        <Button
          variant="contained"
          onClick={handleSendMessage}
          disabled={!message.trim() || !currentAssistantId || isQuerying}
          sx={{ minWidth: 56 }}
        >
          {isQuerying ? <CircularProgress size={24} /> : <SendIcon />}
        </Button>
      </Box>
    </Box>
  );
};

export default MultiAssistantChat;