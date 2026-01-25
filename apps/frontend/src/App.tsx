import { Routes, Route } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { Suspense, useState, useEffect } from 'react';

// Layout components
import { AppLayout } from './components/layout/AppLayout';
import { AuthLayout } from './components/layout/AuthLayout';

// Eager-loaded components (critical path)
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/auth/LoginPage';

// Lazy-loaded components
import {
  LazyDashboardPage,
  LazyProjectsPage,
  LazyProjectDetailPage,
  LazyCommunityPage,
  LazySettingsPage,
  LazyAdminPage,
  LazyBillingPage,
  LazyCreditsPage,
  LazyPrivacyPage
} from './routes/LazyRoutes';

// Components
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminRoute } from './components/auth/AdminRoute';
import { UserProfileSetup } from './components/auth/UserProfileSetup';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

// Hooks
import { useUser } from './hooks/useUser';

// Performance monitoring
import { performanceMonitoring } from './services/performanceMonitoring';

function App() {
  const { isLoading: authLoading, error, isAuthenticated } = useAuth0();
  const { user, isLoading: userLoading } = useUser();
  const [showProfileSetup, setShowProfileSetup] = useState(false);

  // Initialize performance monitoring
  useEffect(() => {
    // Track app initialization time
    const initTime = performance.now();
    performanceMonitoring.recordMetric('APP_INIT_TIME', initTime);
    
    // Track route changes
    const handleRouteChange = () => {
      performanceMonitoring.recordMetric('ROUTE_CHANGE', performance.now(), 'good', {
        url: window.location.href
      });
    };

    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  // Check if user needs to complete profile setup
  useEffect(() => {
    if (isAuthenticated && !userLoading && !user) {
      setShowProfileSetup(true);
    } else if (user) {
      setShowProfileSetup(false);
    }
  }, [isAuthenticated, user, userLoading]);

  if (error) {
    return (
      <ErrorBoundary>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              Authentication Error
            </h1>
            <p className="text-gray-600 mb-4">{error.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
            >
              Retry
            </button>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  if (authLoading) {
    return (
      <ErrorBoundary>
        <div className="flex min-h-screen items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </ErrorBoundary>
    );
  }

  // Show profile setup if user is authenticated but profile doesn't exist
  if (showProfileSetup) {
    return (
      <ErrorBoundary>
        <UserProfileSetup 
          onComplete={() => setShowProfileSetup(false)} 
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingSpinner size="lg" />}>
        <Routes>
          {/* Public routes - eagerly loaded */}
          <Route path="/" element={<HomePage />} />
          
          {/* Auth routes - eagerly loaded */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>

          {/* Protected routes - lazy loaded */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<LazyDashboardPage />} />
              <Route path="/projects" element={<LazyProjectsPage />} />
              <Route path="/projects/:id" element={<LazyProjectDetailPage />} />
              <Route path="/community" element={<LazyCommunityPage />} />
              <Route path="/settings" element={<LazySettingsPage />} />
              <Route path="/billing" element={<LazyBillingPage />} />
              <Route path="/credits" element={<LazyCreditsPage />} />
              <Route path="/privacy" element={<LazyPrivacyPage />} />
              
              {/* Admin routes - lazy loaded */}
              <Route element={<AdminRoute />}>
                <Route path="/admin/*" element={<LazyAdminPage />} />
              </Route>
            </Route>
          </Route>

          {/* 404 route */}
          <Route path="*" element={
            <div className="flex min-h-screen items-center justify-center">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                  404
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Page not found
                </p>
                <a
                  href="/"
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
                >
                  Go Home
                </a>
              </div>
            </div>
          } />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;