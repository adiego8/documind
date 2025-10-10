import { useState } from 'react';
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
        background: '#000000',
        position: 'relative',
        overflow: 'hidden',
        px: { xs: 2, sm: 3 },
        py: { xs: 2, sm: 4 },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: '20%',
          left: '-10%',
          width: '40%',
          height: '40%',
          background: 'radial-gradient(circle, rgba(74, 222, 128, 0.08) 0%, transparent 70%)',
          animation: 'float 15s ease-in-out infinite',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: '10%',
          right: '-5%',
          width: '50%',
          height: '50%',
          background: 'radial-gradient(circle, rgba(96, 165, 250, 0.06) 0%, transparent 70%)',
          animation: 'float 20s ease-in-out infinite reverse',
        },
        '@keyframes float': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(30px, -30px) scale(1.1)' },
        },
      }}
    >
      <Card sx={{
        maxWidth: 440,
        width: '100%',
        mx: { xs: 1, sm: 2 },
        position: 'relative',
        zIndex: 1,
        background: 'rgba(17, 24, 39, 0.6)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(74, 222, 128, 0.1)',
        borderRadius: 3,
        boxShadow: '0 0 40px rgba(74, 222, 128, 0.05), 0 0 80px rgba(96, 165, 250, 0.03)',
        transition: 'all 0.3s ease',
        '&:hover': {
          borderColor: 'rgba(74, 222, 128, 0.2)',
          boxShadow: '0 0 50px rgba(74, 222, 128, 0.08), 0 0 100px rgba(96, 165, 250, 0.05)',
        }
      }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            mb: 4,
            position: 'relative'
          }}>
            <Box sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: { xs: '1.8rem', sm: '2.2rem' },
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '0.05em',
              textAlign: 'center',
              mb: 1,
              position: 'relative',
              '&::before': {
                content: '">"',
                color: '#4ade80',
                marginRight: '0.3em',
                opacity: 0.9,
              },
              '&::after': {
                content: '"_"',
                color: '#60a5fa',
                marginLeft: '0.2em',
                opacity: 0.7,
                animation: 'blink 1.5s infinite',
              },
              '@keyframes blink': {
                '0%, 49%': { opacity: 0.7 },
                '50%, 100%': { opacity: 0 },
              }
            }}>
              Persona
            </Box>
            <Box sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.65rem',
              fontWeight: 400,
              color: 'rgba(156, 163, 175, 0.7)',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              '&::before': {
                content: '"// "',
                color: '#4ade80',
                opacity: 0.4,
              }
            }}>
              It's ok to be different
            </Box>
          </Box>

          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            centered
            sx={{
              mb: 2,
              '& .MuiTab-root': {
                color: 'rgba(156, 163, 175, 0.6)',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.85rem',
                fontWeight: 500,
                textTransform: 'none',
                minHeight: 42,
                transition: 'all 0.2s ease',
                '&:hover': {
                  color: 'rgba(74, 222, 128, 0.8)',
                },
                '&.Mui-selected': {
                  color: '#4ade80',
                }
              },
              '& .MuiTabs-indicator': {
                background: 'linear-gradient(90deg, #4ade80 0%, #60a5fa 100%)',
                height: 2,
                borderRadius: 1,
              }
            }}
          >
            <Tab label="$ login" />
            <Tab label="$ register" />
          </Tabs>

          {error && (
            <Alert
              severity="error"
              sx={{
                mt: 2,
                mb: 2,
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.75rem',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#fca5a5',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                '& .MuiAlert-icon': {
                  color: '#ef4444',
                }
              }}
            >
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
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.9rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: 2,
                    '& fieldset': {
                      borderColor: 'rgba(74, 222, 128, 0.2)',
                      transition: 'all 0.2s ease',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(74, 222, 128, 0.4)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#4ade80',
                      borderWidth: 1,
                    }
                  },
                  '& .MuiInputLabel-root': {
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.85rem',
                    color: 'rgba(156, 163, 175, 0.7)',
                    '&.Mui-focused': {
                      color: '#4ade80',
                    }
                  }
                }}
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
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.9rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: 2,
                    '& fieldset': {
                      borderColor: 'rgba(74, 222, 128, 0.2)',
                      transition: 'all 0.2s ease',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(74, 222, 128, 0.4)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#4ade80',
                      borderWidth: 1,
                    }
                  },
                  '& .MuiInputLabel-root': {
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.85rem',
                    color: 'rgba(156, 163, 175, 0.7)',
                    '&.Mui-focused': {
                      color: '#4ade80',
                    }
                  }
                }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{
                  mt: 3,
                  mb: 2,
                  background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.15) 0%, rgba(96, 165, 250, 0.15) 100%)',
                  border: '1px solid rgba(74, 222, 128, 0.3)',
                  borderRadius: 2,
                  py: 1.3,
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  fontFamily: '"JetBrains Mono", monospace',
                  color: '#ffffff',
                  boxShadow: '0 0 20px rgba(74, 222, 128, 0.1)',
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: '-100%',
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(74, 222, 128, 0.2), transparent)',
                    transition: 'left 0.5s ease',
                  },
                  '&:hover': {
                    background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.25) 0%, rgba(96, 165, 250, 0.25) 100%)',
                    borderColor: 'rgba(74, 222, 128, 0.5)',
                    boxShadow: '0 0 30px rgba(74, 222, 128, 0.2)',
                    transform: 'translateY(-1px)',
                    '&::before': {
                      left: '100%',
                    }
                  },
                  '&:disabled': {
                    background: 'rgba(17, 24, 39, 0.5)',
                    borderColor: 'rgba(156, 163, 175, 0.2)',
                    color: 'rgba(156, 163, 175, 0.5)',
                  },
                  transition: 'all 0.2s ease'
                }}
                disabled={isLoading}
              >
                {isLoading ? <CircularProgress size={24} sx={{ color: '#4ade80' }} /> : 'Execute Login →'}
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
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.9rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: 2,
                    '& fieldset': {
                      borderColor: 'rgba(74, 222, 128, 0.2)',
                      transition: 'all 0.2s ease',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(74, 222, 128, 0.4)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#4ade80',
                      borderWidth: 1,
                    }
                  },
                  '& .MuiInputLabel-root': {
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.85rem',
                    color: 'rgba(156, 163, 175, 0.7)',
                    '&.Mui-focused': {
                      color: '#4ade80',
                    }
                  }
                }}
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
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.9rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: 2,
                    '& fieldset': {
                      borderColor: 'rgba(74, 222, 128, 0.2)',
                      transition: 'all 0.2s ease',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(74, 222, 128, 0.4)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#4ade80',
                      borderWidth: 1,
                    }
                  },
                  '& .MuiInputLabel-root': {
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.85rem',
                    color: 'rgba(156, 163, 175, 0.7)',
                    '&.Mui-focused': {
                      color: '#4ade80',
                    }
                  }
                }}
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
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.9rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: 2,
                    '& fieldset': {
                      borderColor: 'rgba(74, 222, 128, 0.2)',
                      transition: 'all 0.2s ease',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(74, 222, 128, 0.4)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#4ade80',
                      borderWidth: 1,
                    }
                  },
                  '& .MuiInputLabel-root': {
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.85rem',
                    color: 'rgba(156, 163, 175, 0.7)',
                    '&.Mui-focused': {
                      color: '#4ade80',
                    }
                  }
                }}
              />
              <FormControl
                fullWidth
                margin="normal"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.9rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: 2,
                    '& fieldset': {
                      borderColor: 'rgba(74, 222, 128, 0.2)',
                      transition: 'all 0.2s ease',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(74, 222, 128, 0.4)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#4ade80',
                      borderWidth: 1,
                    }
                  },
                  '& .MuiInputLabel-root': {
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.85rem',
                    color: 'rgba(156, 163, 175, 0.7)',
                    '&.Mui-focused': {
                      color: '#4ade80',
                    }
                  },
                  '& .MuiMenuItem-root': {
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.9rem',
                  }
                }}
              >
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
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '0.9rem',
                      background: 'rgba(0, 0, 0, 0.3)',
                      borderRadius: 2,
                      '& fieldset': {
                        borderColor: 'rgba(74, 222, 128, 0.2)',
                        transition: 'all 0.2s ease',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(74, 222, 128, 0.4)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#4ade80',
                        borderWidth: 1,
                      },
                      '&.Mui-error fieldset': {
                        borderColor: 'rgba(239, 68, 68, 0.5)',
                      }
                    },
                    '& .MuiInputLabel-root': {
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '0.85rem',
                      color: 'rgba(156, 163, 175, 0.7)',
                      '&.Mui-focused': {
                        color: '#4ade80',
                      }
                    },
                    '& .MuiFormHelperText-root': {
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '0.7rem',
                    }
                  }}
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
                          : "Enter the user code provided by your organization"
                  }
                  error={adminCodeValidation?.valid === false}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '0.9rem',
                      background: 'rgba(0, 0, 0, 0.3)',
                      borderRadius: 2,
                      '& fieldset': {
                        borderColor: 'rgba(74, 222, 128, 0.2)',
                        transition: 'all 0.2s ease',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(74, 222, 128, 0.4)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#4ade80',
                        borderWidth: 1,
                      },
                      '&.Mui-error fieldset': {
                        borderColor: 'rgba(239, 68, 68, 0.5)',
                      }
                    },
                    '& .MuiInputLabel-root': {
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '0.85rem',
                      color: 'rgba(156, 163, 175, 0.7)',
                      '&.Mui-focused': {
                        color: '#4ade80',
                      }
                    },
                    '& .MuiFormHelperText-root': {
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '0.7rem',
                    }
                  }}
                />
              )}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{
                  mt: 3,
                  mb: 2,
                  background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.15) 0%, rgba(96, 165, 250, 0.15) 100%)',
                  border: '1px solid rgba(74, 222, 128, 0.3)',
                  borderRadius: 2,
                  py: 1.3,
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  fontFamily: '"JetBrains Mono", monospace',
                  color: '#ffffff',
                  boxShadow: '0 0 20px rgba(74, 222, 128, 0.1)',
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: '-100%',
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(74, 222, 128, 0.2), transparent)',
                    transition: 'left 0.5s ease',
                  },
                  '&:hover': {
                    background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.25) 0%, rgba(96, 165, 250, 0.25) 100%)',
                    borderColor: 'rgba(74, 222, 128, 0.5)',
                    boxShadow: '0 0 30px rgba(74, 222, 128, 0.2)',
                    transform: 'translateY(-1px)',
                    '&::before': {
                      left: '100%',
                    }
                  },
                  '&:disabled': {
                    background: 'rgba(17, 24, 39, 0.5)',
                    borderColor: 'rgba(156, 163, 175, 0.2)',
                    color: 'rgba(156, 163, 175, 0.5)',
                  },
                  transition: 'all 0.2s ease'
                }}
                disabled={isLoading}
              >
                {isLoading ? <CircularProgress size={24} sx={{ color: '#4ade80' }} /> : 'Execute Register →'}
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