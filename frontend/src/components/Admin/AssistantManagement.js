import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  Alert,
  Fab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  SmartToy as BotIcon,
  Upload as UploadIcon,
  Description as FileIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { 
  getAssistants, 
  createAssistant, 
  updateAssistant, 
  deleteAssistant,
  clearError,
  uploadDocumentsToAssistant,
  getAssistantDocumentStats,
  clearAssistantDocuments,
  getAssistantDocuments,
  deleteAssistantDocument
} from '../../store/slices/assistantsSlice';
import axios from 'axios';
import config from '../../config/config';

const API_BASE_URL = config.apiBaseUrl;

const AssistantManagement = () => {
  const dispatch = useDispatch();
  const { assistants, isLoading, error, documentStats, documents, isUploading, isDeletingDocument } = useSelector((state) => state.assistants);
  const { token } = useSelector((state) => state.auth);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAssistant, setEditingAssistant] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState({});
  const [expandedDocuments, setExpandedDocuments] = useState({});
  const [llmConfigurations, setLlmConfigurations] = useState({});
  const [defaultConfig, setDefaultConfig] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    initial_context: '',
    temperature: '',
    max_tokens: '',
    document_collection: 'default',
    llm_preset: 'custom'
  });

  useEffect(() => {
    dispatch(getAssistants());
    if (token) {
      loadLlmConfigurations();
    }
  }, [dispatch, token]);

  const loadLlmConfigurations = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/llm/configurations`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      setLlmConfigurations(response.data.predefined);
      setDefaultConfig(response.data.default);
    } catch (error) {
      console.error('Failed to load LLM configurations:', error);
    }
  };

  useEffect(() => {
    // Load document stats for all assistants
    assistants.forEach(assistant => {
      dispatch(getAssistantDocumentStats(assistant.id));
    });
  }, [assistants, dispatch]);

  const detectPreset = (temperature, maxTokens) => {
    // Check if the current values match any preset
    for (const [presetName, presetConfig] of Object.entries(llmConfigurations)) {
      if (presetConfig.temperature === temperature && presetConfig.max_tokens === maxTokens) {
        return presetName;
      }
    }
    return 'custom';
  };

  const handleOpenDialog = (assistant = null) => {
    if (assistant) {
      setEditingAssistant(assistant);
      const detectedPreset = detectPreset(assistant.temperature, assistant.max_tokens);
      setFormData({
        name: assistant.name,
        description: assistant.description || '',
        initial_context: assistant.initial_context,
        temperature: assistant.temperature,
        max_tokens: assistant.max_tokens,
        document_collection: assistant.document_collection || 'default',
        llm_preset: detectedPreset
      });
    } else {
      setEditingAssistant(null);
      const defaultTemp = defaultConfig?.temperature || 0.7;
      const defaultTokens = defaultConfig?.max_tokens || 1000;
      setFormData({
        name: '',
        description: '',
        initial_context: '',
        temperature: defaultTemp,
        max_tokens: defaultTokens,
        document_collection: 'default',
        llm_preset: 'custom'
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingAssistant(null);
  };

  const handleInputChange = (field) => (event) => {
    const value = field === 'temperature' || field === 'max_tokens' 
      ? parseFloat(event.target.value) || 0 
      : event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePresetChange = (event) => {
    const presetName = event.target.value;
    setFormData(prev => ({
      ...prev,
      llm_preset: presetName
    }));

    if (presetName !== 'custom' && llmConfigurations[presetName]) {
      const preset = llmConfigurations[presetName];
      setFormData(prev => ({
        ...prev,
        temperature: preset.temperature,
        max_tokens: preset.max_tokens
      }));
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.initial_context.trim()) {
      return;
    }

    // Prepare the data, excluding llm_preset if it's custom
    const submitData = { ...formData };
    if (submitData.llm_preset === 'custom') {
      delete submitData.llm_preset;
    }

    try {
      if (editingAssistant) {
        await dispatch(updateAssistant({
          assistantId: editingAssistant.id,
          assistantData: submitData
        })).unwrap();
      } else {
        await dispatch(createAssistant(submitData)).unwrap();
      }
      handleCloseDialog();
    } catch (error) {
      console.error('Failed to save assistant:', error);
    }
  };

  const handleDelete = async (assistantId) => {
    if (window.confirm('Are you sure you want to delete this assistant?')) {
      try {
        await dispatch(deleteAssistant(assistantId)).unwrap();
      } catch (error) {
        console.error('Failed to delete assistant:', error);
      }
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const handleFileSelect = (assistantId) => (event) => {
    setSelectedFiles({
      ...selectedFiles,
      [assistantId]: Array.from(event.target.files)
    });
  };

  const handleUploadDocuments = async (assistantId) => {
    const files = selectedFiles[assistantId];
    if (!files || files.length === 0) return;

    try {
      await dispatch(uploadDocumentsToAssistant({ assistantId, files })).unwrap();
      // Clear selected files and refresh stats
      setSelectedFiles({ ...selectedFiles, [assistantId]: [] });
      dispatch(getAssistantDocumentStats(assistantId));
    } catch (error) {
      console.error('Failed to upload documents:', error);
    }
  };

  const handleClearDocuments = async (assistantId) => {
    if (window.confirm('Are you sure you want to clear all documents for this assistant?')) {
      try {
        await dispatch(clearAssistantDocuments(assistantId)).unwrap();
        dispatch(getAssistantDocumentStats(assistantId));
        // Clear documents from state
        setExpandedDocuments({ ...expandedDocuments, [assistantId]: false });
      } catch (error) {
        console.error('Failed to clear documents:', error);
      }
    }
  };

  const handleToggleDocuments = async (assistantId) => {
    const isExpanded = expandedDocuments[assistantId];
    
    if (!isExpanded) {
      // Load documents when expanding
      try {
        await dispatch(getAssistantDocuments(assistantId)).unwrap();
      } catch (error) {
        console.error('Failed to load documents:', error);
      }
    }
    
    setExpandedDocuments({
      ...expandedDocuments,
      [assistantId]: !isExpanded
    });
  };

  const handleDeleteDocument = async (assistantId, documentId, filename) => {
    if (window.confirm(`Are you sure you want to delete "${filename}"?`)) {
      try {
        await dispatch(deleteAssistantDocument({ assistantId, documentId })).unwrap();
        dispatch(getAssistantDocumentStats(assistantId));
      } catch (error) {
        console.error('Failed to delete document:', error);
      }
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Assistant Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Create Assistant
        </Button>
      </Box>

      {error && (
        <Alert 
          severity="error" 
          onClose={() => dispatch(clearError())}
          sx={{ mb: 3 }}
        >
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {assistants.map((assistant) => (
          <Grid size={{ xs: 12, md: 6, lg: 4 }} key={assistant.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <BotIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6" component="h2">
                    {assistant.name}
                  </Typography>
                </Box>
                
                {assistant.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {assistant.description}
                  </Typography>
                )}

                <Typography variant="body2" sx={{ mb: 2 }}>
                  <strong>Instructions:</strong> {assistant.initial_context.substring(0, 100)}...
                </Typography>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  <Chip 
                    label={`Temp: ${assistant.temperature}`} 
                    size="small" 
                    variant="outlined" 
                  />
                  <Chip 
                    label={`Tokens: ${assistant.max_tokens}`} 
                    size="small" 
                    variant="outlined" 
                  />
                  <Chip 
                    label={assistant.document_collection} 
                    size="small" 
                    variant="outlined" 
                  />
                </Box>

                <Typography variant="caption" color="text.secondary">
                  Created: {formatTimestamp(assistant.created_at)}
                </Typography>
                
                {/* Document Management Section */}
                <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <FileIcon sx={{ mr: 1, fontSize: 16 }} />
                      <Typography variant="subtitle2">
                        Files: {documentStats[assistant.id]?.file_count || 0}
                      </Typography>
                      {documentStats[assistant.id]?.total_chunks > 0 && (
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                          ({documentStats[assistant.id].total_chunks} chunks)
                        </Typography>
                      )}
                    </Box>
                    {documentStats[assistant.id]?.file_count > 0 && (
                      <IconButton 
                        size="small" 
                        onClick={() => handleToggleDocuments(assistant.id)}
                      >
                        {expandedDocuments[assistant.id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    )}
                  </Box>
                  
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.docx,.txt"
                    style={{ display: 'none' }}
                    id={`file-upload-${assistant.id}`}
                    onChange={handleFileSelect(assistant.id)}
                  />
                  
                  {selectedFiles[assistant.id] && selectedFiles[assistant.id].length > 0 && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        {selectedFiles[assistant.id].length} file(s) selected
                      </Typography>
                    </Box>
                  )}
                  
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <label htmlFor={`file-upload-${assistant.id}`}>
                      <Button
                        component="span"
                        size="small"
                        startIcon={<UploadIcon />}
                        variant="outlined"
                        sx={{ fontSize: '0.75rem' }}
                      >
                        Select Files
                      </Button>
                    </label>
                    
                    {selectedFiles[assistant.id] && selectedFiles[assistant.id].length > 0 && (
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleUploadDocuments(assistant.id)}
                        disabled={isUploading}
                        sx={{ fontSize: '0.75rem' }}
                      >
                        Upload
                      </Button>
                    )}
                    
                    {documentStats[assistant.id]?.file_count > 0 && (
                      <Button
                        size="small"
                        startIcon={<ClearIcon />}
                        onClick={() => handleClearDocuments(assistant.id)}
                        color="error"
                        variant="outlined"
                        sx={{ fontSize: '0.75rem' }}
                      >
                        Clear
                      </Button>
                    )}
                  </Box>
                  
                  {/* Expanded Documents List */}
                  {expandedDocuments[assistant.id] && documents[assistant.id] && (
                    <Box sx={{ mt: 2 }}>
                      {documents[assistant.id].length === 0 ? (
                        <Typography variant="caption" color="text.secondary">
                          No documents uploaded yet
                        </Typography>
                      ) : (
                        documents[assistant.id].map((doc) => (
                          <Box 
                            key={doc.id} 
                            sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'space-between',
                              py: 0.5,
                              px: 1,
                              mb: 0.5,
                              backgroundColor: 'grey.50',
                              borderRadius: 1
                            }}
                          >
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  display: 'block',
                                  fontWeight: 'medium',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {doc.filename}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatFileSize(doc.file_size)} • {doc.chunk_count} chunks
                              </Typography>
                            </Box>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteDocument(assistant.id, doc.id, doc.filename)}
                              disabled={isDeletingDocument}
                              color="error"
                              sx={{ ml: 1 }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        ))
                      )}
                    </Box>
                  )}
                </Box>
              </CardContent>

              <CardActions>
                <IconButton 
                  size="small" 
                  onClick={() => handleOpenDialog(assistant)}
                  color="primary"
                >
                  <EditIcon />
                </IconButton>
                <IconButton 
                  size="small" 
                  onClick={() => handleDelete(assistant.id)}
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {assistants.length === 0 && !isLoading && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <BotIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No assistants yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create your first assistant to get started
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Create Assistant
          </Button>
        </Box>
      )}

      {/* Create/Edit Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingAssistant ? 'Edit Assistant' : 'Create New Assistant'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              autoFocus
              label="Name"
              fullWidth
              value={formData.name}
              onChange={handleInputChange('name')}
              required
            />
            
            <TextField
              label="Description"
              fullWidth
              value={formData.description}
              onChange={handleInputChange('description')}
              multiline
              rows={2}
            />
            
            <TextField
              label="System Instructions"
              fullWidth
              value={formData.initial_context}
              onChange={handleInputChange('initial_context')}
              multiline
              rows={4}
              required
              helperText="Define the assistant's personality, expertise, and behavior"
            />

            <FormControl fullWidth>
              <InputLabel>LLM Configuration Preset</InputLabel>
              <Select
                value={formData.llm_preset}
                label="LLM Configuration Preset"
                onChange={handlePresetChange}
              >
                <MenuItem value="custom">Custom</MenuItem>
                {Object.entries(llmConfigurations).map(([key, config]) => (
                  <MenuItem key={key} value={key}>
                    {key.charAt(0).toUpperCase() + key.slice(1)} - {config.description}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                {formData.llm_preset !== 'custom' && llmConfigurations[formData.llm_preset]
                  ? llmConfigurations[formData.llm_preset].description
                  : 'Configure temperature and max tokens manually'}
              </FormHelperText>
            </FormControl>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Temperature"
                type="number"
                value={formData.temperature}
                onChange={handleInputChange('temperature')}
                inputProps={{ min: 0, max: 2, step: 0.1 }}
                helperText="0 = focused, 2 = creative"
                disabled={formData.llm_preset !== 'custom'}
                sx={{ flex: 1 }}
              />
              
              <TextField
                label="Max Tokens"
                type="number"
                value={formData.max_tokens}
                onChange={handleInputChange('max_tokens')}
                inputProps={{ min: 100, max: 4000, step: 100 }}
                helperText="Response length limit"
                disabled={formData.llm_preset !== 'custom'}
                sx={{ flex: 1 }}
              />
            </Box>

            <TextField
              label="Document Collection"
              fullWidth
              value={formData.document_collection}
              onChange={handleInputChange('document_collection')}
              helperText="Which document collection this assistant should use"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmit}
            variant="contained"
            disabled={!formData.name.trim() || !formData.initial_context.trim()}
          >
            {editingAssistant ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AssistantManagement;