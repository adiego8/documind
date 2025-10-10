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
      minHeight: '100vh',
      background: '#000000'
    }}>
      {/* Assistant Selector */}
      <AssistantSelector />

      {error && (
        <Alert
          severity="error"
          onClose={() => dispatch(clearError())}
          sx={{
            mb: 2,
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.75rem',
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#fca5a5',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            '& .MuiAlert-icon': {
              color: '#ef4444',
            }
          }}
        >
          {error}
        </Alert>
      )}

      {/* Chat Messages */}
      <Paper
        sx={{
          flex: 1,
          p: { xs: 1, sm: 2 },
          mb: 2,
          maxHeight: { xs: '50vh', sm: '60vh' },
          overflow: 'auto',
          background: 'rgba(17, 24, 39, 0.4)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(74, 222, 128, 0.1)',
          borderRadius: 3,
          boxShadow: '0 0 40px rgba(74, 222, 128, 0.05)',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: 4,
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(74, 222, 128, 0.3)',
            borderRadius: 4,
            '&:hover': {
              background: 'rgba(74, 222, 128, 0.5)',
            }
          }
        }}
      >
        {currentHistory.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography
              variant="h6"
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                color: 'rgba(156, 163, 175, 0.7)',
                fontSize: '1rem',
                '&::before': {
                  content: '"> "',
                  color: '#4ade80',
                }
              }}
            >
              {currentAssistant ? `Start a conversation with ${currentAssistant.name}` : 'Select an assistant to start chatting'}
            </Typography>
            {currentAssistant?.description && (
              <Typography
                variant="body2"
                sx={{
                  mt: 2,
                  fontFamily: '"JetBrains Mono", monospace',
                  color: 'rgba(156, 163, 175, 0.5)',
                  fontSize: '0.8rem',
                  '&::before': {
                    content: '"// "',
                    color: '#60a5fa',
                    opacity: 0.6,
                  }
                }}
              >
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
                    background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.15) 0%, rgba(74, 222, 128, 0.1) 100%)',
                    border: '1px solid rgba(74, 222, 128, 0.3)',
                    color: '#ffffff',
                    p: { xs: 1.5, sm: 2 },
                    borderRadius: '16px 16px 4px 16px',
                    boxShadow: '0 0 20px rgba(74, 222, 128, 0.1)',
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
                      <PersonIcon sx={{ mr: 1, fontSize: 16, color: '#4ade80' }} />
                      <Typography
                        variant="caption"
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '0.7rem',
                          color: 'rgba(156, 163, 175, 0.8)'
                        }}
                      >
                        {query.username || 'Unknown User'} • {formatTimestamp(query.timestamp)}
                      </Typography>
                    </Box>
                    <Typography
                      variant="body1"
                      sx={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '0.9rem',
                        color: '#ffffff',
                        lineHeight: 1.6
                      }}
                    >
                      {query.question}
                    </Typography>
                  </Box>
                </Box>

                {/* Assistant Response */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <Box sx={{
                    maxWidth: { xs: '85%', sm: '70%' },
                    background: 'rgba(17, 24, 39, 0.6)',
                    backdropFilter: 'blur(10px)',
                    p: { xs: 1.5, sm: 2 },
                    borderRadius: '16px 16px 16px 4px',
                    boxShadow: '0 0 20px rgba(96, 165, 250, 0.1)',
                    border: '1px solid rgba(96, 165, 250, 0.3)',
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
                      <BotIcon sx={{ mr: 1, fontSize: 16, color: '#60a5fa' }} />
                      <Typography
                        variant="caption"
                        sx={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '0.7rem',
                          color: 'rgba(96, 165, 250, 0.9)'
                        }}
                      >
                        {currentAssistant?.name || 'Assistant'}
                      </Typography>
                    </Box>
                    <Typography
                      variant="body1"
                      sx={{
                        whiteSpace: 'pre-wrap',
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '0.9rem',
                        color: '#ffffff',
                        lineHeight: 1.6
                      }}
                    >
                      {query.answer}
                    </Typography>

                    {/* Sources */}
                    {query.sources && query.sources.length > 0 && (
                      <Accordion
                        sx={{
                          mt: 2,
                          boxShadow: 'none',
                          background: 'rgba(0, 0, 0, 0.3)',
                          border: '1px solid rgba(96, 165, 250, 0.2)',
                          borderRadius: 2,
                          '&:before': {
                            display: 'none'
                          }
                        }}
                      >
                        <AccordionSummary
                          expandIcon={<ExpandMoreIcon sx={{ color: '#60a5fa' }} />}
                          sx={{
                            '& .MuiAccordionSummary-content': {
                              margin: '8px 0'
                            }
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              fontFamily: '"JetBrains Mono", monospace',
                              fontSize: '0.75rem',
                              color: '#60a5fa',
                              '&::before': {
                                content: '"// "',
                                opacity: 0.6
                              }
                            }}
                          >
                            Sources ({query.sources.length})
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ pt: 0 }}>
                          <Box>
                            {query.sources.map((source, idx) => (
                              <Box key={idx} sx={{ mb: 2 }}>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontFamily: '"JetBrains Mono", monospace',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    color: '#4ade80',
                                    '&::before': {
                                      content: '"> "',
                                      color: '#4ade80'
                                    }
                                  }}
                                >
                                  Source {idx + 1}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontFamily: '"JetBrains Mono", monospace',
                                    fontSize: '0.7rem',
                                    color: 'rgba(156, 163, 175, 0.7)',
                                    display: 'block',
                                    mt: 0.5
                                  }}
                                >
                                  {source.source} • Similarity: {(source.similarity_score * 100).toFixed(1)}%
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    mt: 1,
                                    fontFamily: '"JetBrains Mono", monospace',
                                    fontSize: '0.75rem',
                                    color: 'rgba(255, 255, 255, 0.8)',
                                    lineHeight: 1.5
                                  }}
                                >
                                  {source.content_preview}
                                </Typography>
                                {idx < query.sources.length - 1 && (
                                  <Divider sx={{ mt: 1, borderColor: 'rgba(96, 165, 250, 0.1)' }} />
                                )}
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
              background: 'rgba(17, 24, 39, 0.6)',
              backdropFilter: 'blur(10px)',
              p: { xs: 1.5, sm: 2 },
              borderRadius: '16px 16px 16px 4px',
              boxShadow: '0 0 20px rgba(96, 165, 250, 0.1)',
              border: '1px solid rgba(96, 165, 250, 0.3)',
              display: 'flex',
              alignItems: 'center',
              animation: 'pulse 1.5s ease-in-out infinite',
              '@keyframes pulse': {
                '0%, 100%': {
                  opacity: 0.6
                },
                '50%': {
                  opacity: 1
                }
              }
            }}>
              <CircularProgress size={16} sx={{ mr: 1, color: '#60a5fa' }} />
              <Typography
                variant="body2"
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.85rem',
                  color: 'rgba(96, 165, 250, 0.9)',
                  '&::after': {
                    content: '"..."',
                    animation: 'dots 1.5s steps(4, end) infinite'
                  },
                  '@keyframes dots': {
                    '0%, 20%': { content: '"."' },
                    '40%': { content: '".."' },
                    '60%, 100%': { content: '"..."' }
                  }
                }}
              >
                {currentAssistant?.name || 'Assistant'} is thinking
              </Typography>
            </Box>
          </Box>
        )}

        <div ref={messagesEndRef} />
      </Paper>

      {/* Message Input */}
      <Paper
        sx={{
          p: { xs: 1, sm: 1.5 },
          background: 'rgba(17, 24, 39, 0.6)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(74, 222, 128, 0.1)',
          borderRadius: 3,
          boxShadow: '0 0 20px rgba(74, 222, 128, 0.05)'
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
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: { xs: '0.85rem', sm: '0.9rem' },
              borderRadius: 2,
              background: 'rgba(0, 0, 0, 0.3)',
              color: '#ffffff',
              '& fieldset': {
                borderColor: 'rgba(74, 222, 128, 0.2)',
                transition: 'all 0.2s ease',
              },
              '&:hover fieldset': {
                borderColor: 'rgba(74, 222, 128, 0.4)',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#4ade80',
                borderWidth: 1,
              },
              '&.Mui-disabled': {
                background: 'rgba(0, 0, 0, 0.2)',
                '& fieldset': {
                  borderColor: 'rgba(156, 163, 175, 0.1)'
                }
              }
            },
            '& .MuiInputBase-input::placeholder': {
              color: 'rgba(156, 163, 175, 0.5)',
              opacity: 1
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
              background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.15) 0%, rgba(96, 165, 250, 0.15) 100%)',
              border: '1px solid rgba(74, 222, 128, 0.3)',
              color: '#4ade80',
              fontFamily: '"JetBrains Mono", monospace',
              borderRadius: 2,
              boxShadow: '0 0 15px rgba(74, 222, 128, 0.1)',
              transition: 'all 0.2s ease',
              '&:hover': {
                background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.25) 0%, rgba(96, 165, 250, 0.25) 100%)',
                borderColor: 'rgba(74, 222, 128, 0.5)',
                boxShadow: '0 0 25px rgba(74, 222, 128, 0.2)',
                transform: 'translateY(-1px)'
              },
              '&:disabled': {
                background: 'rgba(17, 24, 39, 0.5)',
                border: '1px solid rgba(156, 163, 175, 0.1)',
                color: 'rgba(156, 163, 175, 0.3)'
              }
            }}
          >
          {isQuerying ? <CircularProgress size={24} sx={{ color: '#4ade80' }} /> : <SendIcon />}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default MultiAssistantChat;