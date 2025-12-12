import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardLayout } from './components/DashboardLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { UserListPage } from './pages/users/UserListPage';
import { DumpsPage } from './pages/dumps/DumpsPage';
import { AnalyticsPage } from './pages/analytics/AnalyticsPage';
import { SearchMetricsPage } from './pages/analytics/SearchMetricsPage';
import { AIMetricsPage } from './pages/analytics/AIMetricsPage';
import { UserStatsPage } from './pages/analytics/UserStatsPage';
import { FeatureUsagePage } from './pages/analytics/FeatureUsagePage';
import { ReviewPage } from './pages/ReviewPage';
import { FeedbackPage } from './pages/feedback/FeedbackPage';

/**
 * Main App Component (T088)
 * Configures React Router with navigation menu and protected routes
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route
            path="/dashboard"
            element={
              <DashboardLayout>
                <AnalyticsPage />
              </DashboardLayout>
            }
          />
          <Route
            path="/users"
            element={
              <DashboardLayout>
                <UserListPage />
              </DashboardLayout>
            }
          />
          <Route
            path="/dumps"
            element={
              <DashboardLayout>
                <DumpsPage />
              </DashboardLayout>
            }
          />
          <Route
            path="/reviews"
            element={
              <DashboardLayout>
                <ReviewPage />
              </DashboardLayout>
            }
          />
          <Route
            path="/feedback"
            element={
              <DashboardLayout>
                <FeedbackPage />
              </DashboardLayout>
            }
          />
          <Route
            path="/analytics"
            element={
              <DashboardLayout>
                <AnalyticsPage />
              </DashboardLayout>
            }
          />
          <Route
            path="/analytics/search"
            element={
              <DashboardLayout>
                <SearchMetricsPage />
              </DashboardLayout>
            }
          />
          <Route
            path="/analytics/ai"
            element={
              <DashboardLayout>
                <AIMetricsPage />
              </DashboardLayout>
            }
          />
          <Route
            path="/analytics/users"
            element={
              <DashboardLayout>
                <UserStatsPage />
              </DashboardLayout>
            }
          />
          <Route
            path="/analytics/features"
            element={
              <DashboardLayout>
                <FeatureUsagePage />
              </DashboardLayout>
            }
          />
        </Route>

        {/* Default Redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
