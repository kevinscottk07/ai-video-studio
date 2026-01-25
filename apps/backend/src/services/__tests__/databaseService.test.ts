import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DatabaseService } from '../databaseService.js';
import { getDatabase } from '../../config/database.js';
import { logger } from '../../utils/logger.js';
import type { UserRole, SubscriptionPlan, ProjectStatus, TransactionType, OperationType } from '@ai-video-studio/types';

// Mock dependencies
vi.mock('../../config/database.js');
vi.mock('../../utils/logger.js');

const mockDb = {
  from: vi.fn(),
};

const mockQuery = {
  insert: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  eq: vi.fn(),
  single: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
  range: vi.fn(),
};

describe('DatabaseService', () => {
  let databaseService: DatabaseService;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock database
    (getDatabase as any).mockReturnValue(mockDb);
    mockDb.from.mockReturnValue(mockQuery);
    
    // Chain mock methods
    mockQuery.insert.mockReturnValue(mockQuery);
    mockQuery.select.mockReturnValue(mockQuery);
    mockQuery.update.mockReturnValue(mockQuery);
    mockQuery.delete.mockReturnValue(mockQuery);
    mockQuery.eq.mockReturnValue(mockQuery);
    mockQuery.single.mockReturnValue(mockQuery);
    mockQuery.order.mockReturnValue(mockQuery);
    mockQuery.limit.mockReturnValue(mockQuery);
    mockQuery.range.mockReturnValue(mockQuery);

    databaseService = new DatabaseService();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('User Operations', () => {
    const mockUserData = {
      email: 'test@example.com',
      authProviderId: 'auth0|123456',
      displayName: 'Test User',
      profileImage: 'https://example.com/avatar.jpg',
      language: 'en',
      timezone: 'UTC',
      role: 'user' as UserRole,
    };

    const mockDbUser = {
      id: 'user-123',
      email: 'test@example.com',
      auth_provider_id: 'auth0|123456',
      display_name: 'Test User',
      profile_image: 'https://example.com/avatar.jpg',
      language: 'en',
      timezone: 'UTC',
      credit_balance: 0,
      total_credits_ever: 0,
      role: 'user',
      is_active: true,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      last_login_at: '2023-01-01T00:00:00Z',
    };

    it('should create a user successfully', async () => {
      mockQuery.single.mockResolvedValue({ data: mockDbUser, error: null });

      const result = await databaseService.createUser(mockUserData);

      expect(mockDb.from).toHaveBeenCalledWith('users');
      expect(mockQuery.insert).toHaveBeenCalledWith({
        email: mockUserData.email,
        auth_provider_id: mockUserData.authProviderId,
        display_name: mockUserData.displayName,
        profile_image: mockUserData.profileImage,
        language: mockUserData.language,
        timezone: mockUserData.timezone,
        role: mockUserData.role,
        credit_balance: 0,
        total_credits_ever: 0,
        is_active: true,
      });

      expect(result).toEqual({
        id: mockDbUser.id,
        email: mockDbUser.email,
        authProviderId: mockDbUser.auth_provider_id,
        displayName: mockDbUser.display_name,
        profileImage: mockDbUser.profile_image,
        language: mockDbUser.language,
        timezone: mockDbUser.timezone,
        creditBalance: mockDbUser.credit_balance,
        totalCreditsEver: mockDbUser.total_credits_ever,
        role: mockDbUser.role,
        isActive: mockDbUser.is_active,
        createdAt: new Date(mockDbUser.created_at),
        updatedAt: new Date(mockDbUser.updated_at),
        lastLoginAt: new Date(mockDbUser.last_login_at),
      });
    });

    it('should handle user creation error', async () => {
      const error = { message: 'Database error', code: 'DB_ERROR' };
      mockQuery.single.mockResolvedValue({ data: null, error });

      await expect(databaseService.createUser(mockUserData)).rejects.toThrow('Failed to create user');
      expect(logger.error).toHaveBeenCalledWith('Failed to create user:', error);
    });

    it('should get user by ID successfully', async () => {
      mockQuery.single.mockResolvedValue({ data: mockDbUser, error: null });

      const result = await databaseService.getUserById('user-123');

      expect(mockDb.from).toHaveBeenCalledWith('users');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'user-123');
      expect(mockQuery.eq).toHaveBeenCalledWith('is_active', true);
      expect(result).toBeDefined();
      expect(result?.id).toBe('user-123');
    });

    it('should return null when user not found', async () => {
      const error = { code: 'PGRST116' }; // Supabase "not found" error
      mockQuery.single.mockResolvedValue({ data: null, error });

      const result = await databaseService.getUserById('nonexistent');

      expect(result).toBeNull();
    });

    it('should update user successfully', async () => {
      const updates = {
        displayName: 'Updated Name',
        language: 'es',
      };

      // Mock getting current user
      mockQuery.single
        .mockResolvedValueOnce({ data: mockDbUser, error: null }) // getUserById call
        .mockResolvedValueOnce({ data: { ...mockDbUser, ...updates }, error: null }); // update call

      const result = await databaseService.updateUser('user-123', updates);

      expect(mockQuery.update).toHaveBeenCalledWith({
        display_name: updates.displayName,
        profile_image: undefined,
        language: updates.language,
        timezone: undefined,
        updated_at: expect.any(String),
      });

      expect(result.displayName).toBe(updates.displayName);
    });
  });

  describe('Subscription Operations', () => {
    const mockSubscriptionData = {
      userId: 'user-123',
      planId: 'pro' as SubscriptionPlan,
      paymentProcessorId: 'stripe_sub_123',
      currentPeriodStart: new Date('2023-01-01'),
      currentPeriodEnd: new Date('2023-02-01'),
      creditsIncluded: 500,
    };

    const mockDbSubscription = {
      id: 'sub-123',
      user_id: 'user-123',
      plan_id: 'pro',
      payment_processor_id: 'stripe_sub_123',
      status: 'active',
      current_period_start: '2023-01-01T00:00:00Z',
      current_period_end: '2023-02-01T00:00:00Z',
      credits_included: 500,
      credits_used_this_period: 0,
      cancel_at_period_end: false,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    };

    it('should create subscription successfully', async () => {
      mockQuery.single.mockResolvedValue({ data: mockDbSubscription, error: null });

      const result = await databaseService.createSubscription(mockSubscriptionData);

      expect(mockDb.from).toHaveBeenCalledWith('subscriptions');
      expect(mockQuery.insert).toHaveBeenCalledWith({
        user_id: mockSubscriptionData.userId,
        plan_id: mockSubscriptionData.planId,
        payment_processor_id: mockSubscriptionData.paymentProcessorId,
        status: 'active',
        current_period_start: mockSubscriptionData.currentPeriodStart.toISOString(),
        current_period_end: mockSubscriptionData.currentPeriodEnd.toISOString(),
        credits_included: mockSubscriptionData.creditsIncluded,
        credits_used_this_period: 0,
        cancel_at_period_end: false,
      });

      expect(result.id).toBe(mockDbSubscription.id);
      expect(result.planId).toBe(mockSubscriptionData.planId);
    });

    it('should get user subscription successfully', async () => {
      mockQuery.single.mockResolvedValue({ data: mockDbSubscription, error: null });

      const result = await databaseService.getUserSubscription('user-123');

      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'active');
      expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result).toBeDefined();
      expect(result?.userId).toBe('user-123');
    });
  });

  describe('Project Operations', () => {
    const mockProjectData = {
      userId: 'user-123',
      title: 'Test Project',
      description: 'A test project',
      settings: { resolution: 'hd', duration: 60 },
    };

    const mockDbProject = {
      id: 'project-123',
      user_id: 'user-123',
      title: 'Test Project',
      description: 'A test project',
      settings: { resolution: 'hd', duration: 60 },
      status: 'draft',
      is_public: false,
      community_metrics: { likes: 0, comments: 0, shares: 0, views: 0 },
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    };

    it('should create project successfully', async () => {
      mockQuery.single.mockResolvedValue({ data: mockDbProject, error: null });

      const result = await databaseService.createProject(mockProjectData);

      expect(mockDb.from).toHaveBeenCalledWith('projects');
      expect(mockQuery.insert).toHaveBeenCalledWith({
        user_id: mockProjectData.userId,
        title: mockProjectData.title,
        description: mockProjectData.description,
        settings: mockProjectData.settings,
        status: 'draft',
        is_public: false,
        community_metrics: { likes: 0, comments: 0, shares: 0, views: 0 },
      });

      expect(result.id).toBe(mockDbProject.id);
      expect(result.title).toBe(mockProjectData.title);
    });

    it('should get user projects with filters', async () => {
      const mockProjects = [mockDbProject];
      mockQuery.single.mockResolvedValue({ data: mockProjects, error: null });

      const filters = {
        status: 'draft' as ProjectStatus,
        limit: 10,
        offset: 0,
      };

      await databaseService.getUserProjects('user-123', filters);

      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'draft');
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
      expect(mockQuery.range).toHaveBeenCalledWith(0, 9);
    });
  });

  describe('Credit Operations', () => {
    const mockTransactionData = {
      userId: 'user-123',
      type: 'purchase' as TransactionType,
      amount: 100,
      description: 'Credit purchase',
      awsCostCovered: 0,
      platformProfit: 5,
      metadata: { paymentId: 'pay_123' },
    };

    const mockDbTransaction = {
      id: 'txn-123',
      user_id: 'user-123',
      type: 'purchase',
      amount: 100,
      description: 'Credit purchase',
      operation_id: null,
      aws_cost_covered: 0,
      platform_profit: 5,
      metadata: { paymentId: 'pay_123' },
      created_at: '2023-01-01T00:00:00Z',
    };

    it('should create credit transaction successfully', async () => {
      mockQuery.single.mockResolvedValue({ data: mockDbTransaction, error: null });

      const result = await databaseService.createCreditTransaction(mockTransactionData);

      expect(mockDb.from).toHaveBeenCalledWith('credit_transactions');
      expect(mockQuery.insert).toHaveBeenCalledWith({
        user_id: mockTransactionData.userId,
        type: mockTransactionData.type,
        amount: mockTransactionData.amount,
        description: mockTransactionData.description,
        operation_id: undefined,
        aws_cost_covered: mockTransactionData.awsCostCovered,
        platform_profit: mockTransactionData.platformProfit,
        metadata: mockTransactionData.metadata,
      });

      expect(result.id).toBe(mockDbTransaction.id);
      expect(result.amount).toBe(mockTransactionData.amount);
    });

    it('should get user credit history', async () => {
      const mockTransactions = [mockDbTransaction];
      mockQuery.range.mockResolvedValue({ data: mockTransactions, error: null });

      const result = await databaseService.getUserCreditHistory('user-123', 50, 0);

      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockQuery.range).toHaveBeenCalledWith(0, 49);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockDbTransaction.id);
    });
  });

  describe('Generation Job Operations', () => {
    const mockJobData = {
      projectId: 'project-123',
      userId: 'user-123',
      operationType: 'video_generation' as OperationType,
      requestData: { prompt: 'Generate a video' },
      creditsRequired: 50,
      estimatedAWSCost: 2.5,
      platformProfit: 2.5,
    };

    const mockDbJob = {
      id: 'job-123',
      project_id: 'project-123',
      user_id: 'user-123',
      operation_type: 'video_generation',
      request_data: { prompt: 'Generate a video' },
      status: 'queued',
      progress: 0,
      credits_required: 50,
      credits_deducted: 0,
      estimated_aws_cost: 2.5,
      actual_aws_cost: null,
      platform_profit: 2.5,
      result_url: null,
      error_message: null,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      completed_at: null,
    };

    it('should create generation job successfully', async () => {
      mockQuery.single.mockResolvedValue({ data: mockDbJob, error: null });

      const result = await databaseService.createGenerationJob(mockJobData);

      expect(mockDb.from).toHaveBeenCalledWith('generation_jobs');
      expect(mockQuery.insert).toHaveBeenCalledWith({
        project_id: mockJobData.projectId,
        user_id: mockJobData.userId,
        operation_type: mockJobData.operationType,
        request_data: mockJobData.requestData,
        status: 'queued',
        progress: 0,
        credits_required: mockJobData.creditsRequired,
        credits_deducted: 0,
        estimated_aws_cost: mockJobData.estimatedAWSCost,
        platform_profit: mockJobData.platformProfit,
      });

      expect(result.id).toBe(mockDbJob.id);
      expect(result.status).toBe('queued');
    });

    it('should update generation job successfully', async () => {
      const updates = {
        status: 'completed' as any,
        progress: 100,
        creditsDeducted: 50,
        actualAWSCost: 2.3,
        resultUrl: 'https://s3.amazonaws.com/result.mp4',
        completedAt: new Date('2023-01-01T01:00:00Z'),
      };

      const updatedJob = { ...mockDbJob, ...updates };
      mockQuery.single.mockResolvedValue({ data: updatedJob, error: null });

      const result = await databaseService.updateGenerationJob('job-123', updates);

      expect(mockQuery.update).toHaveBeenCalledWith({
        updated_at: expect.any(String),
        status: updates.status,
        progress: updates.progress,
        credits_deducted: updates.creditsDeducted,
        actual_aws_cost: updates.actualAWSCost,
        result_url: updates.resultUrl,
        completed_at: updates.completedAt.toISOString(),
      });

      expect(result.status).toBe(updates.status);
      expect(result.progress).toBe(updates.progress);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      const error = new Error('Connection failed');
      mockQuery.single.mockRejectedValue(error);

      await expect(databaseService.getUserById('user-123')).rejects.toThrow('Connection failed');
      expect(logger.error).toHaveBeenCalledWith('Error getting user by ID:', error);
    });

    it('should handle audit log failures without breaking main operations', async () => {
      // Mock successful main operation
      const mockDbUser = {
        id: 'user-123',
        email: 'test@example.com',
        auth_provider_id: 'auth0|123456',
        display_name: 'Test User',
        credit_balance: 0,
        total_credits_ever: 0,
        role: 'user',
        is_active: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        last_login_at: '2023-01-01T00:00:00Z',
      };

      mockQuery.single
        .mockResolvedValueOnce({ data: mockDbUser, error: null }) // Main operation
        .mockRejectedValueOnce(new Error('Audit log failed')); // Audit log operation

      const userData = {
        email: 'test@example.com',
        authProviderId: 'auth0|123456',
        displayName: 'Test User',
      };

      // Should not throw error even if audit log fails
      const result = await databaseService.createUser(userData);
      expect(result).toBeDefined();
      expect(result.id).toBe('user-123');
    });
  });
});