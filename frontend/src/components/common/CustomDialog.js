import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton
} from '@mui/material';
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
  Close as CloseIcon
} from '@mui/icons-material';

const CustomDialog = ({
  open,
  onClose,
  title,
  message,
  type = 'info', // 'info', 'warning', 'error', 'success', 'confirm'
  onConfirm,
  confirmText = 'OK',
  cancelText = 'Cancel',
  showCancel = false
}) => {
  const getIcon = () => {
    switch (type) {
      case 'warning':
        return <WarningIcon sx={{ color: '#f5576c', fontSize: 48 }} />;
      case 'error':
        return <ErrorIcon sx={{ color: '#f5576c', fontSize: 48 }} />;
      case 'success':
        return <SuccessIcon sx={{ color: '#4facfe', fontSize: 48 }} />;
      case 'confirm':
        return <WarningIcon sx={{ color: '#f093fb', fontSize: 48 }} />;
      default:
        return <InfoIcon sx={{ color: '#667eea', fontSize: 48 }} />;
    }
  };

  const getHeaderColor = () => {
    switch (type) {
      case 'warning':
      case 'error':
        return 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
      case 'success':
        return 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
      case 'confirm':
        return 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
      default:
        return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          borderRadius: 4,
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          overflow: 'hidden'
        }
      }}
    >
      <DialogTitle sx={{
        background: getHeaderColor(),
        color: 'white',
        textAlign: 'center',
        py: 2,
        position: 'relative'
      }}>
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: 'white',
            '&:hover': {
              background: 'rgba(255, 255, 255, 0.1)'
            }
          }}
        >
          <CloseIcon />
        </IconButton>
        <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
      </DialogTitle>
      
      <DialogContent sx={{
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(10px)',
        py: 4,
        textAlign: 'center'
      }}>
        <Box sx={{ mb: 2 }}>
          {getIcon()}
        </Box>
        <Typography variant="body1" sx={{ fontSize: '1.1rem', lineHeight: 1.5 }}>
          {message}
        </Typography>
      </DialogContent>
      
      <DialogActions sx={{
        p: 3,
        gap: 2,
        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        justifyContent: 'center'
      }}>
        {showCancel && (
          <Button
            onClick={onClose}
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
            {cancelText}
          </Button>
        )}
        <Button
          onClick={handleConfirm}
          variant="contained"
          sx={{
            background: getHeaderColor(),
            borderRadius: 2,
            px: 4,
            py: 1.2,
            fontSize: '1rem',
            fontWeight: 600,
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
            textTransform: 'none',
            '&:hover': {
              boxShadow: '0 6px 20px rgba(102, 126, 234, 0.6)',
              transform: 'translateY(-1px) scale(1.02)'
            },
            '&:active': {
              transform: 'translateY(0px) scale(0.98)'
            },
            transition: 'all 0.2s ease-in-out'
          }}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CustomDialog;