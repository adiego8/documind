import { useState, useCallback } from 'react';

const useCustomDialog = () => {
  const [dialogState, setDialogState] = useState({
    open: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: null,
    confirmText: 'OK',
    cancelText: 'Cancel',
    showCancel: false
  });

  const showAlert = useCallback((message, title = 'Notice', type = 'info') => {
    return new Promise((resolve) => {
      setDialogState({
        open: true,
        title,
        message,
        type,
        onConfirm: resolve,
        confirmText: 'OK',
        showCancel: false
      });
    });
  }, []);

  const showConfirm = useCallback((message, title = 'Confirm Action', type = 'confirm') => {
    return new Promise((resolve) => {
      setDialogState({
        open: true,
        title,
        message,
        type,
        onConfirm: () => resolve(true),
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        showCancel: true
      });
    });
  }, []);

  const showError = useCallback((message, title = 'Error') => {
    return showAlert(message, title, 'error');
  }, [showAlert]);

  const showWarning = useCallback((message, title = 'Warning') => {
    return showAlert(message, title, 'warning');
  }, [showAlert]);

  const showSuccess = useCallback((message, title = 'Success') => {
    return showAlert(message, title, 'success');
  }, [showAlert]);

  const closeDialog = useCallback(() => {
    // If there's an onConfirm function and showCancel is true, resolve with false (user cancelled)
    if (dialogState.onConfirm && dialogState.showCancel) {
      dialogState.onConfirm(false);
    }
    setDialogState(prev => ({ ...prev, open: false }));
  }, [dialogState]);

  const handleConfirm = useCallback(() => {
    if (dialogState.onConfirm) {
      dialogState.onConfirm(true);
    }
    setDialogState(prev => ({ ...prev, open: false }));
  }, [dialogState]);

  return {
    dialogState,
    showAlert,
    showConfirm,
    showError,
    showWarning,
    showSuccess,
    closeDialog,
    handleConfirm
  };
};

export default useCustomDialog;