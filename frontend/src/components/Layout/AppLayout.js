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
      <AppBar position="static">
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <img 
              src="/logo.png" 
              alt="DOCUMIND Logo" 
              style={{ 
                height: '32px', 
                width: 'auto', 
                marginRight: '12px' 
              }} 
            />
            <Typography 
              variant="h6"
              component="div" 
              sx={{ 
                fontSize: { xs: '1.1rem', sm: '1.25rem' },
                fontWeight: 600
              }}
            >
              DOCUMIND
            </Typography>
          </Box>
          
          {role === 'admin' && (
            <Button
              color="inherit"
              startIcon={<DashboardIcon fontSize="small" />}
              onClick={() => navigate('/admin')}
              size="medium"
              sx={{ 
                mr: { xs: 0.5, sm: 1 },
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                px: { xs: 1, sm: 2 }
              }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                Admin
              </Box>
            </Button>
          )}
          
          <Button
            color="inherit"
            startIcon={<ChatIcon fontSize="small" />}
            onClick={() => navigate('/chat')}
            size="medium"
            sx={{ 
              mr: { xs: 0.5, sm: 1 },
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              px: { xs: 1, sm: 2 }
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
              {role === 'admin' && (
                <MenuItem onClick={() => handleNavigation('/admin')}>
                  <DashboardIcon sx={{ mr: 1 }} />
                  Admin Dashboard
                </MenuItem>
              )}
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