import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { 
  getAdminCodes, 
  clearError 
} from '../../store/slices/adminSlice';

const AdminCodeManagement = () => {
  const dispatch = useDispatch();
  const { adminCodes, isLoading, error } = useSelector((state) => state.admin);

  useEffect(() => {
    dispatch(getAdminCodes());
  }, [dispatch]);

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h2">
            Registration Codes
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            <strong>Admin Code:</strong> For admin management • <strong>User Code:</strong> Give this to users for registration
          </Typography>
        </Box>
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

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Admin Code</strong></TableCell>
              <TableCell><strong>User Code</strong></TableCell>
              <TableCell><strong>Description</strong></TableCell>
              <TableCell><strong>Users</strong></TableCell>
              <TableCell><strong>Max Users</strong></TableCell>
              <TableCell><strong>Created</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {adminCodes.map((code) => (
              <TableRow key={code.id}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                      {code.code}
                    </Typography>
                    <IconButton 
                      size="small" 
                      onClick={() => handleCopyCode(code.code)}
                      title="Copy admin code"
                    >
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontFamily: 'monospace', 
                        fontWeight: 'bold',
                        color: 'primary.main'
                      }}
                    >
                      {code.user_code || 'N/A'}
                    </Typography>
                    {code.user_code && (
                      <IconButton 
                        size="small" 
                        onClick={() => handleCopyCode(code.user_code)}
                        title="Copy user code"
                      >
                        <CopyIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {code.description || 'No description'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {code.current_users}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {code.max_users || 'Unlimited'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatTimestamp(code.created_at)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={code.is_active ? 'Active' : 'Inactive'} 
                    color={code.is_active ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton size="small" title="View users">
                      <ViewIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {adminCodes.length === 0 && !isLoading && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No registration codes found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Contact the system administrator to get your registration codes
          </Typography>
        </Box>
      )}

    </Box>
  );
};

export default AdminCodeManagement;