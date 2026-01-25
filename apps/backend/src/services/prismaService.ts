import { getPrisma } from '../config/prisma.js';
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
 * Prisma-based database service providing type-safe access to all entities
 * with proper error handling, logging, and audit trails.
 */
export class PrismaService {
  private prisma = getPrisma();

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
      const user = await this.prisma.user.create({
        data: {
          email: userData.email,
          authProviderId: userData.authProviderId,
          displayName: userData.displayName,
          profileImage: userData.profileImage,
          language: userData.language || 'en',
          timezone: userData.timezone || 'UTC',
          role: userData.role || 'user',
          creditBalance: 0,
          totalCreditsEver: 0,
          isActive: true,
        },
      });

      await this.createAuditLog({
        action: 'CREATE_USER',
        resource: 'users',
        resourceId: user.id,
        newValues: user,
      });

      logger.info('User created successfully', { userId: user.id, email: user.email });
      return this.mapUserFromPrisma(user);
    } catch (error) {
      logger.error('Error creating user:', error);
      throw createError('Failed to create user', 500, 'USER_CREATION_FAILED');
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          id: userId,
          isActive: true,
        },
      });

      return user ? this.mapUserFromPrisma(user) : null;
    } catch (error) {
      logger.error('Error getting user by ID:', error);
      throw createError('Failed to get user', 500, 'USER_FETCH_FAILED');
    }
  }

  async getUserByAuthProviderId(authProviderId: string): Promise<User | null> {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          authProviderId,
          isActive: true,
        },
      });

      return user ? this.mapUserFromPrisma(user) : null;
    } catch (error) {
      logger.error('Error getting user by auth provider ID:', error);
      throw createError('Failed to get user', 500, 'USER_FETCH_FAILED');
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          email,
          isActive: true,
        },
      });

      return user ? this.mapUserFromPrisma(user) : null;
    } catch (error) {
      logger.error('Error getting user by email:', error);
      throw createError('Failed to get user', 500, 'USER_FETCH_FAILED');
    }
  }

  async updateUser(userId: string, updates: {
    displayName?: string;
    profileImage?: string;
    language?: string;
    timezone?: string;
  }, updatedBy?: string): Promise<User> {
    try {
      // Get current user for audit log
      const currentUser = await this.getUserById(userId);
      if (!currentUser) {
        throw createError('User not found', 404, 'USER_NOT_FOUND');
      }

      const user = await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
      });

      await this.createAuditLog({
        userId: updatedBy,
        action: 'UPDATE_USER',
        resource: 'users',
        resourceId: userId,
        oldValues: currentUser,
        newValues: this.mapUserFromPrisma(user),
      });

      logger.info('User updated successfully', { userId });
      return this.mapUserFromPrisma(user);
    } catch (error) {
      logger.error('Error updating user:', error);
      throw createError('Failed to update user', 500, 'USER_UPDATE_FAILED');
    }
  }

  async updateLastLogin(userId: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        },
      });
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

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

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
      throw createError('Failed to delete user', 500, 'USER_DELETE_FAILED');
    }
  }

  // ============================================================================
  // SUBSCRIPTION OPERATIONS
  // ============================================================================

  async createSubscription(subscriptionData: {
    userId: string;
    planId: SubscriptionPlan;
    paymentProcessorId: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    creditsIncluded: number;
  }): Promise<Subscription> {
    try {
      const subscription = await this.prisma.subscription.create({
        data: {
          userId: subscriptionData.userId,
          planId: subscriptionData.planId,
          paymentProcessorId: subscriptionData.paymentProcessorId,
          status: 'active',
          currentPeriodStart: subscriptionData.currentPeriodStart,
          currentPeriodEnd: subscriptionData.currentPeriodEnd,
          creditsIncluded: subscriptionData.creditsIncluded,
          creditsUsedThisPeriod: 0,
          cancelAtPeriodEnd: false,
        },
        include: {
          user: true,
          plan: true,
        },
      });

      await this.createAuditLog({
        userId: subscriptionData.userId,
        action: 'CREATE_SUBSCRIPTION',
        resource: 'subscriptions',
        resourceId: subscription.id,
        newValues: subscription,
      });

      logger.info('Subscription created successfully', { 
        subscriptionId: subscription.id, 
        userId: subscriptionData.userId 
      });
      
      return this.mapSubscriptionFromPrisma(subscription);
    } catch (error) {
      logger.error('Error creating subscription:', error);
      throw createError('Failed to create subscription', 500, 'SUBSCRIPTION_CREATION_FAILED');
    }
  }

  async getUserSubscription(userId: string): Promise<Subscription | null> {
    try {
      const subscription = await this.prisma.subscription.findFirst({
        where: {
          userId,
          status: 'active',
        },
        include: {
          user: true,
          plan: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return subscription ? this.mapSubscriptionFromPrisma(subscription) : null;
    } catch (error) {
      logger.error('Error getting user subscription:', error);
      throw createError('Failed to get subscription', 500, 'SUBSCRIPTION_FETCH_FAILED');
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
      const project = await this.prisma.project.create({
        data: {
          userId: projectData.userId,
          title: projectData.title,
          description: projectData.description,
          settings: projectData.settings,
          status: 'draft',
          isPublic: false,
          communityMetrics: { likes: 0, comments: 0, shares: 0, views: 0 },
        },
        include: {
          user: true,
          mediaAssets: true,
        },
      });

      await this.createAuditLog({
        userId: projectData.userId,
        action: 'CREATE_PROJECT',
        resource: 'projects',
        resourceId: project.id,
        newValues: project,
      });

      logger.info('Project created successfully', { 
        projectId: project.id, 
        userId: projectData.userId 
      });
      
      return this.mapProjectFromPrisma(project);
    } catch (error) {
      logger.error('Error creating project:', error);
      throw createError('Failed to create project', 500, 'PROJECT_CREATION_FAILED');
    }
  }

  async getUserProjects(userId: string, filters?: {
    status?: ProjectStatus;
    isPublic?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Project[]> {
    try {
      const where: any = { userId };

      if (filters?.status) {
        where.status = filters.status;
      }

      if (filters?.isPublic !== undefined) {
        where.isPublic = filters.isPublic;
      }

      const projects = await this.prisma.project.findMany({
        where,
        include: {
          user: true,
          mediaAssets: true,
        },
        orderBy: {
          updatedAt: 'desc',
        },
        take: filters?.limit,
        skip: filters?.offset,
      });

      return projects.map(project => this.mapProjectFromPrisma(project));
    } catch (error) {
      logger.error('Error getting user projects:', error);
      throw createError('Failed to get projects', 500, 'PROJECTS_FETCH_FAILED');
    }
  }

  async updateProject(projectId: string, updates: {
    title?: string;
    description?: string;
    settings?: any;
    status?: ProjectStatus;
    isPublic?: boolean;
  }, updatedBy?: string): Promise<Project> {
    try {
      const project = await this.prisma.project.update({
        where: { id: projectId },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
        include: {
          user: true,
          mediaAssets: true,
        },
      });

      await this.createAuditLog({
        userId: updatedBy,
        action: 'UPDATE_PROJECT',
        resource: 'projects',
        resourceId: projectId,
        newValues: project,
      });

      logger.info('Project updated successfully', { projectId });
      return this.mapProjectFromPrisma(project);
    } catch (error) {
      logger.error('Error updating project:', error);
      throw createError('Failed to update project', 500, 'PROJECT_UPDATE_FAILED');
    }
  }

  async deleteProject(projectId: string, deletedBy?: string): Promise<void> {
    try {
      // Get project for audit log
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        include: { user: true, mediaAssets: true },
      });

      if (!project) {
        throw createError('Project not found', 404, 'PROJECT_NOT_FOUND');
      }

      // Delete project (cascade will handle related records)
      await this.prisma.project.delete({
        where: { id: projectId },
      });

      await this.createAuditLog({
        userId: deletedBy,
        action: 'DELETE_PROJECT',
        resource: 'projects',
        resourceId: projectId,
        oldValues: project,
      });

      logger.info('Project deleted successfully', { projectId });
    } catch (error) {
      logger.error('Error deleting project:', error);
      throw createError('Failed to delete project', 500, 'PROJECT_DELETE_FAILED');
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
      const transaction = await this.prisma.creditTransaction.create({
        data: {
          userId: transactionData.userId,
          type: transactionData.type,
          amount: transactionData.amount,
          description: transactionData.description,
          operationId: transactionData.operationId,
          awsCostCovered: transactionData.awsCostCovered,
          platformProfit: transactionData.platformProfit,
          metadata: transactionData.metadata || {},
        },
        include: {
          user: true,
        },
      });

      // Update user credit balance
      await this.prisma.user.update({
        where: { id: transactionData.userId },
        data: {
          creditBalance: {
            increment: transactionData.amount,
          },
          totalCreditsEver: transactionData.type === 'purchase' || transactionData.type === 'subscription_grant'
            ? { increment: transactionData.amount }
            : undefined,
        },
      });

      await this.createAuditLog({
        userId: transactionData.userId,
        action: 'CREATE_CREDIT_TRANSACTION',
        resource: 'credit_transactions',
        resourceId: transaction.id,
        newValues: transaction,
      });

      logger.info('Credit transaction created successfully', { 
        transactionId: transaction.id, 
        userId: transactionData.userId,
        type: transactionData.type,
        amount: transactionData.amount
      });

      return this.mapCreditTransactionFromPrisma(transaction);
    } catch (error) {
      logger.error('Error creating credit transaction:', error);
      throw createError('Failed to create credit transaction', 500, 'CREDIT_TRANSACTION_FAILED');
    }
  }

  async getUserCreditHistory(userId: string, limit = 50, offset = 0): Promise<CreditTransaction[]> {
    try {
      const transactions = await this.prisma.creditTransaction.findMany({
        where: { userId },
        include: { user: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      return transactions.map(transaction => this.mapCreditTransactionFromPrisma(transaction));
    } catch (error) {
      logger.error('Error getting credit history:', error);
      throw createError('Failed to get credit history', 500, 'CREDIT_HISTORY_FETCH_FAILED');
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
      const job = await this.prisma.generationJob.create({
        data: {
          projectId: jobData.projectId,
          userId: jobData.userId,
          operationType: jobData.operationType,
          requestData: jobData.requestData,
          status: 'queued',
          progress: 0,
          creditsRequired: jobData.creditsRequired,
          creditsDeducted: 0,
          estimatedAwsCost: jobData.estimatedAWSCost,
          platformProfit: jobData.platformProfit,
        },
        include: {
          project: true,
          user: true,
        },
      });

      await this.createAuditLog({
        userId: jobData.userId,
        action: 'CREATE_GENERATION_JOB',
        resource: 'generation_jobs',
        resourceId: job.id,
        newValues: job,
      });

      logger.info('Generation job created successfully', { 
        jobId: job.id, 
        userId: jobData.userId,
        operationType: jobData.operationType
      });

      return this.mapGenerationJobFromPrisma(job);
    } catch (error) {
      logger.error('Error creating generation job:', error);
      throw createError('Failed to create generation job', 500, 'GENERATION_JOB_CREATION_FAILED');
    }
  }

  async updateGenerationJob(jobId: string, updates: {
    status?: JobStatus;
    progress?: number;
    creditsDeducted?: number;
    actualAwsCost?: number;
    resultUrl?: string;
    errorMessage?: string;
    completedAt?: Date;
  }): Promise<GenerationJob> {
    try {
      const job = await this.prisma.generationJob.update({
        where: { id: jobId },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
        include: {
          project: true,
          user: true,
        },
      });

      logger.info('Generation job updated successfully', { jobId, updates });
      return this.mapGenerationJobFromPrisma(job);
    } catch (error) {
      logger.error('Error updating generation job:', error);
      throw createError('Failed to update generation job', 500, 'GENERATION_JOB_UPDATE_FAILED');
    }
  }

  async getGenerationJob(jobId: string): Promise<GenerationJob | null> {
    try {
      const job = await this.prisma.generationJob.findUnique({
        where: { id: jobId },
        include: {
          project: true,
          user: true,
        },
      });

      return job ? this.mapGenerationJobFromPrisma(job) : null;
    } catch (error) {
      logger.error('Error getting generation job:', error);
      throw createError('Failed to get generation job', 500, 'GENERATION_JOB_FETCH_FAILED');
    }
  }

  // ============================================================================
  // MEDIA ASSET OPERATIONS
  // ============================================================================

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
      const asset = await this.prisma.mediaAsset.create({
        data: {
          projectId: assetData.projectId,
          filename: assetData.filename,
          originalName: assetData.originalName,
          mimeType: assetData.mimeType,
          sizeBytes: assetData.sizeBytes,
          url: assetData.url,
          thumbnailUrl: assetData.thumbnailUrl,
          metadata: assetData.metadata || {},
        },
        include: {
          project: true,
        },
      });

      logger.info('Media asset created successfully', { 
        assetId: asset.id, 
        projectId: assetData.projectId 
      });

      return this.mapMediaAssetFromPrisma(asset);
    } catch (error) {
      logger.error('Error creating media asset:', error);
      throw createError('Failed to create media asset', 500, 'MEDIA_ASSET_CREATION_FAILED');
    }
  }

  async getProjectAssets(projectId: string): Promise<MediaAsset[]> {
    try {
      const assets = await this.prisma.mediaAsset.findMany({
        where: { projectId },
        include: { project: true },
        orderBy: { createdAt: 'desc' },
      });

      return assets.map(asset => this.mapMediaAssetFromPrisma(asset));
    } catch (error) {
      logger.error('Error getting project assets:', error);
      throw createError('Failed to get project assets', 500, 'MEDIA_ASSETS_FETCH_FAILED');
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
      await this.prisma.auditLog.create({
        data: {
          userId: logData.userId,
          action: logData.action,
          resource: logData.resource,
          resourceId: logData.resourceId,
          oldValues: logData.oldValues,
          newValues: logData.newValues,
          ipAddress: logData.ipAddress,
          userAgent: logData.userAgent,
        },
      });
    } catch (error) {
      // Don't throw errors for audit log failures to avoid breaking main operations
      logger.error('Failed to create audit log:', error);
    }
  }

  // ============================================================================
  // MAPPING FUNCTIONS (Prisma to TypeScript types)
  // ============================================================================

  private mapUserFromPrisma(prismaUser: any): User {
    return {
      id: prismaUser.id,
      email: prismaUser.email,
      authProviderId: prismaUser.authProviderId,
      displayName: prismaUser.displayName,
      profileImage: prismaUser.profileImage,
      language: prismaUser.language,
      timezone: prismaUser.timezone,
      creditBalance: prismaUser.creditBalance,
      totalCreditsEver: prismaUser.totalCreditsEver,
      createdAt: prismaUser.createdAt,
      updatedAt: prismaUser.updatedAt,
      lastLoginAt: prismaUser.lastLoginAt || new Date(),
      isActive: prismaUser.isActive,
      role: prismaUser.role as UserRole,
    };
  }

  private mapSubscriptionFromPrisma(prismaSubscription: any): Subscription {
    return {
      id: prismaSubscription.id,
      userId: prismaSubscription.userId,
      planId: prismaSubscription.planId as SubscriptionPlan,
      paymentProcessorId: prismaSubscription.paymentProcessorId,
      status: prismaSubscription.status as SubscriptionStatus,
      currentPeriodStart: prismaSubscription.currentPeriodStart,
      currentPeriodEnd: prismaSubscription.currentPeriodEnd,
      cancelAtPeriodEnd: prismaSubscription.cancelAtPeriodEnd,
      creditsIncluded: prismaSubscription.creditsIncluded,
      creditsUsedThisPeriod: prismaSubscription.creditsUsedThisPeriod,
      createdAt: prismaSubscription.createdAt,
      updatedAt: prismaSubscription.updatedAt,
    };
  }

  private mapProjectFromPrisma(prismaProject: any): Project {
    return {
      id: prismaProject.id,
      userId: prismaProject.userId,
      title: prismaProject.title,
      description: prismaProject.description,
      settings: prismaProject.settings,
      assets: prismaProject.mediaAssets ? prismaProject.mediaAssets.map((asset: any) => this.mapMediaAssetFromPrisma(asset)) : [],
      status: prismaProject.status as ProjectStatus,
      isPublic: prismaProject.isPublic,
      communityMetrics: prismaProject.communityMetrics,
      createdAt: prismaProject.createdAt,
      updatedAt: prismaProject.updatedAt,
    };
  }

  private mapCreditTransactionFromPrisma(prismaTransaction: any): CreditTransaction {
    return {
      id: prismaTransaction.id,
      userId: prismaTransaction.userId,
      type: prismaTransaction.type as TransactionType,
      amount: prismaTransaction.amount,
      description: prismaTransaction.description,
      operationId: prismaTransaction.operationId,
      awsCostCovered: prismaTransaction.awsCostCovered,
      platformProfit: prismaTransaction.platformProfit,
      createdAt: prismaTransaction.createdAt,
    };
  }

  private mapGenerationJobFromPrisma(prismaJob: any): GenerationJob {
    return {
      id: prismaJob.id,
      projectId: prismaJob.projectId,
      userId: prismaJob.userId,
      request: prismaJob.requestData,
      status: prismaJob.status as JobStatus,
      progress: prismaJob.progress,
      creditsRequired: prismaJob.creditsRequired,
      creditsDeducted: prismaJob.creditsDeducted,
      estimatedAWSCost: prismaJob.estimatedAwsCost,
      actualAWSCost: prismaJob.actualAwsCost,
      platformProfit: prismaJob.platformProfit,
      resultUrl: prismaJob.resultUrl,
      errorMessage: prismaJob.errorMessage,
      createdAt: prismaJob.createdAt,
      updatedAt: prismaJob.updatedAt,
      completedAt: prismaJob.completedAt,
    };
  }

  private mapMediaAssetFromPrisma(prismaAsset: any): MediaAsset {
    return {
      id: prismaAsset.id,
      projectId: prismaAsset.projectId,
      filename: prismaAsset.filename,
      originalName: prismaAsset.originalName,
      mimeType: prismaAsset.mimeType,
      sizeBytes: Number(prismaAsset.sizeBytes),
      url: prismaAsset.url,
      thumbnailUrl: prismaAsset.thumbnailUrl,
      metadata: prismaAsset.metadata,
      createdAt: prismaAsset.createdAt,
    };
  }
}

// Export singleton instance
export const prismaService = new PrismaService();