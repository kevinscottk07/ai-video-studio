import { useAuth0 } from '@auth0/auth0-react';
import { Navigate, Outlet } from 'react-router-dom';
import { useUser } from '../../hooks/useUser';
import { LoadingSpinner } from '../ui/LoadingSpinner';

export const AdminRoute = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth0();
  const { user, isLoading: userLoading } = useUser();

  if (authLoading || userLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600 mb-4">
            You don't have permission to access this area.
          </p>
          <a
            href="/dashboard"
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <Outlet />;
};