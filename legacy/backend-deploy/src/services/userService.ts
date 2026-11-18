import { databaseService } from './databaseService.js';
import { logger } from '../utils/logger.js';
import { createError } from '../middleware/errorHandler.js';
import type { User, CreateUserRequest, UpdateUserRequest } from '../types/index.js';

export class UserService {

  async createUser(userData: CreateUserRequest): Promise<User> {
    return await databaseService.createUser({
      email: userData.email,
      authProviderId: userData.authProviderId,
      displayName: userData.displayName,
      profileImage: userData.profileImage,
      language: userData.language,
      timezone: userData.timezone,
    });
  }

  async getUserById(userId: string): Promise<User | null> {
    return await databaseService.getUserById(userId);
  }

  async getUserByAuthProviderId(authProviderId: string): Promise<User | null> {
    return await databaseService.getUserByAuthProviderId(authProviderId);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return await databaseService.getUserByEmail(email);
  }

  async updateUser(userId: string, updates: UpdateUserRequest): Promise<User> {
    return await databaseService.updateUser(userId, updates);
  }

  async updateLastLogin(userId: string): Promise<void> {
    await databaseService.updateLastLogin(userId);
  }

  async deleteUser(userId: string): Promise<void> {
    await databaseService.softDeleteUser(userId);
  }

  async findOrCreateUser(authProviderId: string, userData: CreateUserRequest): Promise<User> {
    try {
      // First try to find existing user
      let user = await this.getUserByAuthProviderId(authProviderId);
      
      if (user) {
        // Update last login
        await this.updateLastLogin(user.id);
        return user;
      }

      // Check if user exists by email
      user = await this.getUserByEmail(userData.email);
      
      if (user) {
        // Update auth provider ID for existing user
        const { data, error } = await this.db
          .from('users')
          .update({
            auth_provider_id: authProviderId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id)
          .select()
          .single();

        if (error) {
          logger.error('Failed to update user auth provider ID:', error);
          throw createError('Failed to update user', 500, 'USER_UPDATE_FAILED');
        }

        await this.updateLastLogin(data.id);
        return data;
      }

      // Create new user
      return await this.createUser(userData);
    } catch (error) {
      logger.error('Error in findOrCreateUser:', error);
      throw error;
    }
  }
}