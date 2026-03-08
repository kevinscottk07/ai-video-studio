import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth0 } from '@auth0/auth0-react';
import { userApi } from '../services/api/userApi';
import { User, UpdateUserRequest } from '../types/user';
import { DEMO_MODE, mockUser } from '../config/demo';

export const useUser = () => {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();

  return useQuery({
    queryKey: ['user', 'me'],
    queryFn: async () => {
      if (!isAuthenticated) return null;
      
      // Return mock user in demo mode
      if (DEMO_MODE) {
        return mockUser;
      }
      
      const token = await getAccessTokenSilently();
      return userApi.getCurrentUser(token);
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on 401/403 errors
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return false;
      }
      return failureCount < 3;
    },
  });
};

export const useCreateUserProfile = () => {
  const queryClient = useQueryClient();
  const { getAccessTokenSilently } = useAuth0();

  return useMutation({
    mutationFn: async (userData: {
      email: string;
      displayName: string;
      profileImage?: string;
      language?: string;
      timezone?: string;
    }) => {
      // Return mock user in demo mode
      if (DEMO_MODE) {
        return { ...mockUser, ...userData };
      }
      
      const token = await getAccessTokenSilently();
      return userApi.createProfile(token, userData);
    },
    onSuccess: (user) => {
      // Update the user cache
      queryClient.setQueryData(['user', 'me'], user);
    },
  });
};

export const useUpdateUserProfile = () => {
  const queryClient = useQueryClient();
  const { getAccessTokenSilently } = useAuth0();

  return useMutation({
    mutationFn: async (updates: UpdateUserRequest) => {
      // Return updated mock user in demo mode
      if (DEMO_MODE) {
        const currentUser = queryClient.getQueryData(['user', 'me']) as User || mockUser;
        return { ...currentUser, ...updates };
      }
      
      const token = await getAccessTokenSilently();
      return userApi.updateProfile(token, updates);
    },
    onSuccess: (user) => {
      // Update the user cache
      queryClient.setQueryData(['user', 'me'], user);
    },
  });
};

export const useAuthStatus = () => {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();

  return useQuery({
    queryKey: ['auth', 'status'],
    queryFn: async () => {
      // Return mock auth status in demo mode
      if (DEMO_MODE) {
        return { authenticated: isAuthenticated, user: isAuthenticated ? mockUser : null };
      }
      
      const token = isAuthenticated ? await getAccessTokenSilently() : null;
      return userApi.getAuthStatus(token);
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};