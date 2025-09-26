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

      <TableContainer 
        component={Paper}
        elevation={8}
        sx={{
          borderRadius: 3,
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
          border: '1px solid rgba(102, 126, 234, 0.1)',
          overflow: 'hidden'
        }}
      >
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
                      sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        borderRadius: 1.5,
                        p: 0.5,
                        '&:hover': {
                          background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                          transform: 'scale(1.1)'
                        },
                        transition: 'all 0.2s ease-in-out'
                      }}
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
                        sx={{
                          background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                          color: 'white',
                          borderRadius: 1.5,
                          p: 0.5,
                          '&:hover': {
                            background: 'linear-gradient(135deg, #3d8bfe 0%, #00d4fe 100%)',
                            transform: 'scale(1.1)'
                          },
                          transition: 'all 0.2s ease-in-out'
                        }}
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
                    size="small"
                    sx={{
                      background: code.is_active 
                        ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
                        : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                      color: 'white',
                      fontWeight: 500,
                      border: 'none'
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton 
                      size="small" 
                      title="View users"
                      sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        borderRadius: 1.5,
                        p: 0.8,
                        '&:hover': {
                          background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                          transform: 'scale(1.1)'
                        },
                        transition: 'all 0.2s ease-in-out'
                      }}
                    >
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