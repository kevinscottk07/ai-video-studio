import { useAuth0 } from '@auth0/auth0-react';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PremiumLoginForm } from '../../components/auth/PremiumLoginForm';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export const LoginPage = () => {
  const { isAuthenticated, isLoading } = useAuth0();
  const location = useLocation();
  const navigate = useNavigate();

  const from = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return <PremiumLoginForm returnTo={from} />;
};