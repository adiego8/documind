import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import store from './store/store';
import { initializeAuth } from './store/slices/authSlice';

import AppLayout from './components/Layout/AppLayout';
import LoginForm from './components/Auth/LoginForm';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import MultiAssistantChat from './components/Chat/MultiAssistantChat';
import AdminDashboard from './components/Admin/AdminDashboard';
import CMSManagement from './components/Admin/CMSManagement';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#4ade80', // green-400
    },
    secondary: {
      main: '#60a5fa', // blue-400
    },
    background: {
      default: '#000000', // black
      paper: '#111827', // gray-900
    },
    text: {
      primary: '#ffffff', // white
      secondary: '#9ca3af', // gray-400
    },
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
  typography: {
    fontFamily: '"JetBrains Mono", "Inconsolata", "Fira Code", monospace',
    body1: {
      fontSize: '0.875rem',
      fontFamily: '"JetBrains Mono", monospace',
      '@media (min-width:600px)': {
        fontSize: '1rem',
      },
    },
    body2: {
      fontFamily: '"JetBrains Mono", monospace',
    },
    h1: {
      fontFamily: '"JetBrains Mono", monospace',
      fontWeight: 700,
    },
    h2: {
      fontFamily: '"JetBrains Mono", monospace',
      fontWeight: 600,
    },
    h3: {
      fontFamily: '"JetBrains Mono", monospace',
      fontWeight: 600,
    },
    h4: {
      fontFamily: '"JetBrains Mono", monospace',
      fontWeight: 500,
    },
    h5: {
      fontFamily: '"JetBrains Mono", monospace',
      fontWeight: 500,
    },
    h6: {
      fontFamily: '"JetBrains Mono", monospace',
      fontWeight: 500,
    },
    button: {
      fontFamily: '"JetBrains Mono", monospace',
      textTransform: 'none',
    },
  },
});

function AppContent() {
  const dispatch = useDispatch();
  const { isAuthenticated, role } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  // Determine default route based on user role
  const getDefaultRoute = () => {
    if (!isAuthenticated) return "/login";
    return role === 'admin' ? "/admin" : "/chat";
  };

  return (
    <Router>
      <AppLayout>
        <Routes>
          <Route 
            path="/login" 
            element={
              isAuthenticated ? <Navigate to={getDefaultRoute()} replace /> : <LoginForm />
            } 
          />
          <Route 
            path="/chat" 
            element={
              <ProtectedRoute>
                <MultiAssistantChat />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/cms" 
            element={
              <ProtectedRoute requireAdmin={true}>
                <CMSManagement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/" 
            element={<Navigate to={getDefaultRoute()} replace />} 
          />
        </Routes>
      </AppLayout>
    </Router>
  );
}

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AppContent />
      </ThemeProvider>
    </Provider>
  );
}

export default App;
