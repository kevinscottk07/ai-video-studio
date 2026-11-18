import { databaseService } from './databaseService.js';
import { creditService } from './creditService.js';
import { logger } from '../utils/logger.js';
import { createError } from '../middleware/errorHandler.js';
import type {
  AdminDashboardMetrics,
  GetUsersRequest,
  GetUsersResponse,
  UpdateUserRequest,
  UpdateUserResponse,
  GetSystemMetricsRequest,
  GetSystemMetricsResponse,
  PricingConfig,
  UpdatePricingConfigRequest,
  UpdatePricingConfigResponse,
  GetAuditLogsRequest,
  GetAuditLogsResponse,
  AuditLogEntry,
  User,
  UserRole,
  OperationType,
  DateRange,
  PaginationParams,
  SubscriptionPlanDetails
} from '../types/index.js';

/**
 * Admin Service
 * Handles administrative operations, analytics, user management, and system configuration
 */
export class AdminService {

  // ============================================================================
  // DASHBOARD METRICS
  // ============================================================================

  /**
   * Get comprehensive dashboard metrics for admin overview
   */
  async getDashboardMetrics(dateRange?: DateRange): Promise<AdminDashboardMetrics> {
    try {
      const endDate = dateRange?.end || new Date();
      const startDate = dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const previousStartDate = new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime()));

      // Get user metrics
      const userMetrics = await this.getUserMetrics(startDate, endDate, previousStartDate);
      
      // Get revenue metrics
      const revenueMetrics = await this.getRevenueMetrics(startDate, endDate, previousStartDate);
      
      // Get usage metrics
      const usageMetrics = await this.getUsageMetrics(startDate, endDate);
      
      // Get system metrics
      const systemMetrics = await this.getSystemMetrics();

      return {
        users: userMetrics,
        revenue: revenueMetrics,
        usage: usageMetrics,
        system: systemMetrics
      };
    } catch (error) {
      logger.error('Failed to get dashboard metrics:', error);
      throw createError('Failed to retrieve dashboard metrics', 500, 'METRICS_FETCH_FAILED');
    }
  }

  private async getUserMetrics(startDate: Date, endDate: Date, previousStartDate: Date) {
    // Get total users
    const totalUsers = await databaseService.db
      .from('users')
      .select('id', { count: 'exact' })
      .eq('is_active', true);

    // Get active users (logged in within last 30 days)
    const activeUsers = await databaseService.db
      .from('users')
      .select('id', { count: 'exact' })
      .eq('is_active', true)
      .gte('last_login_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    // Get new users in current period
    const newUsers = await databaseService.db
      .from('users')
      .select('id', { count: 'exact' })
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // Get new users in previous period for growth calculation
    const previousNewUsers = await databaseService.db
      .from('users')
      .select('id', { count: 'exact' })
      .gte('created_at', previousStartDate.toISOString())
      .lt('created_at', startDate.toISOString());

    const growth = previousNewUsers.count > 0 
      ? ((newUsers.count - previousNewUsers.count) / previousNewUsers.count) * 100 
      : newUsers.count > 0 ? 100 : 0;

    return {
      total: totalUsers.count || 0,
      active: activeUsers.count || 0,
      new: newUsers.count || 0,
      growth: Math.round(growth * 100) / 100
    };
  }

  private async getRevenueMetrics(startDate: Date, endDate: Date, previousStartDate: Date) {
    // Get credit purchases in current period
    const creditPurchases = await databaseService.db
      .from('credit_transactions')
      .select('amount')
      .eq('type', 'purchase')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // Get subscription revenue (this would need to be calculated based on active subscriptions)
    const subscriptionRevenue = await this.calculateSubscriptionRevenue(startDate, endDate);

    // Get previous period for growth calculation
    const previousCreditPurchases = await databaseService.db
      .from('credit_transactions')
      .select('amount')
      .eq('type', 'purchase')
      .gte('created_at', previousStartDate.toISOString())
      .lt('created_at', startDate.toISOString());

    const previousSubscriptionRevenue = await this.calculateSubscriptionRevenue(previousStartDate, startDate);

    const creditRevenue = creditPurchases.data?.reduce((sum, t) => sum + (t.amount * 0.5), 0) || 0; // Assuming $0.50 per credit
    const totalRevenue = creditRevenue + subscriptionRevenue;
    const previousTotal = (previousCreditPurchases.data?.reduce((sum, t) => sum + (t.amount * 0.5), 0) || 0) + previousSubscriptionRevenue;

    const growth = previousTotal > 0 ? ((totalRevenue - previousTotal) / previousTotal) * 100 : totalRevenue > 0 ? 100 : 0;

    return {
      total: Math.round(totalRevenue * 100), // Convert to cents
      monthly: Math.round(totalRevenue * 100), // This period's revenue
      growth: Math.round(growth * 100) / 100,
      breakdown: {
        subscriptions: Math.round(subscriptionRevenue * 100),
        credits: Math.round(creditRevenue * 100)
      }
    };
  }

  private async calculateSubscriptionRevenue(startDate: Date, endDate: Date): Promise<number> {
    // This would calculate subscription revenue based on active subscriptions
    // For now, returning 0 as subscription service would need to be integrated
    return 0;
  }

  private async getUsageMetrics(startDate: Date, endDate: Date) {
    // Get generation jobs in period
    const generations = await databaseService.db
      .from('generation_jobs')
      .select('credits_deducted, estimated_aws_cost, platform_profit')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .eq('status', 'completed');

    const totalGenerations = generations.data?.length || 0;
    const creditsConsumed = generations.data?.reduce((sum, g) => sum + (g.credits_deducted || 0), 0) || 0;
    const awsCosts = generations.data?.reduce((sum, g) => sum + (g.estimated_aws_cost || 0), 0) || 0;
    const profit = generations.data?.reduce((sum, g) => sum + (g.platform_profit || 0), 0) || 0;

    return {
      totalGenerations,
      creditsConsumed,
      awsCosts: Math.round(awsCosts * 100), // Convert to cents
      profit: Math.round(profit * 100) // Convert to cents
    };
  }

  private async getSystemMetrics() {
    // These would typically come from monitoring services
    // For now, returning mock data
    return {
      uptime: 99.9,
      avgResponseTime: 150,
      errorRate: 0.1,
      activeJobs: await this.getActiveJobsCount()
    };
  }

  private async getActiveJobsCount(): Promise<number> {
    const activeJobs = await databaseService.db
      .from('generation_jobs')
      .select('id', { count: 'exact' })
      .in('status', ['queued', 'processing']);

    return activeJobs.count || 0;
  }

  // ============================================================================
  // USER MANAGEMENT
  // ============================================================================

  /**
   * Get users with filtering and pagination
   */
  async getUsers(request: GetUsersRequest): Promise<GetUsersResponse> {
    try {
      const { filters = {}, pagination = { page: 1, limit: 20 } } = request;
      const offset = (pagination.page - 1) * pagination.limit;

      let query = databaseService.db
        .from('users')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters.role && filters.role.length > 0) {
        query = query.in('role', filters.role);
      }

      if (filters.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }

      if (filters.search) {
        query = query.or(`email.ilike.%${filters.search}%,display_name.ilike.%${filters.search}%`);
      }

      if (filters.dateRange) {
        if (filters.dateRange.start) {
          query = query.gte('created_at', filters.dateRange.start.toISOString());
        }
        if (filters.dateRange.end) {
          query = query.lte('created_at', filters.dateRange.end.toISOString());
        }
      }

      // Apply pagination
      query = query
        .range(offset, offset + pagination.limit - 1)
        .order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        logger.error('Failed to get users:', error);
        throw createError('Failed to retrieve users', 500, 'USERS_FETCH_FAILED');
      }

      const users: User[] = data?.map(user => ({
        id: user.id,
        email: user.email,
        authProviderId: user.auth_provider_id,
        displayName: user.display_name,
        profileImage: user.profile_image,
        language: user.language,
        timezone: user.timezone,
        creditBalance: user.credit_balance,
        totalCreditsEver: user.total_credits_ever,
        createdAt: new Date(user.created_at),
        updatedAt: new Date(user.updated_at),
        lastLoginAt: user.last_login_at ? new Date(user.last_login_at) : undefined,
        isActive: user.is_active,
        role: user.role as UserRole
      })) || [];

      return {
        data: users,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / pagination.limit)
        }
      };
    } catch (error) {
      logger.error('Failed to get users:', error);
      throw error;
    }
  }

  /**
   * Update user details (admin only)
   */
  async updateUser(request: UpdateUserRequest): Promise<UpdateUserResponse> {
    try {
      const { userId, updates } = request;

      // Build update object
      const updateData: any = {};
      if (updates.role !== undefined) updateData.role = updates.role;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      if (updates.creditBalance !== undefined) updateData.credit_balance = updates.creditBalance;
      if (updates.displayName !== undefined) updateData.display_name = updates.displayName;

      updateData.updated_at = new Date().toISOString();

      const { data, error } = await databaseService.db
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        logger.error('Failed to update user:', error);
        throw createError('Failed to update user', 500, 'USER_UPDATE_FAILED');
      }

      const user: User = {
        id: data.id,
        email: data.email,
        authProviderId: data.auth_provider_id,
        displayName: data.display_name,
        profileImage: data.profile_image,
        language: data.language,
        timezone: data.timezone,
        creditBalance: data.credit_balance,
        totalCreditsEver: data.total_credits_ever,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        lastLoginAt: data.last_login_at ? new Date(data.last_login_at) : undefined,
        isActive: data.is_active,
        role: data.role as UserRole
      };

      // Log the admin action
      await this.logAdminAction(
        'user_update',
        'user',
        userId,
        { updates },
        'Admin updated user details'
      );

      return { user };
    } catch (error) {
      logger.error('Failed to update user:', error);
      throw error;
    }
  }

  // ============================================================================
  // PRICING CONFIGURATION
  // ============================================================================

  /**
   * Get current pricing configuration
   */
  async getPricingConfig(): Promise<PricingConfig> {
    try {
      // For now, return default configuration
      // In production, this would be stored in database
      return {
        creditPrice: 50, // 50 cents per credit
        operationCosts: {
          'script_generation': {
            baseCredits: 5,
            multipliers: {
              complexity: 1.0
            }
          },
          'video_generation': {
            baseCredits: 50,
            multipliers: {
              duration: 1.0,
              resolution: 1.5,
              complexity: 2.0
            }
          },
          'music_generation': {
            baseCredits: 10,
            multipliers: {
              duration: 1.0
            }
          }
        },
        subscriptionPlans: [
          {
            id: 'free',
            name: 'Free',
            price: 0,
            creditsIncluded: 10,
            features: ['Basic video generation', 'Standard resolution']
          },
          {
            id: 'starter',
            name: 'Starter',
            price: 1999, // $19.99
            creditsIncluded: 100,
            features: ['Advanced video generation', 'HD resolution', 'Priority support']
          },
          {
            id: 'pro',
            name: 'Pro',
            price: 4999, // $49.99
            creditsIncluded: 300,
            features: ['Premium video generation', '4K resolution', 'Custom branding']
          },
          {
            id: 'ultra',
            name: 'Ultra',
            price: 9999, // $99.99
            creditsIncluded: 1000,
            features: ['Ultra video generation', '8K resolution', 'VR support', 'API access']
          }
        ]
      };
    } catch (error) {
      logger.error('Failed to get pricing config:', error);
      throw createError('Failed to retrieve pricing configuration', 500, 'PRICING_CONFIG_FETCH_FAILED');
    }
  }

  /**
   * Update pricing configuration
   */
  async updatePricingConfig(request: UpdatePricingConfigRequest): Promise<UpdatePricingConfigResponse> {
    try {
      // In production, this would update database configuration
      // For now, we'll simulate the update
      const currentConfig = await this.getPricingConfig();
      const updatedConfig = { ...currentConfig, ...request.config };

      // Log the admin action
      await this.logAdminAction(
        'pricing_update',
        'system',
        'pricing_config',
        { changes: request.config },
        'Admin updated pricing configuration'
      );

      logger.info('Pricing configuration updated', { changes: request.config });

      return { config: updatedConfig };
    } catch (error) {
      logger.error('Failed to update pricing config:', error);
      throw createError('Failed to update pricing configuration', 500, 'PRICING_CONFIG_UPDATE_FAILED');
    }
  }

  // ============================================================================
  // AUDIT LOGGING
  // ============================================================================

  /**
   * Log administrative actions for audit trail
   */
  async logAdminAction(
    action: string,
    resource: string,
    resourceId: string,
    changes: Record<string, any>,
    description: string,
    adminId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      // In production, this would store in audit_logs table
      logger.info('Admin action logged', {
        action,
        resource,
        resourceId,
        changes,
        description,
        adminId,
        ipAddress,
        userAgent,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to log admin action:', error);
      // Don't throw error for logging failures
    }
  }

  /**
   * Get audit logs with filtering and pagination
   */
  async getAuditLogs(request: GetAuditLogsRequest): Promise<GetAuditLogsResponse> {
    try {
      // For now, return empty results
      // In production, this would query audit_logs table
      return {
        data: [],
        pagination: {
          page: request.pagination?.page || 1,
          limit: request.pagination?.limit || 20,
          total: 0,
          totalPages: 0
        }
      };
    } catch (error) {
      logger.error('Failed to get audit logs:', error);
      throw createError('Failed to retrieve audit logs', 500, 'AUDIT_LOGS_FETCH_FAILED');
    }
  }
}

export const adminService = new AdminService();