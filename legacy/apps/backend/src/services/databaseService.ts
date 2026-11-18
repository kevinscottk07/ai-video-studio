import { getDatabase } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { createError } from '../middleware/errorHandler.js';
import type {
  User,
  UserRole,
  Subscription,
  SubscriptionStatus,
  SubscriptionPlan,
  Project,
  ProjectStatus,
  CreditTransaction,
  CreditPurchase,
  TransactionType,
  GenerationJob,
  JobStatus,
  OperationType,
  MediaAsset,
  CommunityPost,
  Comment,
  Like,
  Share
} from '@ai-video-studio/types';

/**
 * Comprehensive database service providing type-safe access to all entities
 * with proper error handling, logging, and audit trails.
 */
export class DatabaseService {
  private db = getDatabase();

  // ============================================================================
  // USER OPERATIONS
  // ============================================================================

  async createUser(userData: {
    email: string;
    authProviderId: string;
    displayName: string;
    profileImage?: string;
    language?: string;
    timezone?: string;
    role?: UserRole;
  }): Promise<User> {
    try {
      const { data, error } = await this.db
        .from('users')
        .insert({
          email: userData.email,
          auth_provider_id: userData.authProviderId,
          display_name: userData.displayName,
          profile_image: userData.profileImage,
          language: userData.language || 'en',
          timezone: userData.timezone || 'UTC',
          role: userData.role || 'user',
          credit_balance: 0,
          total_credits_ever: 0,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create user:', error);
        throw createError('Failed to create user', 500, 'USER_CREATION_FAILED');
      }

      await this.createAuditLog({
        action: 'CREATE_USER',
        resource: 'users',
        resourceId: data.id,
        newValues: data,
      });

      logger.info('User created successfully', { userId: data.id, email: data.email });
      return this.mapUserFromDb(data);
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    try {
      const { data, error } = await this.db
        .from('users')
        .select('*')
        .eq('id', userId)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        logger.error('Failed to get user by ID:', error);
        throw createError('Failed to get user', 500, 'USER_FETCH_FAILED');
      }

      return this.mapUserFromDb(data);
    } catch (error) {
      logger.error('Error getting user by ID:', error);
      throw error;
    }
  }

  async updateUser(userId: string, updates: {
    displayName?: string;
    profileImage?: string;
    language?: string;
    timezone?: string;
    creditBalance?: number;
    totalCreditsEver?: number;
  }, updatedBy?: string): Promise<User> {
    try {
      // Get current user for audit log
      const currentUser = await this.getUserById(userId);
      if (!currentUser) {
        throw createError('User not found', 404, 'USER_NOT_FOUND');
      }

      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (updates.displayName !== undefined) updateData.display_name = updates.displayName;
      if (updates.profileImage !== undefined) updateData.profile_image = updates.profileImage;
      if (updates.language !== undefined) updateData.language = updates.language;
      if (updates.timezone !== undefined) updateData.timezone = updates.timezone;
      if (updates.creditBalance !== undefined) updateData.credit_balance = updates.creditBalance;
      if (updates.totalCreditsEver !== undefined) updateData.total_credits_ever = updates.totalCreditsEver;

      const { data, error } = await this.db
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        logger.error('Failed to update user:', error);
        throw createError('Failed to update user', 500, 'USER_UPDATE_FAILED');
      }

      await this.createAuditLog({
        userId: updatedBy,
        action: 'UPDATE_USER',
        resource: 'users',
        resourceId: userId,
        oldValues: currentUser,
        newValues: this.mapUserFromDb(data),
      });

      logger.info('User updated successfully', { userId });
      return this.mapUserFromDb(data);
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  async updateLastLogin(userId: string): Promise<void> {
    try {
      const { error } = await this.db
        .from('users')
        .update({
          last_login_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        logger.error('Failed to update last login:', error);
        // Don't throw error for this non-critical operation
      }
    } catch (error) {
      logger.error('Error updating last login:', error);
      // Don't throw error for this non-critical operation
    }
  }

  async softDeleteUser(userId: string, deletedBy?: string): Promise<void> {
    try {
      // Get current user for audit log
      const currentUser = await this.getUserById(userId);
      if (!currentUser) {
        throw createError('User not found', 404, 'USER_NOT_FOUND');
      }

      const { error } = await this.db
        .from('users')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        logger.error('Failed to soft delete user:', error);
        throw createError('Failed to delete user', 500, 'USER_DELETE_FAILED');
      }

      await this.createAuditLog({
        userId: deletedBy,
        action: 'SOFT_DELETE_USER',
        resource: 'users',
        resourceId: userId,
        oldValues: currentUser,
        newValues: { ...currentUser, isActive: false },
      });

      logger.info('User soft deleted successfully', { userId });
    } catch (error) {
      logger.error('Error soft deleting user:', error);
      throw error;
    }
  }

  async getUserByAuthProviderId(authProviderId: string): Promise<User | null> {
    try {
      const { data, error } = await this.db
        .from('users')
        .select('*')
        .eq('auth_provider_id', authProviderId)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        logger.error('Failed to get user by auth provider ID:', error);
        throw createError('Failed to get user', 500, 'USER_FETCH_FAILED');
      }

      return this.mapUserFromDb(data);
    } catch (error) {
      logger.error('Error getting user by auth provider ID:', error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const { data, error } = await this.db
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        logger.error('Failed to get user by email:', error);
        throw createError('Failed to get user', 500, 'USER_FETCH_FAILED');
      }

      return this.mapUserFromDb(data);
    } catch (error) {
      logger.error('Error getting user by email:', error);
      throw error;
    }
  }

  async createSubscription(subscriptionData: {
    userId: string;
    planId: SubscriptionPlan;
    paymentProcessorId: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    creditsIncluded: number;
  }): Promise<Subscription> {
    try {
      const { data, error } = await this.db
        .from('subscriptions')
        .insert({
          user_id: subscriptionData.userId,
          plan_id: subscriptionData.planId,
          payment_processor_id: subscriptionData.paymentProcessorId,
          status: 'active',
          current_period_start: subscriptionData.currentPeriodStart.toISOString(),
          current_period_end: subscriptionData.currentPeriodEnd.toISOString(),
          credits_included: subscriptionData.creditsIncluded,
          credits_used_this_period: 0,
          cancel_at_period_end: false,
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create subscription:', error);
        throw createError('Failed to create subscription', 500, 'SUBSCRIPTION_CREATION_FAILED');
      }

      await this.createAuditLog({
        userId: subscriptionData.userId,
        action: 'CREATE_SUBSCRIPTION',
        resource: 'subscriptions',
        resourceId: data.id,
        newValues: data,
      });

      logger.info('Subscription created successfully', { subscriptionId: data.id, userId: subscriptionData.userId });
      return this.mapSubscriptionFromDb(data);
    } catch (error) {
      logger.error('Error creating subscription:', error);
      throw error;
    }
  }

  async getUserSubscription(userId: string): Promise<Subscription | null> {
    try {
      const { data, error } = await this.db
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        logger.error('Failed to get user subscription:', error);
        throw createError('Failed to get subscription', 500, 'SUBSCRIPTION_FETCH_FAILED');
      }

      return this.mapSubscriptionFromDb(data);
    } catch (error) {
      logger.error('Error getting user subscription:', error);
      throw error;
    }
  }

  // ============================================================================
  // PROJECT OPERATIONS
  // ============================================================================

  async createProject(projectData: {
    userId: string;
    title: string;
    description?: string;
    settings: any;
  }): Promise<Project> {
    try {
      const { data, error } = await this.db
        .from('projects')
        .insert({
          user_id: projectData.userId,
          title: projectData.title,
          description: projectData.description,
          settings: projectData.settings,
          status: 'draft',
          is_public: false,
          community_metrics: { likes: 0, comments: 0, shares: 0, views: 0 },
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create project:', error);
        throw createError('Failed to create project', 500, 'PROJECT_CREATION_FAILED');
      }

      await this.createAuditLog({
        userId: projectData.userId,
        action: 'CREATE_PROJECT',
        resource: 'projects',
        resourceId: data.id,
        newValues: data,
      });

      logger.info('Project created successfully', { projectId: data.id, userId: projectData.userId });
      return this.mapProjectFromDb(data);
    } catch (error) {
      logger.error('Error creating project:', error);
      throw error;
    }
  }

  async getUserProjects(userId: string, filters?: {
    status?: ProjectStatus;
    isPublic?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Project[]> {
    try {
      let query = this.db
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.isPublic !== undefined) {
        query = query.eq('is_public', filters.isPublic);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Failed to get user projects:', error);
        throw createError('Failed to get projects', 500, 'PROJECTS_FETCH_FAILED');
      }

      return data.map((project: any) => this.mapProjectFromDb(project));
    } catch (error) {
      logger.error('Error getting user projects:', error);
      throw error;
    }
  }

  // ============================================================================
  // CREDIT PURCHASE OPERATIONS
  // ============================================================================

  async createCreditPurchase(purchaseData: {
    userId: string;
    amount: number;
    totalCost: number;
    metadata?: any;
  }): Promise<CreditPurchase> {
    try {
      const { data, error } = await this.db
        .from('credit_purchases')
        .insert({
          user_id: purchaseData.userId,
          amount: purchaseData.amount,
          total_cost: purchaseData.totalCost,
          status: 'pending',
          metadata: purchaseData.metadata || {},
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create credit purchase:', error);
        throw createError('Failed to create credit purchase', 500, 'CREDIT_PURCHASE_CREATION_FAILED');
      }

      await this.createAuditLog({
        userId: purchaseData.userId,
        action: 'CREATE_CREDIT_PURCHASE',
        resource: 'credit_purchases',
        resourceId: data.id,
        newValues: data,
      });

      logger.info('Credit purchase created successfully', { 
        purchaseId: data.id, 
        userId: purchaseData.userId,
        amount: purchaseData.amount,
        totalCost: purchaseData.totalCost
      });

      return this.mapCreditPurchaseFromDb(data);
    } catch (error) {
      logger.error('Error creating credit purchase:', error);
      throw error;
    }
  }

  async getCreditPurchaseById(purchaseId: string): Promise<CreditPurchase | null> {
    try {
      const { data, error } = await this.db
        .from('credit_purchases')
        .select('*')
        .eq('id', purchaseId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        logger.error('Failed to get credit purchase by ID:', error);
        throw createError('Failed to get credit purchase', 500, 'CREDIT_PURCHASE_FETCH_FAILED');
      }

      return this.mapCreditPurchaseFromDb(data);
    } catch (error) {
      logger.error('Error getting credit purchase by ID:', error);
      throw error;
    }
  }

  async updateCreditPurchase(purchaseId: string, updates: {
    status?: 'pending' | 'completed' | 'failed';
    paymentProcessorId?: string;
    metadata?: any;
  }): Promise<CreditPurchase> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.paymentProcessorId !== undefined) updateData.payment_processor_id = updates.paymentProcessorId;
      if (updates.metadata !== undefined) updateData.metadata = updates.metadata;

      const { data, error } = await this.db
        .from('credit_purchases')
        .update(updateData)
        .eq('id', purchaseId)
        .select()
        .single();

      if (error) {
        logger.error('Failed to update credit purchase:', error);
        throw createError('Failed to update credit purchase', 500, 'CREDIT_PURCHASE_UPDATE_FAILED');
      }

      logger.info('Credit purchase updated successfully', { purchaseId, updates });
      return this.mapCreditPurchaseFromDb(data);
    } catch (error) {
      logger.error('Error updating credit purchase:', error);
      throw error;
    }
  }

  async getUserCreditPurchases(userId: string, limit = 50, offset = 0): Promise<CreditPurchase[]> {
    try {
      const { data, error } = await this.db
        .from('credit_purchases')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error('Failed to get user credit purchases:', error);
        throw createError('Failed to get credit purchases', 500, 'CREDIT_PURCHASES_FETCH_FAILED');
      }

      return data.map((purchase: any) => this.mapCreditPurchaseFromDb(purchase));
    } catch (error) {
      logger.error('Error getting user credit purchases:', error);
      throw error;
    }
  }

  // ============================================================================
  // CREDIT OPERATIONS
  // ============================================================================

  async createCreditTransaction(transactionData: {
    userId: string;
    type: TransactionType;
    amount: number;
    description: string;
    operationId?: string;
    awsCostCovered?: number;
    platformProfit?: number;
    metadata?: any;
  }): Promise<CreditTransaction> {
    try {
      const { data, error } = await this.db
        .from('credit_transactions')
        .insert({
          user_id: transactionData.userId,
          type: transactionData.type,
          amount: transactionData.amount,
          description: transactionData.description,
          operation_id: transactionData.operationId,
          aws_cost_covered: transactionData.awsCostCovered,
          platform_profit: transactionData.platformProfit,
          metadata: transactionData.metadata || {},
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create credit transaction:', error);
        throw createError('Failed to create credit transaction', 500, 'CREDIT_TRANSACTION_FAILED');
      }

      await this.createAuditLog({
        userId: transactionData.userId,
        action: 'CREATE_CREDIT_TRANSACTION',
        resource: 'credit_transactions',
        resourceId: data.id,
        newValues: data,
      });

      logger.info('Credit transaction created successfully', { 
        transactionId: data.id, 
        userId: transactionData.userId,
        type: transactionData.type,
        amount: transactionData.amount
      });

      return this.mapCreditTransactionFromDb(data);
    } catch (error) {
      logger.error('Error creating credit transaction:', error);
      throw error;
    }
  }

  async getUserCreditHistory(userId: string, limit = 50, offset = 0): Promise<CreditTransaction[]> {
    try {
      const { data, error } = await this.db
        .from('credit_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error('Failed to get credit history:', error);
        throw createError('Failed to get credit history', 500, 'CREDIT_HISTORY_FETCH_FAILED');
      }

      return data.map((transaction: any) => this.mapCreditTransactionFromDb(transaction));
    } catch (error) {
      logger.error('Error getting credit history:', error);
      throw error;
    }
  }

  // ============================================================================
  // GENERATION JOB OPERATIONS
  // ============================================================================

  async createGenerationJob(jobData: {
    projectId: string;
    userId: string;
    operationType: OperationType;
    requestData: any;
    creditsRequired: number;
    estimatedAWSCost: number;
    platformProfit: number;
  }): Promise<GenerationJob> {
    try {
      const { data, error } = await this.db
        .from('generation_jobs')
        .insert({
          project_id: jobData.projectId,
          user_id: jobData.userId,
          operation_type: jobData.operationType,
          request_data: jobData.requestData,
          status: 'queued',
          progress: 0,
          credits_required: jobData.creditsRequired,
          credits_deducted: 0,
          estimated_aws_cost: jobData.estimatedAWSCost,
          platform_profit: jobData.platformProfit,
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create generation job:', error);
        throw createError('Failed to create generation job', 500, 'GENERATION_JOB_CREATION_FAILED');
      }

      await this.createAuditLog({
        userId: jobData.userId,
        action: 'CREATE_GENERATION_JOB',
        resource: 'generation_jobs',
        resourceId: data.id,
        newValues: data,
      });

      logger.info('Generation job created successfully', { 
        jobId: data.id, 
        userId: jobData.userId,
        operationType: jobData.operationType
      });

      return this.mapGenerationJobFromDb(data);
    } catch (error) {
      logger.error('Error creating generation job:', error);
      throw error;
    }
  }

  async updateGenerationJob(jobId: string, updates: {
    status?: JobStatus;
    progress?: number;
    creditsDeducted?: number;
    actualAWSCost?: number;
    resultUrl?: string;
    errorMessage?: string;
    completedAt?: Date;
  }): Promise<GenerationJob> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.progress !== undefined) updateData.progress = updates.progress;
      if (updates.creditsDeducted !== undefined) updateData.credits_deducted = updates.creditsDeducted;
      if (updates.actualAWSCost !== undefined) updateData.actual_aws_cost = updates.actualAWSCost;
      if (updates.resultUrl !== undefined) updateData.result_url = updates.resultUrl;
      if (updates.errorMessage !== undefined) updateData.error_message = updates.errorMessage;
      if (updates.completedAt !== undefined) updateData.completed_at = updates.completedAt.toISOString();

      const { data, error } = await this.db
        .from('generation_jobs')
        .update(updateData)
        .eq('id', jobId)
        .select()
        .single();

      if (error) {
        logger.error('Failed to update generation job:', error);
        throw createError('Failed to update generation job', 500, 'GENERATION_JOB_UPDATE_FAILED');
      }

      logger.info('Generation job updated successfully', { jobId, updates });
      return this.mapGenerationJobFromDb(data);
    } catch (error) {
      logger.error('Error updating generation job:', error);
      throw error;
    }
  }

  // ============================================================================
  // AUDIT LOG OPERATIONS
  // ============================================================================

  private async createAuditLog(logData: {
    userId?: string;
    action: string;
    resource: string;
    resourceId?: string;
    oldValues?: any;
    newValues?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      await this.db
        .from('audit_logs')
        .insert({
          user_id: logData.userId,
          action: logData.action,
          resource: logData.resource,
          resource_id: logData.resourceId,
          old_values: logData.oldValues,
          new_values: logData.newValues,
          ip_address: logData.ipAddress,
          user_agent: logData.userAgent,
        });
    } catch (error) {
      // Don't throw errors for audit log failures to avoid breaking main operations
      logger.error('Failed to create audit log:', error);
    }
  }

  // ============================================================================
  // MAPPING FUNCTIONS (Database to TypeScript types)
  // ============================================================================

  private mapUserFromDb(dbUser: any): User {
    return {
      id: dbUser.id,
      email: dbUser.email,
      authProviderId: dbUser.auth_provider_id,
      displayName: dbUser.display_name,
      profileImage: dbUser.profile_image,
      language: dbUser.language,
      timezone: dbUser.timezone,
      creditBalance: dbUser.credit_balance,
      totalCreditsEver: dbUser.total_credits_ever,
      createdAt: new Date(dbUser.created_at),
      updatedAt: new Date(dbUser.updated_at),
      lastLoginAt: dbUser.last_login_at ? new Date(dbUser.last_login_at) : new Date(),
      isActive: dbUser.is_active,
      role: dbUser.role as UserRole,
    };
  }

  private mapSubscriptionFromDb(dbSubscription: any): Subscription {
    return {
      id: dbSubscription.id,
      userId: dbSubscription.user_id,
      planId: dbSubscription.plan_id as SubscriptionPlan,
      paymentProcessorId: dbSubscription.payment_processor_id,
      status: dbSubscription.status as SubscriptionStatus,
      currentPeriodStart: new Date(dbSubscription.current_period_start),
      currentPeriodEnd: new Date(dbSubscription.current_period_end),
      cancelAtPeriodEnd: dbSubscription.cancel_at_period_end,
      creditsIncluded: dbSubscription.credits_included,
      creditsUsedThisPeriod: dbSubscription.credits_used_this_period,
      createdAt: new Date(dbSubscription.created_at),
      updatedAt: new Date(dbSubscription.updated_at),
    };
  }

  private mapProjectFromDb(dbProject: any): Project {
    return {
      id: dbProject.id,
      userId: dbProject.user_id,
      title: dbProject.title,
      description: dbProject.description,
      settings: dbProject.settings,
      assets: [], // Assets would be loaded separately
      status: dbProject.status as ProjectStatus,
      isPublic: dbProject.is_public,
      communityMetrics: dbProject.community_metrics,
      createdAt: new Date(dbProject.created_at),
      updatedAt: new Date(dbProject.updated_at),
    };
  }

  private mapCreditTransactionFromDb(dbTransaction: any): CreditTransaction {
    return {
      id: dbTransaction.id,
      userId: dbTransaction.user_id,
      type: dbTransaction.type as TransactionType,
      amount: dbTransaction.amount,
      description: dbTransaction.description,
      operationId: dbTransaction.operation_id,
      awsCostCovered: dbTransaction.aws_cost_covered,
      platformProfit: dbTransaction.platform_profit,
      createdAt: new Date(dbTransaction.created_at),
    };
  }

  private mapCreditPurchaseFromDb(dbPurchase: any): CreditPurchase {
    return {
      id: dbPurchase.id,
      userId: dbPurchase.user_id,
      amount: dbPurchase.amount,
      totalCost: dbPurchase.total_cost,
      paymentProcessorId: dbPurchase.payment_processor_id,
      status: dbPurchase.status as 'pending' | 'completed' | 'failed',
      createdAt: new Date(dbPurchase.created_at),
    };
  }

  private mapGenerationJobFromDb(dbJob: any): GenerationJob {
    return {
      id: dbJob.id,
      projectId: dbJob.project_id,
      userId: dbJob.user_id,
      request: dbJob.request_data,
      status: dbJob.status as JobStatus,
      progress: dbJob.progress,
      creditsRequired: dbJob.credits_required,
      creditsDeducted: dbJob.credits_deducted,
      estimatedAWSCost: dbJob.estimated_aws_cost,
      actualAWSCost: dbJob.actual_aws_cost,
      platformProfit: dbJob.platform_profit,
      resultUrl: dbJob.result_url,
      errorMessage: dbJob.error_message,
      createdAt: new Date(dbJob.created_at),
      updatedAt: new Date(dbJob.updated_at),
      completedAt: dbJob.completed_at ? new Date(dbJob.completed_at) : undefined,
    };
  }

  // ============================================================================
  // MEDIA ASSET OPERATIONS
  // ============================================================================

  async getMediaAssetsByIds(assetIds: string[]): Promise<MediaAsset[]> {
    try {
      const { data, error } = await this.db
        .from('media_assets')
        .select('*')
        .in('id', assetIds);

      if (error) {
        logger.error('Database error getting media assets:', error);
        throw createError('Failed to get media assets', 500, 'DATABASE_ERROR');
      }

      return data?.map(this.mapDbMediaAssetToMediaAsset) || [];
    } catch (error) {
      logger.error('Error getting media assets by IDs:', error);
      throw error;
    }
  }

  async createMediaAsset(assetData: {
    projectId: string;
    filename: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    url: string;
    thumbnailUrl?: string;
    metadata?: any;
  }): Promise<MediaAsset> {
    try {
      const { data, error } = await this.db
        .from('media_assets')
        .insert({
          project_id: assetData.projectId,
          filename: assetData.filename,
          original_name: assetData.originalName,
          mime_type: assetData.mimeType,
          size_bytes: assetData.sizeBytes,
          url: assetData.url,
          thumbnail_url: assetData.thumbnailUrl,
          metadata: assetData.metadata || {},
        })
        .select()
        .single();

      if (error) {
        logger.error('Database error creating media asset:', error);
        throw createError('Failed to create media asset', 500, 'DATABASE_ERROR');
      }

      logger.info('Media asset created', {
        assetId: data.id,
        projectId: assetData.projectId,
        filename: assetData.filename,
      });

      return this.mapDbMediaAssetToMediaAsset(data);
    } catch (error) {
      logger.error('Error creating media asset:', error);
      throw error;
    }
  }

  // ============================================================================
  // SUBSCRIPTION OPERATIONS
  // ============================================================================

  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    try {
      const { data, error } = await this.db
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) {
        logger.error('Database error getting subscription plans:', error);
        throw createError('Failed to get subscription plans', 500, 'DATABASE_ERROR');
      }

      return data?.map(this.mapDbSubscriptionPlanToSubscriptionPlan) || [];
    } catch (error) {
      logger.error('Error getting subscription plans:', error);
      throw error;
    }
  }

  async getSubscriptionPlanById(planId: string): Promise<SubscriptionPlan | null> {
    try {
      const { data, error } = await this.db
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        logger.error('Database error getting subscription plan:', error);
        throw createError('Failed to get subscription plan', 500, 'DATABASE_ERROR');
      }

      return this.mapDbSubscriptionPlanToSubscriptionPlan(data);
    } catch (error) {
      logger.error('Error getting subscription plan by ID:', error);
      throw error;
    }
  }

  async getSubscriptionById(subscriptionId: string): Promise<Subscription | null> {
    try {
      const { data, error } = await this.db
        .from('subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        logger.error('Database error getting subscription:', error);
        throw createError('Failed to get subscription', 500, 'DATABASE_ERROR');
      }

      return this.mapDbSubscriptionToSubscription(data);
    } catch (error) {
      logger.error('Error getting subscription by ID:', error);
      throw error;
    }
  }

  async updateSubscription(subscriptionId: string, updates: {
    planId?: string;
    status?: SubscriptionStatus;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd?: boolean;
    creditsIncluded?: number;
    creditsUsedThisPeriod?: number;
    paymentProcessorId?: string;
  }): Promise<Subscription> {
    try {
      const updateData: any = {};
      
      if (updates.planId !== undefined) updateData.plan_id = updates.planId;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.currentPeriodStart !== undefined) updateData.current_period_start = updates.currentPeriodStart.toISOString();
      if (updates.currentPeriodEnd !== undefined) updateData.current_period_end = updates.currentPeriodEnd.toISOString();
      if (updates.cancelAtPeriodEnd !== undefined) updateData.cancel_at_period_end = updates.cancelAtPeriodEnd;
      if (updates.creditsIncluded !== undefined) updateData.credits_included = updates.creditsIncluded;
      if (updates.creditsUsedThisPeriod !== undefined) updateData.credits_used_this_period = updates.creditsUsedThisPeriod;
      if (updates.paymentProcessorId !== undefined) updateData.payment_processor_id = updates.paymentProcessorId;

      const { data, error } = await this.db
        .from('subscriptions')
        .update(updateData)
        .eq('id', subscriptionId)
        .select()
        .single();

      if (error) {
        logger.error('Database error updating subscription:', error);
        throw createError('Failed to update subscription', 500, 'DATABASE_ERROR');
      }

      await this.createAuditLog({
        action: 'UPDATE_SUBSCRIPTION',
        resource: 'subscriptions',
        resourceId: subscriptionId,
        newValues: updateData,
      });

      logger.info('Subscription updated', {
        subscriptionId,
        updates: Object.keys(updates),
      });

      return this.mapDbSubscriptionToSubscription(data);
    } catch (error) {
      logger.error('Error updating subscription:', error);
      throw error;
    }
  }

  async getUserActiveSubscription(userId: string): Promise<Subscription | null> {
    try {
      const { data, error } = await this.db
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No active subscription found
          return null;
        }
        logger.error('Database error getting active subscription:', error);
        throw createError('Failed to get active subscription', 500, 'DATABASE_ERROR');
      }

      return this.mapDbSubscriptionToSubscription(data);
    } catch (error) {
      logger.error('Error getting user active subscription:', error);
      throw error;
    }
  }

  async createSubscription(subscriptionData: {
    userId: string;
    planId: string;
    status?: SubscriptionStatus;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    creditsIncluded: number;
    paymentProcessorId?: string;
  }): Promise<Subscription> {
    try {
      const { data, error } = await this.db
        .from('subscriptions')
        .insert({
          user_id: subscriptionData.userId,
          plan_id: subscriptionData.planId,
          payment_processor_id: subscriptionData.paymentProcessorId,
          status: subscriptionData.status || 'active',
          current_period_start: subscriptionData.currentPeriodStart.toISOString(),
          current_period_end: subscriptionData.currentPeriodEnd.toISOString(),
          credits_included: subscriptionData.creditsIncluded,
          credits_used_this_period: 0,
          cancel_at_period_end: false,
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create subscription:', error);
        throw createError('Failed to create subscription', 500, 'SUBSCRIPTION_CREATION_FAILED');
      }

      await this.createAuditLog({
        userId: subscriptionData.userId,
        action: 'CREATE_SUBSCRIPTION',
        resource: 'subscriptions',
        resourceId: data.id,
        newValues: data,
      });

      logger.info('Subscription created successfully', { subscriptionId: data.id, userId: subscriptionData.userId });
      return this.mapDbSubscriptionToSubscription(data);
    } catch (error) {
      logger.error('Error creating subscription:', error);
      throw error;
    }
  }

  // ============================================================================
  // MAPPING FUNCTIONS
  // ============================================================================

  private mapDbSubscriptionPlanToSubscriptionPlan(dbPlan: any): SubscriptionPlan {
    return {
      id: dbPlan.id,
      name: dbPlan.name,
      price: dbPlan.price,
      interval: dbPlan.interval,
      creditsIncluded: dbPlan.credits_included,
      features: dbPlan.features,
      isActive: dbPlan.is_active,
      createdAt: new Date(dbPlan.created_at),
      updatedAt: new Date(dbPlan.updated_at),
    };
  }

  private mapDbSubscriptionToSubscription(dbSubscription: any): Subscription {
    return {
      id: dbSubscription.id,
      userId: dbSubscription.user_id,
      planId: dbSubscription.plan_id,
      paymentProcessorId: dbSubscription.payment_processor_id,
      status: dbSubscription.status as SubscriptionStatus,
      currentPeriodStart: new Date(dbSubscription.current_period_start),
      currentPeriodEnd: new Date(dbSubscription.current_period_end),
      cancelAtPeriodEnd: dbSubscription.cancel_at_period_end,
      creditsIncluded: dbSubscription.credits_included,
      creditsUsedThisPeriod: dbSubscription.credits_used_this_period,
      createdAt: new Date(dbSubscription.created_at),
      updatedAt: new Date(dbSubscription.updated_at),
    };
  }

  async getUserActiveSubscription(userId: string): Promise<Subscription | null> {
    try {
      const { data, error } = await this.db
        .from('subscriptions')
        .select(`
          *,
          subscription_plans (*)
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No active subscription found
          return null;
        }
        logger.error('Database error getting active subscription:', error);
        throw createError('Failed to get active subscription', 500, 'DATABASE_ERROR');
      }

      return this.mapDbSubscriptionToSubscription(data);
    } catch (error) {
      logger.error('Error getting user active subscription:', error);
      throw error;
    }
  }

  async updateProject(projectId: string, updates: {
    title?: string;
    description?: string;
    settings?: any;
    status?: ProjectStatus;
    isPublic?: boolean;
    communityMetrics?: any;
  }): Promise<Project> {
    try {
      const updateData: any = {};
      
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.settings !== undefined) updateData.settings = updates.settings;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.isPublic !== undefined) updateData.is_public = updates.isPublic;
      if (updates.communityMetrics !== undefined) updateData.community_metrics = updates.communityMetrics;

      const { data, error } = await this.db
        .from('projects')
        .update(updateData)
        .eq('id', projectId)
        .select()
        .single();

      if (error) {
        logger.error('Database error updating project:', error);
        throw createError('Failed to update project', 500, 'DATABASE_ERROR');
      }

      logger.info('Project updated', {
        projectId,
        updates: Object.keys(updates),
      });

      return this.mapDbProjectToProject(data);
    } catch (error) {
      logger.error('Error updating project:', error);
      throw error;
    }
  }

  // ============================================================================
  // MAPPING FUNCTIONS
  // ============================================================================

  private mapDbMediaAssetToMediaAsset(dbAsset: any): MediaAsset {
    return {
      id: dbAsset.id,
      projectId: dbAsset.project_id,
      filename: dbAsset.filename,
      originalName: dbAsset.original_name,
      mimeType: dbAsset.mime_type,
      sizeBytes: parseInt(dbAsset.size_bytes),
      url: dbAsset.url,
      thumbnailUrl: dbAsset.thumbnail_url,
      metadata: dbAsset.metadata,
      createdAt: new Date(dbAsset.created_at),
    };
  }

  private mapDbProjectToProject(dbProject: any): Project {
    return {
      id: dbProject.id,
      userId: dbProject.user_id,
      title: dbProject.title,
      description: dbProject.description,
      settings: dbProject.settings,
      status: dbProject.status as ProjectStatus,
      isPublic: dbProject.is_public,
      communityMetrics: dbProject.community_metrics,
      createdAt: new Date(dbProject.created_at),
      updatedAt: new Date(dbProject.updated_at),
    };
  }

  // ============================================================================
  // PRIVACY AND GDPR COMPLIANCE OPERATIONS
  // ============================================================================

  async getUserCreditTransactions(userId: string): Promise<CreditTransaction[]> {
    return await this.getUserCreditHistory(userId, 1000); // Get all transactions
  }

  async getUserSubscriptions(userId: string): Promise<Subscription[]> {
    try {
      const { data, error } = await this.db
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Failed to get user subscriptions:', error);
        throw createError('Failed to get subscriptions', 500, 'SUBSCRIPTIONS_FETCH_FAILED');
      }

      return data.map((subscription: any) => this.mapDbSubscriptionToSubscription(subscription));
    } catch (error) {
      logger.error('Error getting user subscriptions:', error);
      throw error;
    }
  }

  async getUserCommunityPosts(userId: string): Promise<CommunityPost[]> {
    try {
      const { data, error } = await this.db
        .from('community_posts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Failed to get user community posts:', error);
        return []; // Return empty array if table doesn't exist yet
      }

      return data.map((post: any) => this.mapDbCommunityPostToCommunityPost(post));
    } catch (error) {
      logger.error('Error getting user community posts:', error);
      return [];
    }
  }

  async getUserComments(userId: string): Promise<Comment[]> {
    try {
      const { data, error } = await this.db
        .from('comments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Failed to get user comments:', error);
        return [];
      }

      return data.map((comment: any) => this.mapDbCommentToComment(comment));
    } catch (error) {
      logger.error('Error getting user comments:', error);
      return [];
    }
  }

  async getUserLikes(userId: string): Promise<Like[]> {
    try {
      const { data, error } = await this.db
        .from('likes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Failed to get user likes:', error);
        return [];
      }

      return data.map((like: any) => this.mapDbLikeToLike(like));
    } catch (error) {
      logger.error('Error getting user likes:', error);
      return [];
    }
  }

  async getUserShares(userId: string): Promise<Share[]> {
    try {
      const { data, error } = await this.db
        .from('shares')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Failed to get user shares:', error);
        return [];
      }

      return data.map((share: any) => this.mapDbShareToShare(share));
    } catch (error) {
      logger.error('Error getting user shares:', error);
      return [];
    }
  }

  async getUserGenerationJobs(userId: string): Promise<GenerationJob[]> {
    try {
      const { data, error } = await this.db
        .from('generation_jobs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Failed to get user generation jobs:', error);
        return [];
      }

      return data.map((job: any) => this.mapGenerationJobFromDb(job));
    } catch (error) {
      logger.error('Error getting user generation jobs:', error);
      return [];
    }
  }

  async getUserAuditLogs(userId: string): Promise<any[]> {
    try {
      const { data, error } = await this.db
        .from('audit_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Failed to get user audit logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Error getting user audit logs:', error);
      return [];
    }
  }

  // Data deletion methods for GDPR compliance
  async deleteUserLikes(userId: string): Promise<void> {
    try {
      const { error } = await this.db
        .from('likes')
        .delete()
        .eq('user_id', userId);

      if (error) {
        logger.error('Failed to delete user likes:', error);
        throw createError('Failed to delete user likes', 500, 'USER_LIKES_DELETE_FAILED');
      }

      logger.info('User likes deleted successfully', { userId });
    } catch (error) {
      logger.error('Error deleting user likes:', error);
      throw error;
    }
  }

  async deleteUserShares(userId: string): Promise<void> {
    try {
      const { error } = await this.db
        .from('shares')
        .delete()
        .eq('user_id', userId);

      if (error) {
        logger.error('Failed to delete user shares:', error);
        throw createError('Failed to delete user shares', 500, 'USER_SHARES_DELETE_FAILED');
      }

      logger.info('User shares deleted successfully', { userId });
    } catch (error) {
      logger.error('Error deleting user shares:', error);
      throw error;
    }
  }

  async deleteUserComments(userId: string): Promise<void> {
    try {
      const { error } = await this.db
        .from('comments')
        .delete()
        .eq('user_id', userId);

      if (error) {
        logger.error('Failed to delete user comments:', error);
        throw createError('Failed to delete user comments', 500, 'USER_COMMENTS_DELETE_FAILED');
      }

      logger.info('User comments deleted successfully', { userId });
    } catch (error) {
      logger.error('Error deleting user comments:', error);
      throw error;
    }
  }

  async deleteUserCommunityPosts(userId: string): Promise<void> {
    try {
      const { error } = await this.db
        .from('community_posts')
        .delete()
        .eq('user_id', userId);

      if (error) {
        logger.error('Failed to delete user community posts:', error);
        throw createError('Failed to delete user community posts', 500, 'USER_POSTS_DELETE_FAILED');
      }

      logger.info('User community posts deleted successfully', { userId });
    } catch (error) {
      logger.error('Error deleting user community posts:', error);
      throw error;
    }
  }

  async deleteUserGenerationJobs(userId: string): Promise<void> {
    try {
      const { error } = await this.db
        .from('generation_jobs')
        .delete()
        .eq('user_id', userId);

      if (error) {
        logger.error('Failed to delete user generation jobs:', error);
        throw createError('Failed to delete user generation jobs', 500, 'USER_JOBS_DELETE_FAILED');
      }

      logger.info('User generation jobs deleted successfully', { userId });
    } catch (error) {
      logger.error('Error deleting user generation jobs:', error);
      throw error;
    }
  }

  async deleteUserCreditTransactions(userId: string): Promise<void> {
    try {
      const { error } = await this.db
        .from('credit_transactions')
        .delete()
        .eq('user_id', userId);

      if (error) {
        logger.error('Failed to delete user credit transactions:', error);
        throw createError('Failed to delete user credit transactions', 500, 'USER_TRANSACTIONS_DELETE_FAILED');
      }

      logger.info('User credit transactions deleted successfully', { userId });
    } catch (error) {
      logger.error('Error deleting user credit transactions:', error);
      throw error;
    }
  }

  async deleteUserProjects(userId: string): Promise<void> {
    try {
      // First delete associated media assets
      const projects = await this.getUserProjects(userId);
      for (const project of projects) {
        await this.deleteProjectAssets(project.id);
      }

      // Then delete projects
      const { error } = await this.db
        .from('projects')
        .delete()
        .eq('user_id', userId);

      if (error) {
        logger.error('Failed to delete user projects:', error);
        throw createError('Failed to delete user projects', 500, 'USER_PROJECTS_DELETE_FAILED');
      }

      logger.info('User projects deleted successfully', { userId });
    } catch (error) {
      logger.error('Error deleting user projects:', error);
      throw error;
    }
  }

  async deleteUserSubscriptions(userId: string): Promise<void> {
    try {
      const { error } = await this.db
        .from('subscriptions')
        .delete()
        .eq('user_id', userId);

      if (error) {
        logger.error('Failed to delete user subscriptions:', error);
        throw createError('Failed to delete user subscriptions', 500, 'USER_SUBSCRIPTIONS_DELETE_FAILED');
      }

      logger.info('User subscriptions deleted successfully', { userId });
    } catch (error) {
      logger.error('Error deleting user subscriptions:', error);
      throw error;
    }
  }

  private async deleteProjectAssets(projectId: string): Promise<void> {
    try {
      const { error } = await this.db
        .from('media_assets')
        .delete()
        .eq('project_id', projectId);

      if (error) {
        logger.error('Failed to delete project assets:', error);
        // Don't throw error, just log it
      }
    } catch (error) {
      logger.error('Error deleting project assets:', error);
      // Don't throw error, just log it
    }
  }

  // Mapping functions for community entities
  private mapDbCommunityPostToCommunityPost(dbPost: any): CommunityPost {
    return {
      id: dbPost.id,
      userId: dbPost.user_id,
      projectId: dbPost.project_id,
      title: dbPost.title,
      description: dbPost.description,
      thumbnailUrl: dbPost.thumbnail_url,
      videoUrl: dbPost.video_url,
      tags: dbPost.tags || [],
      likes: dbPost.likes || 0,
      comments: dbPost.comments || 0,
      shares: dbPost.shares || 0,
      views: dbPost.views || 0,
      isPublic: dbPost.is_public,
      createdAt: new Date(dbPost.created_at),
      updatedAt: new Date(dbPost.updated_at),
    };
  }

  private mapDbCommentToComment(dbComment: any): Comment {
    return {
      id: dbComment.id,
      userId: dbComment.user_id,
      postId: dbComment.post_id,
      content: dbComment.content,
      parentId: dbComment.parent_id,
      likes: dbComment.likes || 0,
      createdAt: new Date(dbComment.created_at),
      updatedAt: new Date(dbComment.updated_at),
    };
  }

  private mapDbLikeToLike(dbLike: any): Like {
    return {
      id: dbLike.id,
      userId: dbLike.user_id,
      postId: dbLike.post_id,
      commentId: dbLike.comment_id,
      createdAt: new Date(dbLike.created_at),
    };
  }

  private mapDbShareToShare(dbShare: any): Share {
    return {
      id: dbShare.id,
      userId: dbShare.user_id,
      postId: dbShare.post_id,
      platform: dbShare.platform,
      createdAt: new Date(dbShare.created_at),
    };
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();