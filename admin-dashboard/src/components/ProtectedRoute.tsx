import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import apiService from '../services/api.service';

/**
 * Protected Route Component
 * Redirects to login if user is not authenticated or not an admin
 */
export const ProtectedRoute: React.FC = () => {
  const isAuthenticated = apiService.isAuthenticated();
  const isAdmin = apiService.isAdmin();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    // User is authenticated but not an admin - show access denied
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-lg text-gray-600 mb-6">
            You do not have permission to access the admin dashboard.
          </p>
          <p className="text-sm text-gray-500">
            Only users with ADMIN role can access this area.
          </p>
          <button
            onClick={() => {
              apiService.clearTokens();
              window.location.href = '/login';
            }}
            className="mt-8 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
};
