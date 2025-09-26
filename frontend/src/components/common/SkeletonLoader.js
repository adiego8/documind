import React from 'react';
import { Box, Skeleton, Paper } from '@mui/material';

export const MessageSkeleton = () => (
  <Box sx={{ mb: 3 }}>
    {/* User message skeleton */}
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
      <Paper
        elevation={0}
        sx={{
          maxWidth: '70%',
          p: 2,
          borderRadius: '20px 20px 6px 20px',
          background: 'linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%)'
        }}
      >
        <Skeleton variant="text" width="80%" height={20} />
        <Skeleton variant="text" width="60%" height={20} />
      </Paper>
    </Box>
    
    {/* Bot response skeleton */}
    <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
      <Paper
        elevation={0}
        sx={{
          maxWidth: '70%',
          p: 2,
          borderRadius: '20px 20px 20px 6px',
          background: 'linear-gradient(135deg, #f0f0f0 0%, #e8e8e8 100%)'
        }}
      >
        <Skeleton variant="text" width="100%" height={20} />
        <Skeleton variant="text" width="90%" height={20} />
        <Skeleton variant="text" width="70%" height={20} />
        <Box sx={{ mt: 2 }}>
          <Skeleton variant="rectangular" width="100%" height={40} sx={{ borderRadius: 1 }} />
        </Box>
      </Paper>
    </Box>
  </Box>
);

export const CardSkeleton = ({ height = 200 }) => (
  <Paper
    elevation={4}
    sx={{
      p: 3,
      borderRadius: 3,
      background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)'
    }}
  >
    <Skeleton variant="text" width="60%" height={32} />
    <Skeleton variant="rectangular" width="100%" height={height} sx={{ mt: 2, borderRadius: 2 }} />
    <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
      <Skeleton variant="rectangular" width={80} height={32} sx={{ borderRadius: 1 }} />
      <Skeleton variant="rectangular" width={100} height={32} sx={{ borderRadius: 1 }} />
    </Box>
  </Paper>
);

export const ListSkeleton = ({ items = 5 }) => (
  <Paper
    elevation={4}
    sx={{
      borderRadius: 3,
      overflow: 'hidden'
    }}
  >
    {Array.from({ length: items }).map((_, index) => (
      <Box
        key={index}
        sx={{
          p: 2,
          borderBottom: index < items - 1 ? '1px solid #f0f0f0' : 'none'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Skeleton variant="circular" width={40} height={40} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="40%" height={24} />
            <Skeleton variant="text" width="70%" height={20} />
          </Box>
          <Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: 1 }} />
        </Box>
      </Box>
    ))}
  </Paper>
);