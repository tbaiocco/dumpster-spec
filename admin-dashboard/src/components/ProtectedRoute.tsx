import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import apiService from '../services/api.service';

/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 */
export const ProtectedRoute: React.FC = () => {
  const isAuthenticated = apiService.isAuthenticated();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
