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
      elevation={8}
      sx={{
        mb: { xs: 1.5, sm: 2 },
        p: { xs: 1.5, sm: 2 },
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: 3,
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}
    >
      <FormControl fullWidth variant="outlined" size="medium">
        <InputLabel id="assistant-select-label">Select Assistant</InputLabel>
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
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                border: '1px solid rgba(102, 126, 234, 0.1)',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                '& .MuiMenuItem-root': {
                  borderRadius: 2,
                  mx: 1,
                  my: 0.5,
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                    transform: 'translateX(4px)'
                  },
                  '&.Mui-selected': {
                    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)'
                    }
                  }
                }
              }
            }
          }}
          sx={{
            borderRadius: 3,
            background: 'rgba(255, 255, 255, 0.8)',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(102, 126, 234, 0.3)',
              borderRadius: 3
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(102, 126, 234, 0.5)'
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#667eea',
              boxShadow: '0 0 0 2px rgba(102, 126, 234, 0.2)'
            },
            '& .MuiSelect-icon': {
              color: '#667eea'
            }
          }}
        >
          {assistants.map((assistant) => (
            <MenuItem key={assistant.id} value={assistant.id}>
              <Box>
                <Typography variant="body1" component="div">
                  {assistant.name}
                </Typography>
                {assistant.description && (
                  <Typography variant="body2" color="text.secondary" component="div">
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
            label={`Temperature: ${currentAssistant.temperature}`} 
            size="small" 
            variant="outlined" 
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              fontWeight: 500
            }}
          />
          <Chip 
            label={`Max Tokens: ${currentAssistant.max_tokens}`} 
            size="small" 
            variant="outlined" 
            sx={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              border: 'none',
              fontWeight: 500
            }}
          />
          <Chip 
            label={currentAssistant.document_collection || 'default'} 
            size="small" 
            variant="outlined" 
            sx={{
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: 'white',
              border: 'none',
              fontWeight: 500
            }}
          />
        </Box>
      )}
    </Paper>
  );
};

export default AssistantSelector;