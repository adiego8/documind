import React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  Paper
} from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { setCurrentAssistant } from '../../store/slices/assistantsSlice';

const AssistantSelector = () => {
  const dispatch = useDispatch();
  const { assistants, currentAssistantId } = useSelector((state) => state.assistants);

  const handleAssistantChange = (event) => {
    const assistantId = event.target.value;
    dispatch(setCurrentAssistant(assistantId));
  };

  const currentAssistant = assistants.find(a => a.id === currentAssistantId);

  return (
    <Paper
      elevation={0}
      sx={{
        mb: { xs: 1.5, sm: 2 },
        p: { xs: 1.5, sm: 2 },
        background: 'rgba(17, 24, 39, 0.6)',
        backdropFilter: 'blur(20px)',
        borderRadius: 3,
        border: '1px solid rgba(74, 222, 128, 0.1)',
        boxShadow: '0 0 40px rgba(74, 222, 128, 0.05)',
        transition: 'all 0.3s ease',
        '&:hover': {
          borderColor: 'rgba(74, 222, 128, 0.2)',
          boxShadow: '0 0 50px rgba(74, 222, 128, 0.08)'
        }
      }}
    >
      <FormControl fullWidth variant="outlined" size="medium">
        <InputLabel
          id="assistant-select-label"
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.85rem',
            color: 'rgba(156, 163, 175, 0.7)',
            '&.Mui-focused': {
              color: '#4ade80'
            },
            '&::before': {
              content: '"$ "',
              color: '#4ade80'
            }
          }}
        >
          Select Assistant
        </InputLabel>
        <Select
          labelId="assistant-select-label"
          id="assistant-select"
          value={currentAssistantId || ''}
          onChange={handleAssistantChange}
          label="Select Assistant"
          MenuProps={{
            PaperProps: {
              sx: {
                borderRadius: 3,
                mt: 1,
                boxShadow: '0 0 40px rgba(74, 222, 128, 0.15)',
                border: '1px solid rgba(74, 222, 128, 0.2)',
                background: 'rgba(17, 24, 39, 0.95)',
                backdropFilter: 'blur(20px)',
                '& .MuiMenuItem-root': {
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.85rem',
                  borderRadius: 2,
                  mx: 1,
                  my: 0.5,
                  color: '#ffffff',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    background: 'rgba(74, 222, 128, 0.15)',
                    borderLeft: '2px solid #4ade80',
                    transform: 'translateX(4px)'
                  },
                  '&.Mui-selected': {
                    background: 'rgba(74, 222, 128, 0.2)',
                    borderLeft: '2px solid #4ade80',
                    '&:hover': {
                      background: 'rgba(74, 222, 128, 0.25)'
                    }
                  }
                }
              }
            }
          }}
          sx={{
            borderRadius: 3,
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.9rem',
            background: 'rgba(0, 0, 0, 0.3)',
            color: '#ffffff',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(74, 222, 128, 0.2)',
              borderRadius: 3,
              transition: 'all 0.2s ease'
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(74, 222, 128, 0.4)'
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#4ade80',
              borderWidth: 1
            },
            '& .MuiSelect-icon': {
              color: '#4ade80'
            }
          }}
        >
          {assistants.map((assistant) => (
            <MenuItem key={assistant.id} value={assistant.id}>
              <Box>
                <Typography
                  variant="body1"
                  component="div"
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.9rem',
                    color: '#ffffff',
                    '&::before': {
                      content: '"> "',
                      color: '#4ade80'
                    }
                  }}
                >
                  {assistant.name}
                </Typography>
                {assistant.description && (
                  <Typography
                    variant="body2"
                    component="div"
                    sx={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '0.7rem',
                      color: 'rgba(156, 163, 175, 0.7)',
                      mt: 0.5,
                      '&::before': {
                        content: '"// "',
                        color: '#60a5fa',
                        opacity: 0.6
                      }
                    }}
                  >
                    {assistant.description}
                  </Typography>
                )}
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {currentAssistant && (
        <Box sx={{
          mt: { xs: 1, sm: 2 },
          display: 'flex',
          flexWrap: 'wrap',
          gap: { xs: 0.5, sm: 1 },
          justifyContent: { xs: 'flex-start', sm: 'flex-start' }
        }}>
          <Chip
            label={`temp: ${currentAssistant.temperature}`}
            size="small"
            variant="outlined"
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.7rem',
              background: 'rgba(74, 222, 128, 0.15)',
              color: '#4ade80',
              border: '1px solid rgba(74, 222, 128, 0.3)',
              fontWeight: 500,
              '&::before': {
                content: '"["',
                marginRight: '2px'
              },
              '&::after': {
                content: '"]"',
                marginLeft: '2px'
              }
            }}
          />
          <Chip
            label={`tokens: ${currentAssistant.max_tokens}`}
            size="small"
            variant="outlined"
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.7rem',
              background: 'rgba(96, 165, 250, 0.15)',
              color: '#60a5fa',
              border: '1px solid rgba(96, 165, 250, 0.3)',
              fontWeight: 500,
              '&::before': {
                content: '"["',
                marginRight: '2px'
              },
              '&::after': {
                content: '"]"',
                marginLeft: '2px'
              }
            }}
          />
          <Chip
            label={currentAssistant.document_collection || 'default'}
            size="small"
            variant="outlined"
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.7rem',
              background: 'rgba(156, 163, 175, 0.15)',
              color: 'rgba(156, 163, 175, 0.9)',
              border: '1px solid rgba(156, 163, 175, 0.3)',
              fontWeight: 500,
              '&::before': {
                content: '"["',
                marginRight: '2px'
              },
              '&::after': {
                content: '"]"',
                marginLeft: '2px'
              }
            }}
          />
        </Box>
      )}
    </Paper>
  );
};

export default AssistantSelector;