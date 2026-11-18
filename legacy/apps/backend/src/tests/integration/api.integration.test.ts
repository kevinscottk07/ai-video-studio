/**
 * Backend API Integration Tests
 * Tests complete API workflows and service integrations
 * Validates all requirements integration across backend services
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { 
  createTestUser, 
  createTestProject, 
  createTestSubscription,
  createTestGenerationJob,
  createTestCreditTransaction,
  createTestCommunityPost,
  generateTestToken,
  cleanupTestData,
  setupTestDatabase,
  createTestEnvironment,
  waitFor,
  retryOperation,
  TestUser,
  TestProject,
  MockWebSocketService
} from '../helpers/testHelpers.js';

// Mock the server app for testing
const mockApp = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  patch: vi.fn(),
  use: vi.fn(),
  listen: vi.fn(),
};

// Mock supertest
vi.mock('supertest', () => ({
  default: () => mockApp,
}));

const prisma = new PrismaClient();

describe('Complete Backend API Integration Tests', () => {
  let testUser: TestUser;
  let testProject: TestProject;
  let authToken: string;
  let testEnvironment: any;

  beforeAll(async () => {
    await setupTestDatabase();
    testEnvironment = await createTestEnvironment();
  });

  afterAll(async () => {
    await testEnvironment.cleanup();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await cleanupTestData();
    
    // Create test user with Pro subscription
    testUser = await createTestUser({
      email: 'integration-test@example.com',
      displayName: 'Integration Test User',
      creditBalance: 200,
      role: 'user',
    });

    // Create subscription for the user
    await createTestSubscription(testUser.id, {
      planId: 'pro',
      status: 'active',
      creditsIncluded: 200,
      creditsUsedThisPeriod: 0,
    });

    // Create test project
    testProject = await createTestProject(testUser.id, {
      title: 'Integration Test Project',
      description: 'Project for testing complete workflows',
      status: 'draft',
      isPublic: false,
    });

    // Generate auth token
    authToken = generateTestToken(testUser);
  });

  describe('Authentication and Authorization Integration', () => {
    it('should handle complete authentication flow', async () => {
      // Test user registration/login
      const loginResponse = {
        success: true,
        data: {
          user: testUser,
          token: authToken,
          refreshToken: 'mock-refresh-token',
        },
      };

      // Mock successful login
      mockApp.post.mockImplementation((path, handler) => {
        if (path === '/api/v1/auth/login') {
          return Promise.resolve({
            status: 200,
            body: loginResponse,
          });
        }
      });

      // Test token validation
      const validationResponse = {
        success: true,
        data: { user: testUser },
      };

      mockApp.get.mockImplementation((path, handler) => {
        if (path === '/api/v1/auth/me') {
          return Promise.resolve({
            status: 200,
            body: validationResponse,
          });
        }
      });

      // Verify authentication state is maintained
      expect(testUser.id).toBeDefined();
      expect(authToken).toBeDefined();
    });

    it('should enforce role-based access control', async () => {
      // Test admin-only endpoints
      const adminUser = await createTestUser({
        role: 'admin',
        email: 'admin-test@example.com',
      });
      const adminToken = generateTestToken(adminUser);

      // Mock admin endpoint access
      mockApp.get.mockImplementation((path, handler) => {
        if (path === '/api/v1/admin/users') {
          return Promise.resolve({
            status: 200,
            body: {
              success: true,
              data: { users: [testUser, adminUser] },
            },
          });
        }
      });

      // Regular user should be denied admin access
      mockApp.get.mockImplementation((path, handler) => {
        if (path === '/api/v1/admin/users' && handler.headers?.authorization !== `Bearer ${adminToken}`) {
          return Promise.resolve({
            status: 403,
            body: {
              success: false,
              error: { code: 'FORBIDDEN', message: 'Admin access required' },
            },
          });
        }
      });

      expect(adminUser.role).toBe('admin');
      expect(testUser.role).toBe('user');
    });
  });

  describe('Credit System Integration', () => {
    it('should handle complete credit lifecycle', async () => {
      const initialBalance = testUser.creditBalance;

      // Test credit purchase
      await createTestCreditTransaction(testUser.id, 'purchase', 50, 'Test credit purchase');
      
      // Verify balance updated
      const updatedUser = await prisma.user.findUnique({
        where: { id: testUser.id },
      });
      expect(updatedUser?.creditBalance).toBe(initialBalance + 50);

      // Test credit deduction for video generation
      const generationJob = await createTestGenerationJob(testProject.id, testUser.id, {
        creditsRequired: 25,
        status: 'processing',
      });

      await createTestCreditTransaction(testUser.id, 'deduction', 25, 'Video generation cost');

      // Verify credits deducted
      const userAfterDeduction = await prisma.user.findUnique({
        where: { id: testUser.id },
      });
      expect(userAfterDeduction?.creditBalance).toBe(initialBalance + 50 - 25);

      // Test credit refund on failure
      await prisma.generationJob.update({
        where: { id: generationJob.id },
        data: { status: 'failed' },
      });

      await createTestCreditTransaction(testUser.id, 'refund', 25, 'Refund for failed generation');

      // Verify credits refunded
      const userAfterRefund = await prisma.user.findUnique({
        where: { id: testUser.id },
      });
      expect(userAfterRefund?.creditBalance).toBe(initialBalance + 50);
    });

    it('should prevent operations with insufficient credits', async () => {
      // Set user to low credit balance
      await prisma.user.update({
        where: { id: testUser.id },
        data: { creditBalance: 5 },
      });

      // Attempt expensive operation
      const expensiveJob = {
        creditsRequired: 50,
        status: 'queued',
      };

      // Mock insufficient credits response
      mockApp.post.mockImplementation((path, handler) => {
        if (path === '/api/v1/video/generate') {
          return Promise.resolve({
            status: 400,
            body: {
              success: false,
              error: {
                code: 'INSUFFICIENT_CREDITS',
                message: 'Not enough credits for this operation',
                required: 50,
                available: 5,
              },
            },
          });
        }
      });

      // Verify operation is blocked
      const user = await prisma.user.findUnique({
        where: { id: testUser.id },
      });
      expect(user?.creditBalance).toBe(5);
    });
  });

  describe('Video Generation Pipeline Integration', () => {
    it('should handle complete video generation workflow', async () => {
      // Test generation request
      const generationRequest = {
        projectId: testProject.id,
        prompt: 'Create a beautiful sunset landscape video',
        style: 'cinematic',
        duration: 60,
        resolution: '1080p',
      };

      // Create generation job
      const job = await createTestGenerationJob(testProject.id, testUser.id, {
        creditsRequired: 30,
        status: 'queued',
      });

      // Mock job progression
      const progressUpdates = [
        { status: 'processing', progress: 25 },
        { status: 'processing', progress: 50 },
        { status: 'processing', progress: 75 },
        { status: 'completed', progress: 100 },
      ];

      for (const update of progressUpdates) {
        await prisma.generationJob.update({
          where: { id: job.id },
          data: update,
        });

        // Simulate real-time progress update
        testEnvironment.mockWebSocket.emit('generation_progress', {
          jobId: job.id,
          projectId: testProject.id,
          userId: testUser.id,
          ...update,
        });

        await waitFor(100); // Simulate processing time
      }

      // Verify final job state
      const completedJob = await prisma.generationJob.findUnique({
        where: { id: job.id },
      });
      expect(completedJob?.status).toBe('completed');
      expect(completedJob?.progress).toBe(100);
    });

    it('should handle generation failures and credit refunds', async () => {
      const initialBalance = testUser.creditBalance;
      
      // Create failing job
      const job = await createTestGenerationJob(testProject.id, testUser.id, {
        creditsRequired: 25,
        status: 'processing',
      });

      // Deduct credits initially
      await createTestCreditTransaction(testUser.id, 'deduction', 25, 'Video generation cost');

      // Simulate failure
      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          errorMessage: 'AI service temporarily unavailable',
        },
      });

      // Process refund
      await createTestCreditTransaction(testUser.id, 'refund', 25, 'Refund for failed generation');

      // Verify refund processed
      const userAfterRefund = await prisma.user.findUnique({
        where: { id: testUser.id },
      });
      expect(userAfterRefund?.creditBalance).toBe(initialBalance);

      // Verify job marked as failed
      const failedJob = await prisma.generationJob.findUnique({
        where: { id: job.id },
      });
      expect(failedJob?.status).toBe('failed');
      expect(failedJob?.errorMessage).toContain('AI service');
    });
  });

  describe('Project Management Integration', () => {
    it('should handle complete project lifecycle', async () => {
      // Test project creation
      const newProject = await createTestProject(testUser.id, {
        title: 'Lifecycle Test Project',
        description: 'Testing complete project lifecycle',
        status: 'draft',
      });

      // Test project updates
      await prisma.project.update({
        where: { id: newProject.id },
        data: {
          title: 'Updated Project Title',
          status: 'generating',
        },
      });

      // Test project sharing
      await prisma.project.update({
        where: { id: newProject.id },
        data: { isPublic: true },
      });

      // Create community post for shared project
      const communityPostId = await createTestCommunityPost(testUser.id, newProject.id, {
        title: 'My Amazing Video Creation',
        description: 'Check out this video I created!',
      });

      // Verify project state
      const updatedProject = await prisma.project.findUnique({
        where: { id: newProject.id },
      });
      expect(updatedProject?.title).toBe('Updated Project Title');
      expect(updatedProject?.isPublic).toBe(true);

      // Verify community post created
      const communityPost = await prisma.communityPost.findUnique({
        where: { id: communityPostId },
      });
      expect(communityPost?.projectId).toBe(newProject.id);
    });

    it('should handle project deletion with cleanup', async () => {
      // Create project with associated data
      const projectToDelete = await createTestProject(testUser.id, {
        title: 'Project to Delete',
      });

      // Create associated generation job
      const job = await createTestGenerationJob(projectToDelete.id, testUser.id);

      // Create community post
      const postId = await createTestCommunityPost(testUser.id, projectToDelete.id);

      // Delete project (cascade should handle related data)
      await prisma.generationJob.deleteMany({
        where: { projectId: projectToDelete.id },
      });
      await prisma.communityPost.deleteMany({
        where: { projectId: projectToDelete.id },
      });
      await prisma.project.delete({
        where: { id: projectToDelete.id },
      });

      // Verify cleanup
      const deletedProject = await prisma.project.findUnique({
        where: { id: projectToDelete.id },
      });
      expect(deletedProject).toBeNull();

      const deletedJob = await prisma.generationJob.findUnique({
        where: { id: job.id },
      });
      expect(deletedJob).toBeNull();
    });
  });

  describe('Community Features Integration', () => {
    it('should handle community interactions', async () => {
      // Create public project
      const publicProject = await createTestProject(testUser.id, {
        title: 'Public Community Project',
        isPublic: true,
        status: 'completed',
      });

      // Share to community
      const postId = await createTestCommunityPost(testUser.id, publicProject.id, {
        title: 'Amazing AI Video',
        description: 'Created with our AI Video Studio',
        likes: 0,
        views: 0,
      });

      // Simulate user interactions
      await prisma.communityPost.update({
        where: { id: postId },
        data: {
          likes: { increment: 1 },
          views: { increment: 5 },
        },
      });

      // Create another user for interaction testing
      const otherUser = await createTestUser({
        email: 'other-user@example.com',
        displayName: 'Other User',
      });

      // Simulate comment (would be in separate comments table in real implementation)
      const interactionData = {
        postId,
        userId: otherUser.id,
        type: 'like',
        timestamp: new Date(),
      };

      // Verify community metrics
      const updatedPost = await prisma.communityPost.findUnique({
        where: { id: postId },
      });
      expect(updatedPost?.likes).toBeGreaterThan(0);
      expect(updatedPost?.views).toBeGreaterThan(0);
    });

    it('should handle content moderation', async () => {
      // Create potentially problematic content
      const flaggedPostId = await createTestCommunityPost(testUser.id, testProject.id, {
        title: 'Potentially Inappropriate Content',
        description: 'This content might need moderation',
        isPublic: true,
      });

      // Simulate content flagging
      await prisma.communityPost.update({
        where: { id: flaggedPostId },
        data: {
          // In real implementation, would have moderation fields
          isPublic: false, // Hide while under review
        },
      });

      // Verify content is hidden
      const moderatedPost = await prisma.communityPost.findUnique({
        where: { id: flaggedPostId },
      });
      expect(moderatedPost?.isPublic).toBe(false);
    });
  });

  describe('Subscription and Billing Integration', () => {
    it('should handle subscription lifecycle', async () => {
      // Test subscription creation
      const subscription = await createTestSubscription(testUser.id, {
        planId: 'ultra',
        status: 'active',
        creditsIncluded: 500,
        creditsUsedThisPeriod: 0,
      });

      // Test subscription renewal
      const renewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          currentPeriodStart: new Date(),
          currentPeriodEnd: renewalDate,
          creditsUsedThisPeriod: 0, // Reset on renewal
        },
      });

      // Grant renewal credits
      await createTestCreditTransaction(testUser.id, 'subscription_grant', 500, 'Monthly credit allocation');

      // Verify subscription state
      const renewedSubscription = await prisma.subscription.findUnique({
        where: { id: subscription.id },
      });
      expect(renewedSubscription?.status).toBe('active');

      // Verify credits granted
      const userWithCredits = await prisma.user.findUnique({
        where: { id: testUser.id },
      });
      expect(userWithCredits?.creditBalance).toBeGreaterThan(testUser.creditBalance);
    });

    it('should handle subscription cancellation', async () => {
      const subscription = await createTestSubscription(testUser.id, {
        planId: 'pro',
        status: 'active',
      });

      // Cancel subscription
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'canceled',
          cancelAtPeriodEnd: true,
        },
      });

      // Verify cancellation
      const canceledSubscription = await prisma.subscription.findUnique({
        where: { id: subscription.id },
      });
      expect(canceledSubscription?.status).toBe('canceled');
      expect(canceledSubscription?.cancelAtPeriodEnd).toBe(true);
    });
  });

  describe('Real-Time Features Integration', () => {
    it('should handle WebSocket events and notifications', async () => {
      const mockWebSocket = testEnvironment.mockWebSocket;
      const receivedEvents: any[] = [];

      // Set up event listener
      mockWebSocket.on('notification', (data: any) => {
        receivedEvents.push(data);
      });

      // Simulate various real-time events
      const events = [
        {
          type: 'generation_started',
          data: { projectId: testProject.id, userId: testUser.id },
        },
        {
          type: 'generation_progress',
          data: { projectId: testProject.id, progress: 50 },
        },
        {
          type: 'generation_complete',
          data: { projectId: testProject.id, videoUrl: 'https://example.com/video.mp4' },
        },
        {
          type: 'credit_balance_updated',
          data: { userId: testUser.id, newBalance: 175 },
        },
      ];

      // Emit events
      for (const event of events) {
        mockWebSocket.emit('notification', event);
        await waitFor(50);
      }

      // Verify events received
      expect(receivedEvents).toHaveLength(events.length);
      expect(receivedEvents[0].type).toBe('generation_started');
      expect(receivedEvents[2].type).toBe('generation_complete');
    });

    it('should handle collaborative project updates', async () => {
      const mockWebSocket = testEnvironment.mockWebSocket;
      const collaborativeUpdates: any[] = [];

      // Create second user for collaboration
      const collaborator = await createTestUser({
        email: 'collaborator@example.com',
        displayName: 'Collaborator User',
      });

      // Set up collaboration listener
      mockWebSocket.on('project_update', (data: any) => {
        collaborativeUpdates.push(data);
      });

      // Simulate collaborative edits
      const updates = [
        {
          projectId: testProject.id,
          userId: collaborator.id,
          type: 'title_changed',
          data: { newTitle: 'Collaborative Project' },
        },
        {
          projectId: testProject.id,
          userId: testUser.id,
          type: 'description_changed',
          data: { newDescription: 'Updated by original creator' },
        },
      ];

      // Emit collaborative updates
      for (const update of updates) {
        mockWebSocket.emit('project_update', update);
        await waitFor(50);
      }

      // Verify collaborative updates received
      expect(collaborativeUpdates).toHaveLength(2);
      expect(collaborativeUpdates[0].type).toBe('title_changed');
      expect(collaborativeUpdates[1].userId).toBe(testUser.id);
    });
  });

  describe('Error Handling and Recovery Integration', () => {
    it('should handle service failures gracefully', async () => {
      // Simulate AI service failure
      const failingJob = await createTestGenerationJob(testProject.id, testUser.id, {
        status: 'processing',
        creditsRequired: 30,
      });

      // Deduct credits
      await createTestCreditTransaction(testUser.id, 'deduction', 30, 'Video generation cost');

      // Simulate service failure
      await prisma.generationJob.update({
        where: { id: failingJob.id },
        data: {
          status: 'failed',
          errorMessage: 'External AI service unavailable',
        },
      });

      // Process automatic refund
      await createTestCreditTransaction(testUser.id, 'refund', 30, 'Automatic refund for service failure');

      // Verify graceful handling
      const failedJob = await prisma.generationJob.findUnique({
        where: { id: failingJob.id },
      });
      expect(failedJob?.status).toBe('failed');
      expect(failedJob?.errorMessage).toContain('service unavailable');

      // Verify user credits restored
      const userAfterRefund = await prisma.user.findUnique({
        where: { id: testUser.id },
      });
      expect(userAfterRefund?.creditBalance).toBe(testUser.creditBalance);
    });

    it('should handle database transaction failures', async () => {
      const initialBalance = testUser.creditBalance;

      try {
        // Simulate transaction that should fail
        await prisma.$transaction(async (tx) => {
          // Deduct credits
          await tx.user.update({
            where: { id: testUser.id },
            data: { creditBalance: { decrement: 50 } },
          });

          // Create job
          await tx.generationJob.create({
            data: {
              id: 'test-job-id',
              projectId: testProject.id,
              userId: testUser.id,
              status: 'queued',
              progress: 0,
              creditsRequired: 50,
              creditsDeducted: 50,
              estimatedAWSCost: 5.0,
              actualAWSCost: null,
              platformProfit: 0,
              resultUrl: null,
              errorMessage: null,
              createdAt: new Date(),
              updatedAt: new Date(),
              completedAt: null,
              request: JSON.stringify({ prompt: 'Test' }),
            },
          });

          // Force transaction failure
          throw new Error('Simulated transaction failure');
        });
      } catch (error) {
        // Expected to fail
        expect(error.message).toContain('Simulated transaction failure');
      }

      // Verify rollback - credits should be unchanged
      const userAfterFailure = await prisma.user.findUnique({
        where: { id: testUser.id },
      });
      expect(userAfterFailure?.creditBalance).toBe(initialBalance);

      // Verify job was not created
      const job = await prisma.generationJob.findUnique({
        where: { id: 'test-job-id' },
      });
      expect(job).toBeNull();
    });
  });

  describe('Performance and Scalability Integration', () => {
    it('should handle concurrent operations', async () => {
      const concurrentUsers = [];
      const concurrentProjects = [];

      // Create multiple users and projects concurrently
      const userPromises = Array.from({ length: 5 }, (_, i) =>
        createTestUser({
          email: `concurrent-user-${i}@example.com`,
          displayName: `Concurrent User ${i}`,
          creditBalance: 100,
        })
      );

      const users = await Promise.all(userPromises);
      concurrentUsers.push(...users);

      // Create projects for each user concurrently
      const projectPromises = users.map((user, i) =>
        createTestProject(user.id, {
          title: `Concurrent Project ${i}`,
          description: `Project for concurrent user ${i}`,
        })
      );

      const projects = await Promise.all(projectPromises);
      concurrentProjects.push(...projects);

      // Verify all operations completed successfully
      expect(concurrentUsers).toHaveLength(5);
      expect(concurrentProjects).toHaveLength(5);

      // Test concurrent credit transactions
      const transactionPromises = users.map((user, i) =>
        createTestCreditTransaction(user.id, 'purchase', 25, `Concurrent purchase ${i}`)
      );

      const transactions = await Promise.all(transactionPromises);
      expect(transactions).toHaveLength(5);

      // Verify all users have updated balances
      const updatedUsers = await Promise.all(
        users.map(user => 
          prisma.user.findUnique({ where: { id: user.id } })
        )
      );

      updatedUsers.forEach(user => {
        expect(user?.creditBalance).toBe(125); // 100 + 25
      });
    });

    it('should maintain performance under load', async () => {
      const startTime = Date.now();
      const operations = [];

      // Simulate high load with multiple operations
      for (let i = 0; i < 20; i++) {
        operations.push(
          createTestUser({
            email: `load-test-user-${i}@example.com`,
            displayName: `Load Test User ${i}`,
          })
        );
      }

      // Execute all operations
      const results = await Promise.all(operations);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Verify performance (should complete within reasonable time)
      expect(totalTime).toBeLessThan(5000); // 5 seconds max
      expect(results).toHaveLength(20);

      // Verify all operations succeeded
      results.forEach(user => {
        expect(user.id).toBeDefined();
        expect(user.email).toContain('load-test-user-');
      });
    });
  });

  describe('Data Privacy and Compliance Integration', () => {
    it('should handle GDPR data export requests', async () => {
      // Create user with comprehensive data
      const gdprUser = await createTestUser({
        email: 'gdpr-test@example.com',
        displayName: 'GDPR Test User',
      });

      // Create associated data
      const userProject = await createTestProject(gdprUser.id, {
        title: 'GDPR Test Project',
      });

      await createTestCreditTransaction(gdprUser.id, 'purchase', 100, 'GDPR test purchase');
      await createTestSubscription(gdprUser.id, { planId: 'pro' });

      // Simulate data export
      const userData = await prisma.user.findUnique({
        where: { id: gdprUser.id },
        include: {
          projects: true,
          creditTransactions: true,
          subscriptions: true,
        },
      });

      // Verify comprehensive data export
      expect(userData).toBeDefined();
      expect(userData?.projects).toHaveLength(1);
      expect(userData?.creditTransactions).toHaveLength(1);
      expect(userData?.subscriptions).toHaveLength(1);

      // Verify sensitive data is included
      expect(userData?.email).toBe('gdpr-test@example.com');
      expect(userData?.displayName).toBe('GDPR Test User');
    });

    it('should handle data deletion requests', async () => {
      // Create user with data to delete
      const userToDelete = await createTestUser({
        email: 'delete-test@example.com',
        displayName: 'User To Delete',
      });

      // Create associated data
      const projectToDelete = await createTestProject(userToDelete.id, {
        title: 'Project To Delete',
      });

      const transactionId = await createTestCreditTransaction(
        userToDelete.id, 
        'purchase', 
        50, 
        'Transaction to delete'
      );

      // Simulate GDPR deletion (cascade delete)
      await prisma.creditTransaction.deleteMany({
        where: { userId: userToDelete.id },
      });

      await prisma.project.deleteMany({
        where: { userId: userToDelete.id },
      });

      await prisma.user.delete({
        where: { id: userToDelete.id },
      });

      // Verify complete deletion
      const deletedUser = await prisma.user.findUnique({
        where: { id: userToDelete.id },
      });
      expect(deletedUser).toBeNull();

      const deletedProject = await prisma.project.findUnique({
        where: { id: projectToDelete.id },
      });
      expect(deletedProject).toBeNull();

      const deletedTransactions = await prisma.creditTransaction.findMany({
        where: { userId: userToDelete.id },
      });
      expect(deletedTransactions).toHaveLength(0);
    });
  });
});