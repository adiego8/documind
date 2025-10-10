import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  AccountCircle,
  Dashboard as DashboardIcon,
  Chat as ChatIcon,
  Article as ArticleIcon,
} from '@mui/icons-material';
import { logout } from '../../store/slices/authSlice';

const AppLayout = ({ children }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { role, isAuthenticated } = useSelector((state) => state.auth);

  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
    handleClose();
  };

  const handleNavigation = (path) => {
    navigate(path);
    handleClose();
  };

  if (!isAuthenticated) {
    return children;
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar
        position="static"
        elevation={8}
        sx={{
          background: '#000000',
          boxShadow: '0 4px 20px rgba(74, 222, 128, 0.3)',
          borderBottom: '1px solid #4ade80'
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            {/* <img
              src="/logo.png"
              alt="PERSONA Logo"
              style={{
                height: '28px',
                width: 'auto',
                marginRight: '12px',
                borderRadius: '6px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
              }}
            /> */}
            <Box sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: { xs: '1rem', sm: '1.4rem' },
              fontWeight: 700,
              color: '#4ade80',
              letterSpacing: '0.1em',
              display: { xs: 'none', sm: 'block' }
            }}>
              <span style={{ color: '#4ade80' }}>{'>'}</span>
              {' Persona '}
              <span style={{ color: '#4ade80' }}>{'_'}</span>
            </Box>
            <Box sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.9rem',
              fontWeight: 700,
              color: '#4ade80',
              letterSpacing: '0.1em',
              display: { xs: 'block', sm: 'none' }
            }}>
              <span style={{ color: '#4ade80' }}>{'{'}</span>
              {'P'}
              <span style={{ color: '#4ade80' }}>{'}'}</span>
            </Box>
          </Box>

          {role === 'admin' && (
            <>
              <Button
                color="inherit"
                startIcon={<DashboardIcon fontSize="small" />}
                onClick={() => navigate('/admin')}
                size="medium"
                sx={{
                  mr: { xs: 0.5, sm: 1 },
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  px: { xs: 1, sm: 2 },
                  borderRadius: 2,
                  border: '1px solid #4ade80',
                  color: '#4ade80',
                  fontFamily: '"JetBrains Mono", monospace',
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': {
                    background: '#4ade80',
                    color: '#000000',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 20px rgba(74, 222, 128, 0.3)'
                  }
                }}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  Admin
                </Box>
              </Button>
              <Button
                color="inherit"
                startIcon={<ArticleIcon fontSize="small" />}
                onClick={() => navigate('/cms')}
                size="medium"
                sx={{
                  mr: { xs: 0.5, sm: 1 },
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  px: { xs: 1, sm: 2 },
                  borderRadius: 2,
                  border: '1px solid #4ade80',
                  color: '#4ade80',
                  fontFamily: '"JetBrains Mono", monospace',
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': {
                    background: '#4ade80',
                    color: '#000000',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 20px rgba(74, 222, 128, 0.3)'
                  }
                }}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  CMS
                </Box>
              </Button>
            </>
          )}

          <Button
            color="inherit"
            startIcon={<ChatIcon fontSize="small" />}
            onClick={() => navigate('/chat')}
            size="medium"
            sx={{
              mr: { xs: 0.5, sm: 1 },
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              px: { xs: 1, sm: 2 },
              borderRadius: 2,
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.1)',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
              }
            }}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
              Chat
            </Box>
          </Button>

          <div>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
              sx={{
                borderRadius: 2,
                border: '1px solid #4ade80',
                color: '#4ade80',
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  background: '#4ade80',
                  color: '#000000',
                  transform: 'scale(1.05)',
                  boxShadow: '0 0 15px rgba(74, 222, 128, 0.5)'
                }
              }}
            >
              <AccountCircle />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem onClick={handleClose}>
                <Typography variant="body2" color="text.secondary">
                  Role: {role}
                </Typography>
              </MenuItem>
              {role === 'admin' && [
                <MenuItem key="admin" onClick={() => handleNavigation('/admin')}>
                  <DashboardIcon sx={{ mr: 1 }} />
                  Admin Dashboard
                </MenuItem>,
                <MenuItem key="cms" onClick={() => handleNavigation('/cms')}>
                  <ArticleIcon sx={{ mr: 1 }} />
                  Content Management
                </MenuItem>
              ]}
              <MenuItem onClick={() => handleNavigation('/chat')}>
                <ChatIcon sx={{ mr: 1 }} />
                Chat
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                Logout
              </MenuItem>
            </Menu>
          </div>
        </Toolbar>
      </AppBar>

      <Box component="main">
        {children}
      </Box>
    </Box>
  );
};

export default AppLayout;