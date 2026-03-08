import { useAuth0 } from '@auth0/auth0-react';
import { useUser } from './useUser';

/**
 * Simplified auth hook that combines Auth0 and user data
 */
export const useAuth = () => {
  const auth0 = useAuth0();
  const { user, isLoading: userLoading } = useUser();

  return {
    ...auth0,
    user,
    isLoading: auth0.isLoading || userLoading,
  };
};