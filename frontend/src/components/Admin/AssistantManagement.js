import { useState, useEffect, useCallback } from 'react';
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
import CustomDialog from '../common/CustomDialog';
import useCustomDialog from '../../hooks/useCustomDialog';

const API_BASE_URL = config.apiBaseUrl;

const AssistantManagement = () => {
  const dispatch = useDispatch();
  const { assistants, isLoading, error, documentStats, documents, isUploading, isDeletingDocument } = useSelector((state) => state.assistants);
  const { token } = useSelector((state) => state.auth);
  const { dialogState, showConfirm, closeDialog, handleConfirm } = useCustomDialog();

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

  const loadLlmConfigurations = useCallback(async () => {
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
  }, [token]);

  useEffect(() => {
    dispatch(getAssistants());
    if (token) {
      loadLlmConfigurations();
    }
  }, [dispatch, token, loadLlmConfigurations]);

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
    const confirmed = await showConfirm(
      'Are you sure you want to delete this assistant? This action cannot be undone.',
      'Delete Assistant'
    );

    if (confirmed) {
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
    const confirmed = await showConfirm(
      'Are you sure you want to clear all documents for this assistant? This action cannot be undone.',
      'Clear All Documents'
    );

    if (confirmed) {
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
    const confirmed = await showConfirm(
      `Are you sure you want to delete "${filename}"? This action cannot be undone.`,
      'Delete Document'
    );

    if (confirmed) {
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
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, pt: 2, px: 2 }}>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
          Assistant Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 2,
            px: 3,
            py: 1,
            textTransform: 'none',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
            '&:hover': {
              background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
              boxShadow: '0 6px 20px rgba(102, 126, 234, 0.6)',
              transform: 'translateY(-1px)'
            },
            transition: 'all 0.2s ease-in-out'
          }}
        >
          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
            Create Assistant
          </Box>
          <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
            Create
          </Box>
        </Button>
      </Box>

      {error && (
        <Alert
          severity="error"
          onClose={() => dispatch(clearError())}
          sx={{
            mb: 3,
            borderRadius: 3,
            border: '1px solid rgba(244, 67, 54, 0.2)',
            boxShadow: '0 4px 20px rgba(244, 67, 54, 0.1)'
          }}
        >
          {error}
        </Alert>
      )}

      <Box sx={{ px: 2 }}>
        <Grid container spacing={3}>
          {assistants.map((assistant) => (
            <Grid item xs={12} md={6} lg={4} key={assistant.id}>
              <Card sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 3,
                background: 'inherit',
                border: '1px solid rgba(102, 126, 234, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 12px 40px rgba(102, 126, 234, 0.15)'
                }
              }}>
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
                      sx={{
                        border: '1px solid #4ade80',
                        color: '#4ade80',
                        fontFamily: '"JetBrains Mono", monospace',
                        color: 'white',
                        border: 'none',
                        fontWeight: 500
                      }}
                    />
                    <Chip
                      label={`Tokens: ${assistant.max_tokens}`}
                      size="small"
                      sx={{
                        border: '1px solid #ff0066',
                        color: '#ff0066',
                        fontFamily: '"JetBrains Mono", monospace',
                        color: 'white',
                        border: 'none',
                        fontWeight: 500
                      }}
                    />
                    <Chip
                      label={assistant.document_collection}
                      size="small"
                      sx={{
                        border: '1px solid #60a5fa',
                        color: '#60a5fa',
                        fontFamily: '"JetBrains Mono", monospace',
                        color: 'white',
                        border: 'none',
                        fontWeight: 500
                      }}
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
                          sx={{
                            fontSize: '0.75rem',
                            borderRadius: 2,
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
                          Select Files
                        </Button>
                      </label>

                      {selectedFiles[assistant.id] && selectedFiles[assistant.id].length > 0 && (
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => handleUploadDocuments(assistant.id)}
                          disabled={isUploading}
                          sx={{
                            fontSize: '0.75rem',
                            border: '1px solid #60a5fa',
                            color: '#60a5fa',
                            fontFamily: '"JetBrains Mono", monospace',
                            borderRadius: 2,
                            boxShadow: '0 2px 8px rgba(79, 172, 254, 0.3)',
                            '&:hover': {
                              background: '#60a5fa',
                              color: '#000000',
                              boxShadow: '0 4px 12px rgba(79, 172, 254, 0.4)',
                              transform: 'translateY(-1px)'
                            },
                            '&:disabled': {
                              background: 'rgba(0, 0, 0, 0.12)'
                            },
                            transition: 'all 0.2s ease-in-out'
                          }}
                        >
                          Upload
                        </Button>
                      )}

                      {documentStats[assistant.id]?.file_count > 0 && (
                        <Button
                          size="small"
                          startIcon={<ClearIcon />}
                          onClick={() => handleClearDocuments(assistant.id)}
                          variant="outlined"
                          sx={{
                            fontSize: '0.75rem',
                            borderRadius: 2,
                            color: '#f5576c',
                            border: '1px solid rgba(245, 87, 108, 0.3)',
                            '&:hover': {
                              background: 'rgba(245, 87, 108, 0.08)',
                              border: '1px solid rgba(245, 87, 108, 0.5)',
                              transform: 'translateY(-1px)'
                            },
                            transition: 'all 0.2s ease-in-out'
                          }}
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

                <CardActions sx={{ p: 2, gap: 1, justifyContent: 'flex-end' }}>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(assistant)}
                    sx={{
                      border: '1px solid #4ade80',
                      color: '#4ade80',
                      fontFamily: '"JetBrains Mono", monospace',
                      color: 'white',
                      borderRadius: 2,
                      p: 1,
                      '&:hover': {
                        background: '#4ade80',
                        color: '#000000',
                        transform: 'translateY(-1px) scale(1.05)'
                      },
                      transition: 'all 0.2s ease-in-out'
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(assistant.id)}
                    sx={{
                      border: '1px solid #ff0066',
                      color: '#ff0066',
                      fontFamily: '"JetBrains Mono", monospace',
                      color: 'white',
                      borderRadius: 2,
                      p: 1,
                      '&:hover': {
                        background: '#ff0066',
                        color: '#000000',
                        transform: 'translateY(-1px) scale(1.05)'
                      },
                      transition: 'all 0.2s ease-in-out'
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {assistants.length === 0 && !isLoading && (
        <Box sx={{ textAlign: 'center', py: 8, px: 2 }}>
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
            size="large"
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: 3,
              px: 4,
              py: 2,
              fontSize: { xs: '1rem', sm: '1.1rem' },
              fontWeight: 600,
              boxShadow: '0 8px 25px rgba(102, 126, 234, 0.4)',
              textTransform: 'none',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                boxShadow: '0 10px 30px rgba(102, 126, 234, 0.6)',
                transform: 'translateY(-3px) scale(1.05)'
              },
              '&:active': {
                transform: 'translateY(-1px) scale(0.95)'
              },
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
              Create Assistant
            </Box>
            <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
              Create
            </Box>
          </Button>
        </Box>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
            border: '1px solid rgba(102, 126, 234, 0.1)'
          }
        }}
      >
        <DialogTitle sx={{
          borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
          fontWeight: 600
        }}>
          {editingAssistant ? 'Edit Assistant' : 'Create New Assistant'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
            <TextField
              fullWidth
              label="Assistant Name"
              value={formData.name}
              onChange={handleInputChange('name')}
              required
            />

            <TextField
              fullWidth
              label="Description"
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
        <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(0, 0, 0, 0.08)' }}>
          <Button
            onClick={handleCloseDialog}
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
            onClick={handleSubmit}
            variant="contained"
            disabled={!formData.name.trim() || !formData.initial_context.trim()}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: 2,
              px: 4,
              py: 1.2,
              fontSize: '1rem',
              fontWeight: 600,
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
              textTransform: 'none',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                boxShadow: '0 6px 20px rgba(102, 126, 234, 0.6)',
                transform: 'translateY(-1px) scale(1.02)'
              },
              '&:disabled': {
                background: 'rgba(0, 0, 0, 0.12)',
                transform: 'none',
                boxShadow: 'none'
              },
              '&:active': {
                transform: 'translateY(0px) scale(0.98)'
              },
              transition: 'all 0.2s ease-in-out'
            }}
          >
            {editingAssistant ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <CustomDialog
        open={dialogState.open}
        onClose={closeDialog}
        title={dialogState.title}
        message={dialogState.message}
        type={dialogState.type}
        onConfirm={handleConfirm}
        confirmText={dialogState.confirmText}
        cancelText={dialogState.cancelText}
        showCancel={dialogState.showCancel}
      />
    </Box>
  );
};

export default AssistantManagement;