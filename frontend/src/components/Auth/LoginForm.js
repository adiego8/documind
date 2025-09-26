import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Tab,
  Tabs,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { login, register, clearError, validateUserCode, validateAdminCode, clearAdminCodeValidation } from '../../store/slices/authSlice';
import CustomDialog from '../common/CustomDialog';
import useCustomDialog from '../../hooks/useCustomDialog';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`auth-tabpanel-${index}`}
      aria-labelledby={`auth-tab-${index}`}
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

const LoginForm = () => {
  const dispatch = useDispatch();
  const { isLoading, error, adminCodeValidation, isValidatingCode } = useSelector((state) => state.auth);
  const { dialogState, showError, closeDialog, handleConfirm } = useCustomDialog();
  
  const [tabValue, setTabValue] = useState(0);
  const [loginData, setLoginData] = useState({
    username: '',
    password: '',
  });
  const [registerData, setRegisterData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    role: 'user',
    userCode: '',
    adminCode: '',
  });

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    dispatch(clearError());
  };

  const handleLoginChange = (e) => {
    setLoginData({
      ...loginData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRegisterChange = (e) => {
    const { name, value } = e.target;
    setRegisterData({
      ...registerData,
      [name]: value,
    });
    
    // Validate code when it changes and it's not empty
    if (name === 'userCode' && value.trim()) {
      dispatch(validateUserCode(value.trim()));
    } else if (name === 'userCode' && !value.trim()) {
      dispatch(clearAdminCodeValidation());
    } else if (name === 'adminCode' && value.trim()) {
      dispatch(validateAdminCode(value.trim()));
    } else if (name === 'adminCode' && !value.trim()) {
      dispatch(clearAdminCodeValidation());
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    dispatch(login(loginData));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (registerData.password !== registerData.confirmPassword) {
      await showError('Passwords do not match', 'Registration Error');
      return;
    }
    
    // Code is required for all registrations
    const requiredCode = registerData.role === 'admin' ? registerData.adminCode : registerData.userCode;
    const codeType = registerData.role === 'admin' ? 'admin code' : 'user code';
    
    if (!requiredCode.trim()) {
      await showError(`${codeType} is required to register`, 'Missing Information');
      return;
    }
    
    // Validate that the code is valid before allowing registration
    if (!adminCodeValidation?.valid) {
      await showError(`Please enter a valid ${codeType}`, 'Invalid Code');
      return;
    }
    
    dispatch(register({
      username: registerData.username,
      password: registerData.password,
      role: registerData.role,
      adminCode: registerData.adminCode.trim(),
      userCode: registerData.userCode.trim(),
    }));
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        px: { xs: 2, sm: 3 },
        py: { xs: 2, sm: 4 },
      }}
    >
      <Card sx={{ 
        maxWidth: 400, 
        width: '100%', 
        mx: { xs: 1, sm: 2 },
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
        borderRadius: 4,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: { xs: 2, sm: 3 } }}>
            <img 
              src="/logo.png" 
              alt="DOCUMIND Logo" 
              style={{ 
                height: '60px', 
                width: 'auto',
                maxWidth: '100%',
                marginBottom: '8px',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.2)'
              }} 
            />
            <Box sx={{ 
              fontFamily: 'Orbitron, monospace',
              fontSize: { xs: '1.5rem', sm: '1.8rem' },
              fontWeight: 700,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '0.1em',
              textAlign: 'center',
              textShadow: '0 2px 4px rgba(102, 126, 234, 0.3)',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                filter: 'blur(10px)',
                opacity: 0.1,
                zIndex: -1
              }
            }}>
              DOCUMIND
            </Box>
            <Box sx={{ 
              fontFamily: 'Space Grotesk, sans-serif',
              fontSize: '0.75rem',
              fontWeight: 400,
              color: 'rgba(102, 126, 234, 0.7)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              mt: 0.5
            }}>
              AI Document Assistant
            </Box>
          </Box>
          
          <Tabs value={tabValue} onChange={handleTabChange} centered>
            <Tab label="Login" />
            <Tab label="Register" />
          </Tabs>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          <TabPanel value={tabValue} index={0}>
            <form onSubmit={handleLogin}>
              <TextField
                fullWidth
                label="Username"
                name="username"
                value={loginData.username}
                onChange={handleLoginChange}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="Password"
                name="password"
                type="password"
                value={loginData.password}
                onChange={handleLoginChange}
                margin="normal"
                required
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ 
                  mt: 3, 
                  mb: 2,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: 2,
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 600,
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                    boxShadow: '0 6px 20px rgba(102, 126, 234, 0.6)',
                    transform: 'translateY(-1px)'
                  },
                  '&:disabled': {
                    background: 'rgba(0, 0, 0, 0.12)'
                  },
                  transition: 'all 0.2s ease-in-out'
                }}
                disabled={isLoading}
              >
                {isLoading ? <CircularProgress size={24} /> : 'Login'}
              </Button>
            </form>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <form onSubmit={handleRegister}>
              <TextField
                fullWidth
                label="Username"
                name="username"
                value={registerData.username}
                onChange={handleRegisterChange}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="Password"
                name="password"
                type="password"
                value={registerData.password}
                onChange={handleRegisterChange}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                value={registerData.confirmPassword}
                onChange={handleRegisterChange}
                margin="normal"
                required
              />
              <FormControl fullWidth margin="normal">
                <InputLabel>Role</InputLabel>
                <Select
                  name="role"
                  value={registerData.role}
                  label="Role"
                  onChange={handleRegisterChange}
                >
                  <MenuItem value="user">User</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </Select>
              </FormControl>
              
              {registerData.role === 'admin' ? (
                <TextField
                  fullWidth
                  label="Admin Code (Required)"
                  name="adminCode"
                  value={registerData.adminCode}
                  onChange={handleRegisterChange}
                  margin="normal"
                  required
                  helperText={
                    isValidatingCode 
                      ? "Validating code..." 
                      : adminCodeValidation?.valid 
                        ? `Valid admin code - you'll be registered as an admin`
                        : adminCodeValidation?.valid === false 
                          ? "Invalid admin code - please check with your administrator"
                          : "Enter the admin code provided by your organization"
                  }
                  error={adminCodeValidation?.valid === false}
                />
              ) : (
                <TextField
                  fullWidth
                  label="User Code (Required)"
                  name="userCode"
                  value={registerData.userCode}
                  onChange={handleRegisterChange}
                  margin="normal"
                  required
                  helperText={
                    isValidatingCode 
                      ? "Validating code..." 
                      : adminCodeValidation?.valid 
                        ? `Valid user code - you'll be registered under ${adminCodeValidation.admin_code?.admin_username || 'admin'}`
                        : adminCodeValidation?.valid === false 
                          ? "Invalid user code - please check with your administrator"
                          : "Enter the user code provided by your administrator"
                  }
                  error={adminCodeValidation?.valid === false}
                />
              )}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ 
                  mt: 3, 
                  mb: 2,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: 2,
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 600,
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                    boxShadow: '0 6px 20px rgba(102, 126, 234, 0.6)',
                    transform: 'translateY(-1px)'
                  },
                  '&:disabled': {
                    background: 'rgba(0, 0, 0, 0.12)'
                  },
                  transition: 'all 0.2s ease-in-out'
                }}
                disabled={isLoading}
              >
                {isLoading ? <CircularProgress size={24} /> : 'Register'}
              </Button>
            </form>
          </TabPanel>
        </CardContent>
      </Card>
      
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

export default LoginForm;