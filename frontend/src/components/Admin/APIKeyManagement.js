import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Tooltip,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Divider,
  InputAdornment,
  Collapse,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  ContentCopy as CopyIcon,
  Visibility as ViewIcon,
  VisibilityOff as VisibilityOffIcon,
  Security as SecurityIcon,
  BarChart as StatsIcon,
  Key as KeyIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { apiKeysAPI } from '../../services/apiKeysAPI';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`api-key-tabpanel-${index}`}
      aria-labelledby={`api-key-tab-${index}`}
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

const APIKeyManagement = () => {
  const [tabValue, setTabValue] = useState(0);
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Dialog states
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState(null);
  const [usageDialogOpen, setUsageDialogOpen] = useState(false);
  const [viewingKeyUsage, setViewingKeyUsage] = useState(null);
  const [usageStats, setUsageStats] = useState({});
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);
  const [keyToRegenerate, setKeyToRegenerate] = useState(null);
  
  // New key display
  const [newKeyData, setNewKeyData] = useState(null);
  const [showNewKey, setShowNewKey] = useState(false);
  
  // Form states
  const [keyForm, setKeyForm] = useState({
    name: '',
    description: '',
    rate_limit_per_minute: 60,
    rate_limit_per_day: 1000,
    expires_in_days: '',
    permissions: {
      chat: true,
      assistants: 'read',
      documents: 'read'
    },
    is_active: true
  });

  useEffect(() => {
    loadAPIKeys();
  }, []);

  const loadAPIKeys = async () => {
    try {
      setLoading(true);
      const keys = await apiKeysAPI.getAPIKeys();
      setApiKeys(keys);
    } catch (err) {
      setError('Failed to load API keys');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const resetForm = () => {
    setKeyForm({
      name: '',
      description: '',
      rate_limit_per_minute: 60,
      rate_limit_per_day: 1000,
      expires_in_days: '',
      permissions: {
        chat: true,
        assistants: 'read',
        documents: 'read'
      },
      is_active: true
    });
    setEditingKey(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setKeyDialogOpen(true);
  };

  const openEditDialog = (key) => {
    setEditingKey(key);
    setKeyForm({
      name: key.name || '',
      description: key.description || '',
      rate_limit_per_minute: key.rate_limit_per_minute || 60,
      rate_limit_per_day: key.rate_limit_per_day || 1000,
      expires_in_days: '',
      permissions: key.permissions || {
        chat: true,
        assistants: 'read',
        documents: 'read'
      },
      is_active: key.is_active
    });
    setKeyDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      const payload = {
        ...keyForm,
        expires_in_days: keyForm.expires_in_days ? parseInt(keyForm.expires_in_days) : null
      };

      if (editingKey) {
        await apiKeysAPI.updateAPIKey(editingKey.id, payload);
        setSuccess('API key updated successfully');
      } else {
        const newKey = await apiKeysAPI.createAPIKey(payload);
        setNewKeyData(newKey);
        setShowNewKey(true);
        setSuccess('API key created successfully');
      }

      setKeyDialogOpen(false);
      resetForm();
      loadAPIKeys();
    } catch (err) {
      setError(`Failed to ${editingKey ? 'update' : 'create'} API key`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!keyToDelete) return;
    
    try {
      setLoading(true);
      await apiKeysAPI.deleteAPIKey(keyToDelete.id);
      setDeleteDialogOpen(false);
      setKeyToDelete(null);
      setSuccess('API key deleted successfully');
      loadAPIKeys();
    } catch (err) {
      setError('Failed to delete API key');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!keyToRegenerate) return;
    
    try {
      setLoading(true);
      const newKey = await apiKeysAPI.regenerateAPIKey(keyToRegenerate.id);
      setNewKeyData(newKey);
      setShowNewKey(true);
      setRegenerateDialogOpen(false);
      setKeyToRegenerate(null);
      setSuccess('API key regenerated successfully');
      loadAPIKeys();
    } catch (err) {
      setError('Failed to regenerate API key');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadUsageStats = async (key) => {
    try {
      setLoading(true);
      const stats = await apiKeysAPI.getUsageStats(key.id);
      setUsageStats(stats);
      setViewingKeyUsage(key);
      setUsageDialogOpen(true);
    } catch (err) {
      setError('Failed to load usage statistics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (key) => {
    if (!key.is_active) return 'error';
    if (key.expires_at && new Date(key.expires_at) < new Date()) return 'warning';
    return 'success';
  };

  const getStatusText = (key) => {
    if (!key.is_active) return 'Inactive';
    if (key.expires_at && new Date(key.expires_at) < new Date()) return 'Expired';
    return 'Active';
  };

  return (
    <Box sx={{ px: 3, pt: 3 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          API Key Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreateDialog}
          sx={{ 
            borderRadius: 2,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          }}
        >
          Generate New Key
        </Button>
      </Box>

      {/* API Keys Tab */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab icon={<KeyIcon />} label="API Keys" />
          <Tab icon={<StatsIcon />} label="Overview" />
        </Tabs>

        {/* Keys List Tab */}
        <TabPanel value={tabValue} index={0}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Key Prefix</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Rate Limits</TableCell>
                    <TableCell>Last Used</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {apiKeys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell>
                        <Typography variant="subtitle2">{key.name}</Typography>
                        {key.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {key.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" fontFamily="monospace">
                            {key.key_prefix}...
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={getStatusText(key)}
                          color={getStatusColor(key)}
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {key.rate_limit_per_minute}/min
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {key.rate_limit_per_day}/day
                        </Typography>
                      </TableCell>
                      <TableCell>{formatDate(key.last_used_at)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="View Usage">
                            <IconButton 
                              size="small" 
                              onClick={() => loadUsageStats(key)}
                              color="info"
                            >
                              <StatsIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton 
                              size="small" 
                              onClick={() => openEditDialog(key)}
                              color="primary"
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Regenerate">
                            <IconButton 
                              size="small" 
                              onClick={() => {
                                setKeyToRegenerate(key);
                                setRegenerateDialogOpen(true);
                              }}
                              color="warning"
                            >
                              <RefreshIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton 
                              size="small" 
                              onClick={() => {
                                setKeyToDelete(key);
                                setDeleteDialogOpen(true);
                              }}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                  {apiKeys.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">
                          No API keys found. Generate your first API key!
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        {/* Overview Tab */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Total Keys
                  </Typography>
                  <Typography variant="h4">
                    {apiKeys.length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Active Keys
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {apiKeys.filter(key => key.is_active).length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Recently Used
                  </Typography>
                  <Typography variant="h4" color="info.main">
                    {apiKeys.filter(key => key.last_used_at && 
                      new Date(key.last_used_at) > new Date(Date.now() - 7*24*60*60*1000)
                    ).length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Expired/Inactive
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {apiKeys.filter(key => 
                      !key.is_active || (key.expires_at && new Date(key.expires_at) < new Date())
                    ).length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>

      {/* Create/Edit Dialog */}
      <Dialog
        open={keyDialogOpen}
        onClose={() => {
          setKeyDialogOpen(false);
          resetForm();
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingKey ? 'Edit API Key' : 'Generate New API Key'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Name"
              value={keyForm.name}
              onChange={(e) => setKeyForm({...keyForm, name: e.target.value})}
              fullWidth
              required
              placeholder="e.g., Mobile App Key"
            />
            <TextField
              label="Description"
              value={keyForm.description}
              onChange={(e) => setKeyForm({...keyForm, description: e.target.value})}
              fullWidth
              multiline
              rows={2}
              placeholder="Optional description of what this key is used for"
            />
            
            <Divider sx={{ my: 1 }} />
            
            <Typography variant="h6" gutterBottom>
              Rate Limits
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Requests per Minute"
                  type="number"
                  value={keyForm.rate_limit_per_minute}
                  onChange={(e) => setKeyForm({...keyForm, rate_limit_per_minute: parseInt(e.target.value)})}
                  fullWidth
                  inputProps={{ min: 1, max: 1000 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Requests per Day"
                  type="number"
                  value={keyForm.rate_limit_per_day}
                  onChange={(e) => setKeyForm({...keyForm, rate_limit_per_day: parseInt(e.target.value)})}
                  fullWidth
                  inputProps={{ min: 1, max: 100000 }}
                />
              </Grid>
            </Grid>
            
            <TextField
              label="Expires in Days"
              type="number"
              value={keyForm.expires_in_days}
              onChange={(e) => setKeyForm({...keyForm, expires_in_days: e.target.value})}
              fullWidth
              placeholder="Leave empty for no expiration"
              inputProps={{ min: 1, max: 365 }}
            />
            
            <Divider sx={{ my: 1 }} />
            
            <Typography variant="h6" gutterBottom>
              Permissions
            </Typography>
            
            <FormControlLabel
              control={
                <Switch
                  checked={keyForm.permissions.chat}
                  onChange={(e) => setKeyForm({
                    ...keyForm, 
                    permissions: { ...keyForm.permissions, chat: e.target.checked }
                  })}
                />
              }
              label="Chat Access"
            />
            
            <FormControl fullWidth>
              <InputLabel>Assistants Access</InputLabel>
              <Select
                value={keyForm.permissions.assistants}
                onChange={(e) => setKeyForm({
                  ...keyForm, 
                  permissions: { ...keyForm.permissions, assistants: e.target.value }
                })}
                label="Assistants Access"
              >
                <MenuItem value="none">No Access</MenuItem>
                <MenuItem value="read">Read Only</MenuItem>
                <MenuItem value="write">Read & Write</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl fullWidth>
              <InputLabel>Documents Access</InputLabel>
              <Select
                value={keyForm.permissions.documents}
                onChange={(e) => setKeyForm({
                  ...keyForm, 
                  permissions: { ...keyForm.permissions, documents: e.target.value }
                })}
                label="Documents Access"
              >
                <MenuItem value="none">No Access</MenuItem>
                <MenuItem value="read">Read Only</MenuItem>
                <MenuItem value="write">Read & Write</MenuItem>
              </Select>
            </FormControl>
            
            {editingKey && (
              <FormControlLabel
                control={
                  <Switch
                    checked={keyForm.is_active}
                    onChange={(e) => setKeyForm({...keyForm, is_active: e.target.checked})}
                  />
                }
                label="Active"
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => {
            setKeyDialogOpen(false);
            resetForm();
          }}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSubmit}
            disabled={!keyForm.name}
          >
            {editingKey ? 'Update' : 'Generate'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Key Display Dialog */}
      <Dialog
        open={showNewKey}
        onClose={() => setShowNewKey(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: 'success.main' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckIcon />
            API Key Generated Successfully
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Important:</strong> This is the only time you'll see the full API key. 
              Copy it now and store it securely.
            </Typography>
          </Alert>
          
          {newKeyData && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="API Key"
                value={newKeyData.key}
                fullWidth
                multiline
                rows={3}
                InputProps={{
                  readOnly: true,
                  style: { fontFamily: 'monospace', fontSize: '0.875rem' },
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => copyToClipboard(newKeyData.key)}>
                        <CopyIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              
              <Typography variant="body2" color="text.secondary">
                Key Name: <strong>{newKeyData.name}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Key ID: <strong>{newKeyData.key_prefix}...</strong>
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            variant="contained" 
            onClick={() => setShowNewKey(false)}
            startIcon={<CheckIcon />}
          >
            I've Saved the Key
          </Button>
        </DialogActions>
      </Dialog>

      {/* Usage Statistics Dialog */}
      <Dialog
        open={usageDialogOpen}
        onClose={() => setUsageDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Usage Statistics - {viewingKeyUsage?.name}
        </DialogTitle>
        <DialogContent>
          {viewingKeyUsage && (
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>
                      Total Requests (30 days)
                    </Typography>
                    <Typography variant="h4">
                      {usageStats.total_requests || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>
                      Success Rate
                    </Typography>
                    <Typography variant="h4" color="success.main">
                      {Math.round(usageStats.success_rate || 0)}%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>
                      Active Days
                    </Typography>
                    <Typography variant="h4" color="info.main">
                      {usageStats.active_days || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>
                      Last Request
                    </Typography>
                    <Typography variant="h6">
                      {formatDate(usageStats.last_request)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setUsageDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle sx={{ color: 'error.main' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon />
            Delete API Key
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the API key "{keyToDelete?.name}"? 
            This action cannot be undone and will immediately invalidate the key.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="error"
            onClick={handleDelete}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Regenerate Confirmation Dialog */}
      <Dialog
        open={regenerateDialogOpen}
        onClose={() => setRegenerateDialogOpen(false)}
      >
        <DialogTitle sx={{ color: 'warning.main' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <RefreshIcon />
            Regenerate API Key
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to regenerate the API key "{keyToRegenerate?.name}"? 
            This will create a new key and immediately invalidate the old one. 
            Any applications using the old key will stop working.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setRegenerateDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="warning"
            onClick={handleRegenerate}
          >
            Regenerate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default APIKeyManagement;