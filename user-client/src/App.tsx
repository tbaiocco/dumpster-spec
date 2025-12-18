import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthProvider } from './contexts/AuthContext';
import { DumpsProvider } from './contexts/DumpsContext';
import { SearchProvider } from './contexts/SearchContext';
import { ToastProvider } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardLayout } from './components/DashboardLayout';
import { LoadingSpinner } from './components/LoadingSpinner';

// Lazy-loaded pages for code splitting
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const SearchPage = lazy(() => import('./pages/SearchPage').then(m => ({ default: m.SearchPage })));
const TrackingPage = lazy(() => import('./pages/TrackingPage').then(m => ({ default: m.TrackingPage })));
const ReviewPage = lazy(() => import('./pages/ReviewPage').then(m => ({ default: m.ReviewPage })));
const FeedbackPage = lazy(() => import('./pages/FeedbackPage').then(m => ({ default: m.FeedbackPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));

/**
 * Loading Fallback Component
 */
const LoadingFallback: React.FC = () => {
  const { t } = useTranslation();
  return <LoadingSpinner size="lg" text={t('app.loading')} />;
};

/**
 * App Component
 * Root component with routing, authentication, and providers
 */
function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <DumpsProvider>
          <SearchProvider>
            <ToastProvider>
              <BrowserRouter>
            <Suspense
              fallback={
                <div className="flex min-h-screen items-center justify-center bg-stone">
                  <LoadingFallback />
                </div>
              }
            >
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<LoginPage />} />

                {/* Protected Routes */}
                <Route element={<ProtectedRoute />}>
                  <Route element={<DashboardLayoutWrapper />}>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/search" element={<SearchPage />} />
                    <Route path="/tracking" element={<TrackingPage />} />
                    <Route path="/review" element={<ReviewPage />} />
                    <Route path="/feedback" element={<FeedbackPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                  </Route>
                </Route>

                {/* Catch-all redirect */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
              </BrowserRouter>
            </ToastProvider>
          </SearchProvider>
        </DumpsProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

/**
 * Dashboard Layout Wrapper
 * Wraps protected routes with DashboardLayout
 */
const DashboardLayoutWrapper: React.FC = () => {
  return (
    <DashboardLayout>
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="md" />
          </div>
        }
      >
        {/* Outlet renders the matched child route */}
        <Outlet />
      </Suspense>
    </DashboardLayout>
  );
};

export default App;
