import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
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

  const handleRegister = (e) => {
    e.preventDefault();
    if (registerData.password !== registerData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    // Code is required for all registrations
    const requiredCode = registerData.role === 'admin' ? registerData.adminCode : registerData.userCode;
    const codeType = registerData.role === 'admin' ? 'admin code' : 'user code';
    
    if (!requiredCode.trim()) {
      alert(`${codeType} is required to register`);
      return;
    }
    
    // Validate that the code is valid before allowing registration
    if (!adminCodeValidation?.valid) {
      alert(`Please enter a valid ${codeType}`);
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
        backgroundColor: '#f5f5f5',
        px: { xs: 2, sm: 3 },
        py: { xs: 2, sm: 4 },
      }}
    >
      <Card sx={{ 
        maxWidth: 400, 
        width: '100%', 
        mx: { xs: 1, sm: 2 },
        boxShadow: { xs: 2, sm: 4 }
      }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: { xs: 2, sm: 3 } }}>
            <img 
              src="/logo.png" 
              alt="DOCUMIND Logo" 
              style={{ 
                height: '120px', 
                width: 'auto'
              }} 
            />
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
                sx={{ mt: 3, mb: 2 }}
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
                sx={{ mt: 3, mb: 2 }}
                disabled={isLoading}
              >
                {isLoading ? <CircularProgress size={24} /> : 'Register'}
              </Button>
            </form>
          </TabPanel>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LoginForm;