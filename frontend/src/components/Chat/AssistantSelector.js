import React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip
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
    <Box sx={{ mb: 2 }}>
      <FormControl fullWidth variant="outlined">
        <InputLabel id="assistant-select-label">Select Assistant</InputLabel>
        <Select
          labelId="assistant-select-label"
          id="assistant-select"
          value={currentAssistantId || ''}
          onChange={handleAssistantChange}
          label="Select Assistant"
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
        <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Chip 
            label={`Temperature: ${currentAssistant.temperature}`} 
            size="small" 
            variant="outlined" 
          />
          <Chip 
            label={`Max Tokens: ${currentAssistant.max_tokens}`} 
            size="small" 
            variant="outlined" 
          />
          <Chip 
            label={currentAssistant.document_collection || 'default'} 
            size="small" 
            variant="outlined" 
          />
        </Box>
      )}
    </Box>
  );
};

export default AssistantSelector;