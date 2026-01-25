import { apiClient } from './client';
import { User, CreateUserRequest, UpdateUserRequest, AuthStatus } from '../../types/user';

export const userApi = {
  async getCurrentUser(token: string): Promise<User> {
    const response = await apiClient.get('/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.data.user;
  },

  async createProfile(token: string, userData: CreateUserRequest): Promise<User> {
    const response = await apiClient.post('/auth/profile', userData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.data.user;
  },

  async updateProfile(token: string, updates: UpdateUserRequest): Promise<User> {
    const response = await apiClient.put('/auth/profile', updates, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.data.user;
  },

  async getAuthStatus(token?: string | null): Promise<AuthStatus> {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await apiClient.get('/auth/status', { headers });
    return response.data.data;
  },

  async logout(token?: string | null): Promise<void> {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    await apiClient.post('/auth/logout', {}, { headers });
  },
};