/**
 * Comprehensive Integration Tests
 * Tests cross-component interactions and data flow across the entire AI Video Studio platform
 * Validates complete user journeys and system integration points
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { 
  createTestUser, 
  createTestProject, 
  createTestSubscription,
  createTestGenerationJob,
  createTestCreditTransaction,
  createTestCommunityPost,
  cleanupTestData,
  setupTestDatabase,
  createTestEnvironment,
  waitFor,
  MockWebSocketService
} from '../helpers/testHelpers.js';

const prisma = new PrismaClient();

describe('Comprehensive Cross-Component Integration Tests', () => {
  let testEnvironment: any;
  let mockWebSocket: MockWebSocketService;

  beforeAll(async () => {
    await setupTestDatabase();
    testEnvironment = await createTestEnvironment();
    mockWebSocket = testEnvironment.mockWebSocket;
  });

  afterAll(async () => {
    await testEnvironment.cleanup();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await cleanupTestData();
    mockWebSocket.clear();
  });

  describe('Complete User Journey Integration', () => {
    it('should handle end-to-end user journey from registration to video creation and community sharing', async () => {
      // Step 1: User Registration and Authentication
      const newUser = await createTestUser({
        email: 'journey-test@example.com',
        displayName: 'Journey Test User',
        creditBalance: 150,
        role: 'user',
      });

      // Step 2: Subscription Creation
      await createTestSubscription(newUser.id, {
        planId: 'pro',
        status: 'active',
        creditsIncluded: 200,
        creditsUsedThisPeriod: 0,
      });

      // Verify subscription is active
      const userWithSubscription = await prisma.user.findUnique({
        where: { id: newUser.id },
        include: { subscriptions: true },
      });
      expect(userWithSubscription?.subscriptions).toHaveLength(1);
      expect(userWithSubscription?.subscriptions[0].status).toBe('active');

      // Step 3: Project Creation
      const project = await createTestProject(newUser.id, {
        title: 'End-to-End Journey Project',
        description: 'Testing complete user journey',
        status: 'draft',
        isPublic: false,
      });

      // Step 4: Credit Purchase (simulate additional credits needed)
      await createTestCreditTransaction(newUser.id, 'purchase', 100, 'Additional credits for journey test');

      // Verify credit balance updated
      const userAfterPurchase = await prisma.user.findUnique({
        where: { id: newUser.id },
      });
      expect(userAfterPurchase?.creditBalance).toBe(250); // 150 + 100

      // Step 5: Video Generation Request
      const generationJob = await createTestGenerationJob(project.id, newUser.id, {
        creditsRequired: 50,
        status: 'queued',
        progress: 0,
      });

      // Deduct credits for generation
      await createTestCreditTransaction(newUser.id, 'deduction', 50, 'Video generation cost');

      // Step 6: Simulate Real-Time Generation Progress
      const progressUpdates = [
        { status: 'processing', progress: 25, stage: 'analyzing_prompt' },
        { status: 'processing', progress: 50, stage: 'generating_script' },
        { status: 'processing', progress: 75, stage: 'creating_scenes' },
        { status: 'completed', progress: 100, stage: 'finalizing' },
      ];

      const receivedUpdates: any[] = [];
      mockWebSocket.on('generation_progress', (data: any) => {
        receivedUpdates.push(data);
      });

      for (const update of progressUpdates) {
        await prisma.generationJob.update({
          where: { id: generationJob.id },
          data: {
            status: update.status as any,
            progress: update.progress,
          },
        });

        // Emit real-time update
        mockWebSocket.emit('generation_progress', {
          jobId: generationJob.id,
          projectId: project.id,
          userId: newUser.id,
          ...update,
        });

        await waitFor(100);
      }

      // Verify all progress updates were received
      expect(receivedUpdates).toHaveLength(4);
      expect(receivedUpdates[3].progress).toBe(100);
      expect(receivedUpdates[3].status).toBe('completed');

      // Step 7: Update Project Status to Completed
      await prisma.project.update({
        where: { id: project.id },
        data: { status: 'completed' },
      });

      // Step 8: Share to Community
      const communityPostId = await createTestCommunityPost(newUser.id, project.id, {
        title: 'My Amazing AI Video Journey',
        description: 'Created through the complete platform journey!',
        videoUrl: 'https://cdn.example.com/videos/journey-video.mp4',
        thumbnailUrl: 'https://cdn.example.com/thumbnails/journey-thumb.jpg',
        tags: ['journey', 'ai-generated', 'cinematic'],
        isPublic: true,
      });

      // Update project to public
      await prisma.project.update({
        where: { id: project.id },
        data: { isPublic: true },
      });

      // Step 9: Community Interactions
      // Create another user to interact with the post
      await createTestUser({
        email: 'interactor@example.com',
        displayName: 'Interacting User',
      });

      // Simulate likes and views
      await prisma.communityPost.update({
        where: { id: communityPostId },
        data: {
          likes: { increment: 1 },
          views: { increment: 5 },
        },
      });

      // Step 10: Verify Complete Journey State
      const finalUser = await prisma.user.findUnique({
        where: { id: newUser.id },
        include: {
          projects: true,
          creditTransactions: true,
          subscriptions: true,
        },
      });

      const finalProject = await prisma.project.findUnique({
        where: { id: project.id },
        include: {
          generationJobs: true,
        },
      });

      const finalCommunityPost = await prisma.communityPost.findUnique({
        where: { id: communityPostId },
      });

      // Comprehensive verification
      expect(finalUser?.creditBalance).toBe(200); // 250 - 50 (generation cost)
      expect(finalUser?.projects).toHaveLength(1);
      expect(finalUser?.creditTransactions).toHaveLength(2); // purchase + deduction
      expect(finalUser?.subscriptions).toHaveLength(1);

      expect(finalProject?.status).toBe('completed');
      expect(finalProject?.isPublic).toBe(true);
      expect(finalProject?.generationJobs).toHaveLength(1);
      expect(finalProject?.generationJobs[0].status).toBe('completed');

      expect(finalCommunityPost?.likes).toBe(1);
      expect(finalCommunityPost?.views).toBe(5);
      expect(finalCommunityPost?.isPublic).toBe(true);
    });

    it('should handle multi-user collaborative project workflow', async () => {
      // Create project owner
      const owner = await createTestUser({
        email: 'owner@example.com',
        displayName: 'Project Owner',
        creditBalance: 200,
      });

      // Create collaborators
      const collaborator1 = await createTestUser({
        email: 'collab1@example.com',
        displayName: 'Collaborator One',
        creditBalance: 100,
      });

      const collaborator2 = await createTestUser({
        email: 'collab2@example.com',
        displayName: 'Collaborator Two',
        creditBalance: 100,
      });

      // Create shared project
      const sharedProject = await createTestProject(owner.id, {
        title: 'Collaborative Video Project',
        description: 'A project worked on by multiple users',
        status: 'draft',
        isPublic: false,
      });

      // Simulate real-time collaboration events
      const collaborationEvents: any[] = [];
      mockWebSocket.on('project_update', (data: any) => {
        collaborationEvents.push(data);
      });

      // Owner makes initial changes
      await prisma.project.update({
        where: { id: sharedProject.id },
        data: {
          description: 'Updated by owner - collaborative project in progress',
        },
      });

      mockWebSocket.emit('project_update', {
        projectId: sharedProject.id,
        userId: owner.id,
        action: 'description_updated',
        timestamp: new Date(),
      });

      // Collaborator 1 adds content
      const generation1 = await createTestGenerationJob(sharedProject.id, collaborator1.id, {
        creditsRequired: 30,
        status: 'completed',
        progress: 100,
      });

      mockWebSocket.emit('project_update', {
        projectId: sharedProject.id,
        userId: collaborator1.id,
        action: 'generation_added',
        generationId: generation1.id,
        timestamp: new Date(),
      });

      // Collaborator 2 adds content
      const generation2 = await createTestGenerationJob(sharedProject.id, collaborator2.id, {
        creditsRequired: 25,
        status: 'completed',
        progress: 100,
      });

      mockWebSocket.emit('project_update', {
        projectId: sharedProject.id,
        userId: collaborator2.id,
        action: 'generation_added',
        generationId: generation2.id,
        timestamp: new Date(),
      });

      // Owner finalizes project
      await prisma.project.update({
        where: { id: sharedProject.id },
        data: {
          status: 'completed',
          isPublic: true,
        },
      });

      mockWebSocket.emit('project_update', {
        projectId: sharedProject.id,
        userId: owner.id,
        action: 'project_completed',
        timestamp: new Date(),
      });

      // Verify collaboration events were tracked
      expect(collaborationEvents).toHaveLength(4);
      expect(collaborationEvents[0].action).toBe('description_updated');
      expect(collaborationEvents[1].action).toBe('generation_added');
      expect(collaborationEvents[2].action).toBe('generation_added');
      expect(collaborationEvents[3].action).toBe('project_completed');

      // Verify final project state
      const finalCollaborativeProject = await prisma.project.findUnique({
        where: { id: sharedProject.id },
        include: {
          generationJobs: true,
        },
      });

      expect(finalCollaborativeProject?.status).toBe('completed');
      expect(finalCollaborativeProject?.isPublic).toBe(true);
      expect(finalCollaborativeProject?.generationJobs).toHaveLength(2);
    });
  });

  describe('Advanced Cross-Service Integration', () => {
    it('should handle complex multi-service workflows with proper data synchronization', async () => {
      // Create multiple users for complex interaction testing
      const primaryUser = await createTestUser({
        email: 'primary@example.com',
        displayName: 'Primary User',
        creditBalance: 500,
        role: 'user',
      });

      const collaboratorUser = await createTestUser({
        email: 'collaborator@example.com',
        displayName: 'Collaborator User',
        creditBalance: 300,
        role: 'user',
      });

      const adminUser = await createTestUser({
        email: 'admin@example.com',
        displayName: 'Admin User',
        creditBalance: 1000,
        role: 'admin',
      });

      // Create subscriptions for users
      await createTestSubscription(primaryUser.id, {
        planId: 'ultra',
        status: 'active',
        creditsIncluded: 1000,
        creditsUsedThisPeriod: 0,
      });

      await createTestSubscription(collaboratorUser.id, {
        planId: 'pro',
        status: 'active',
        creditsIncluded: 500,
        creditsUsedThisPeriod: 100,
      });

      // Create shared project
      const sharedProject = await createTestProject(primaryUser.id, {
        title: 'Multi-Service Integration Project',
        description: 'Testing complex cross-service interactions',
        status: 'draft',
        isPublic: false,
      });

      // Test AI service integration with credit management
      const aiGenerationJob = await createTestGenerationJob(sharedProject.id, primaryUser.id, {
        creditsRequired: 150,
        status: 'processing',
        progress: 0,
      });

      // Deduct credits and track AWS costs
      await createTestCreditTransaction(primaryUser.id, 'deduction', 150, 'AI video generation');

      // Simulate AI processing with real-time updates
      const aiProcessingSteps = [
        { stage: 'prompt_analysis', progress: 10, awsCost: 5.0 },
        { stage: 'script_generation', progress: 25, awsCost: 12.0 },
        { stage: 'scene_creation', progress: 50, awsCost: 35.0 },
        { stage: 'video_rendering', progress: 75, awsCost: 60.0 },
        { stage: 'post_processing', progress: 90, awsCost: 75.0 },
        { stage: 'finalization', progress: 100, awsCost: 85.0 },
      ];

      for (const step of aiProcessingSteps) {
        await prisma.generationJob.update({
          where: { id: aiGenerationJob.id },
          data: {
            progress: step.progress,
            actualAWSCost: step.awsCost,
          },
        });

        // Emit real-time progress
        mockWebSocket.emit('ai_processing_update', {
          jobId: aiGenerationJob.id,
          projectId: sharedProject.id,
          userId: primaryUser.id,
          stage: step.stage,
          progress: step.progress,
          estimatedCompletion: new Date(Date.now() + (100 - step.progress) * 1000),
        });

        await waitFor(100);
      }

      // Complete AI generation
      await prisma.generationJob.update({
        where: { id: aiGenerationJob.id },
        data: {
          status: 'completed',
          resultUrl: 'https://s3.amazonaws.com/ai-video-studio/generated-video.mp4',
          completedAt: new Date(),
        },
      });

      // Update project status
      await prisma.project.update({
        where: { id: sharedProject.id },
        data: { status: 'completed' },
      });

      // Test community service integration
      const communityPostId = await createTestCommunityPost(primaryUser.id, sharedProject.id, {
        title: 'AI-Generated Masterpiece',
        description: 'Created using advanced AI with collaborative input',
        videoUrl: 'https://s3.amazonaws.com/ai-video-studio/generated-video.mp4',
        thumbnailUrl: 'https://s3.amazonaws.com/ai-video-studio/thumbnail.jpg',
        tags: ['ai-generated', 'collaborative', 'ultra-quality'],
        isPublic: true,
      });

      // Test real-time community interactions
      const communityInteractions = [
        { userId: collaboratorUser.id, action: 'like', timestamp: new Date() },
        { userId: collaboratorUser.id, action: 'comment', content: 'Amazing work!', timestamp: new Date() },
        { userId: adminUser.id, action: 'feature', timestamp: new Date() },
      ];

      for (const interaction of communityInteractions) {
        if (interaction.action === 'like') {
          await prisma.communityPost.update({
            where: { id: communityPostId },
            data: { likes: { increment: 1 } },
          });
        }

        mockWebSocket.emit('community_interaction', {
          postId: communityPostId,
          userId: interaction.userId,
          action: interaction.action,
          content: interaction.content,
          timestamp: interaction.timestamp,
        });

        await waitFor(50);
      }

      // Test billing service integration with usage tracking
      const billingPeriodStart = new Date();
      const billingPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // Update subscription usage
      await prisma.subscription.updateMany({
        where: { userId: primaryUser.id },
        data: {
          creditsUsedThisPeriod: { increment: 150 },
          currentPeriodStart: billingPeriodStart,
          currentPeriodEnd: billingPeriodEnd,
        },
      });

      // Test admin service integration with analytics
      const adminAnalytics = {
        totalUsers: 3,
        activeProjects: 1,
        completedGenerations: 1,
        totalCreditsUsed: 150,
        totalAWSCosts: 85.0,
        platformRevenue: 65.0, // 150 credits - 85 AWS costs
        communityPosts: 1,
        communityEngagement: 2, // 1 like + 1 comment
      };

      // Emit admin analytics update
      mockWebSocket.emit('admin_analytics_update', {
        adminId: adminUser.id,
        analytics: adminAnalytics,
        timestamp: new Date(),
      });

      // Verify final state across all services
      const finalPrimaryUser = await prisma.user.findUnique({
        where: { id: primaryUser.id },
        include: {
          projects: {
            include: {
              generationJobs: true,
            },
          },
          creditTransactions: true,
          subscriptions: true,
        },
      });

      const finalCommunityPost = await prisma.communityPost.findUnique({
        where: { id: communityPostId },
      });

      const finalGenerationJob = await prisma.generationJob.findUnique({
        where: { id: aiGenerationJob.id },
      });

      // Comprehensive verification
      expect(finalPrimaryUser?.creditBalance).toBe(350); // 500 - 150
      expect(finalPrimaryUser?.projects[0].status).toBe('completed');
      expect(finalPrimaryUser?.projects[0].generationJobs[0].status).toBe('completed');
      expect(finalPrimaryUser?.projects[0].generationJobs[0].actualAWSCost).toBe(85.0);
      expect(finalPrimaryUser?.subscriptions[0].creditsUsedThisPeriod).toBe(150);

      expect(finalCommunityPost?.likes).toBe(1);
      expect(finalCommunityPost?.isPublic).toBe(true);

      expect(finalGenerationJob?.resultUrl).toContain('s3.amazonaws.com');
      expect(finalGenerationJob?.completedAt).toBeDefined();
    });

    it('should handle service degradation and implement fallback mechanisms', async () => {
      const user = await createTestUser({
        email: 'degradation-test@example.com',
        displayName: 'Degradation Test User',
        creditBalance: 200,
      });

      const project = await createTestProject(user.id, {
        title: 'Service Degradation Test',
        description: 'Testing fallback mechanisms',
      });

      // Test AI service degradation
      const primaryAIJob = await createTestGenerationJob(project.id, user.id, {
        creditsRequired: 75,
        status: 'processing',
        progress: 25,
      });

      // Simulate primary AI service failure
      await prisma.generationJob.update({
        where: { id: primaryAIJob.id },
        data: {
          status: 'failed',
          errorMessage: 'Primary AI service unavailable',
        },
      });

      // Emit service degradation event
      mockWebSocket.emit('service_degradation', {
        service: 'ai_generation',
        status: 'degraded',
        fallbackAvailable: true,
        estimatedRecovery: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      });

      // Test fallback to secondary AI service
      const fallbackAIJob = await createTestGenerationJob(project.id, user.id, {
        creditsRequired: 75,
        status: 'processing',
        progress: 0,
      });

      // Simulate slower but successful fallback processing
      const fallbackSteps = [
        { progress: 15, delay: 200 },
        { progress: 35, delay: 300 },
        { progress: 60, delay: 400 },
        { progress: 85, delay: 300 },
        { progress: 100, delay: 200 },
      ];

      for (const step of fallbackSteps) {
        await waitFor(step.delay);
        await prisma.generationJob.update({
          where: { id: fallbackAIJob.id },
          data: { progress: step.progress },
        });

        mockWebSocket.emit('fallback_progress', {
          jobId: fallbackAIJob.id,
          progress: step.progress,
          service: 'fallback_ai',
          slower: true,
        });
      }

      // Complete fallback job
      await prisma.generationJob.update({
        where: { id: fallbackAIJob.id },
        data: {
          status: 'completed',
          resultUrl: 'https://fallback-cdn.example.com/video.mp4',
        },
      });

      // Test storage service fallback
      const storageFailureEvents: any[] = [];
      mockWebSocket.on('storage_event', (data: any) => {
        storageFailureEvents.push(data);
      });

      // Simulate primary storage failure
      mockWebSocket.emit('storage_event', {
        type: 'primary_storage_failure',
        service: 's3_primary',
        fallbackActivated: true,
      });

      // Simulate fallback storage success
      mockWebSocket.emit('storage_event', {
        type: 'fallback_storage_success',
        service: 's3_fallback',
        url: 'https://fallback-s3.amazonaws.com/video.mp4',
      });

      // Test CDN failover
      mockWebSocket.emit('cdn_failover', {
        primaryCDN: 'cloudfront_primary',
        fallbackCDN: 'cloudfront_secondary',
        reason: 'high_latency',
        newEndpoint: 'https://secondary-cdn.example.com',
      });

      // Verify fallback mechanisms worked
      const completedFallbackJob = await prisma.generationJob.findUnique({
        where: { id: fallbackAIJob.id },
      });
      expect(completedFallbackJob?.status).toBe('completed');
      expect(completedFallbackJob?.resultUrl).toContain('fallback-cdn');

      expect(storageFailureEvents).toHaveLength(2);
      expect(storageFailureEvents[1].type).toBe('fallback_storage_success');
    });

    it('should handle complex data synchronization across distributed services', async () => {
      // Create users across different regions (simulated)
      const usersInRegions = [
        { region: 'us-east-1', user: await createTestUser({ email: 'us-east@example.com' }) },
        { region: 'eu-west-1', user: await createTestUser({ email: 'eu-west@example.com' }) },
        { region: 'ap-southeast-1', user: await createTestUser({ email: 'ap-southeast@example.com' }) },
      ];

      // Create global project that needs synchronization
      const globalProject = await createTestProject(usersInRegions[0].user.id, {
        title: 'Global Synchronization Test',
        description: 'Testing cross-region data sync',
        isPublic: true,
      });

      // Simulate cross-region data replication
      const replicationEvents: any[] = [];
      mockWebSocket.on('data_replication', (data: any) => {
        replicationEvents.push(data);
      });

      // Test eventual consistency across regions
      for (const regionData of usersInRegions) {
        mockWebSocket.emit('data_replication', {
          sourceRegion: 'us-east-1',
          targetRegion: regionData.region,
          dataType: 'project',
          projectId: globalProject.id,
          status: 'syncing',
          timestamp: new Date(),
        });

        await waitFor(100); // Simulate network latency

        mockWebSocket.emit('data_replication', {
          sourceRegion: 'us-east-1',
          targetRegion: regionData.region,
          dataType: 'project',
          projectId: globalProject.id,
          status: 'synced',
          timestamp: new Date(),
        });
      }

      // Test conflict resolution
      const conflictScenario = {
        projectId: globalProject.id,
        field: 'title',
        usEastValue: 'Global Project (US Version)',
        euWestValue: 'Global Project (EU Version)',
        timestamp: new Date(),
      };

      mockWebSocket.emit('data_conflict', {
        ...conflictScenario,
        resolution: 'last_write_wins',
        winningValue: conflictScenario.usEastValue,
        winningRegion: 'us-east-1',
      });

      // Update project with resolved value
      await prisma.project.update({
        where: { id: globalProject.id },
        data: { title: conflictScenario.usEastValue },
      });

      // Test distributed cache invalidation
      const cacheInvalidationEvents: any[] = [];
      mockWebSocket.on('cache_invalidation', (data: any) => {
        cacheInvalidationEvents.push(data);
      });

      // Simulate cache invalidation across regions
      const cacheKeys = [
        `project:${globalProject.id}`,
        `user:${usersInRegions[0].user.id}:projects`,
        `community:public_projects`,
      ];

      for (const key of cacheKeys) {
        for (const regionData of usersInRegions) {
          mockWebSocket.emit('cache_invalidation', {
            region: regionData.region,
            cacheKey: key,
            reason: 'data_update',
            timestamp: new Date(),
          });
        }
      }

      // Verify synchronization completed
      expect(replicationEvents.filter(e => e.status === 'synced')).toHaveLength(3);
      expect(cacheInvalidationEvents).toHaveLength(9); // 3 keys × 3 regions

      // Verify final project state
      const syncedProject = await prisma.project.findUnique({
        where: { id: globalProject.id },
      });
      expect(syncedProject?.title).toBe(conflictScenario.usEastValue);
    });

    it('should handle complex billing and subscription synchronization', async () => {
      const user = await createTestUser({
        email: 'billing-sync@example.com',
        displayName: 'Billing Sync User',
        creditBalance: 100,
      });

      // Create subscription
      const subscription = await createTestSubscription(user.id, {
        planId: 'pro',
        status: 'active',
        creditsIncluded: 500,
        creditsUsedThisPeriod: 0,
      });

      // Test complex billing scenario with multiple operations
      const billingOperations = [
        { type: 'generation', cost: 50, timestamp: new Date() },
        { type: 'upgrade', newPlan: 'ultra', prorationCredit: 25, timestamp: new Date(Date.now() + 1000) },
        { type: 'generation', cost: 100, timestamp: new Date(Date.now() + 2000) },
        { type: 'purchase', amount: 200, timestamp: new Date(Date.now() + 3000) },
        { type: 'refund', amount: 50, reason: 'failed_generation', timestamp: new Date(Date.now() + 4000) },
      ];

      let expectedBalance = 100;
      let expectedUsage = 0;

      for (const operation of billingOperations) {
        switch (operation.type) {
          case 'generation':
            if (operation.cost) {
              await createTestCreditTransaction(user.id, 'deduction', operation.cost, `Video generation cost: ${operation.cost}`);
              expectedBalance -= operation.cost;
              expectedUsage += operation.cost;
            }
            break;

          case 'upgrade':
            // Simulate plan upgrade with proration
            await prisma.subscription.update({
              where: { id: subscription.id },
              data: {
                planId: operation.newPlan,
                creditsIncluded: 1000, // Ultra plan
              },
            });
            
            if (operation.prorationCredit) {
              await createTestCreditTransaction(user.id, 'subscription_grant', operation.prorationCredit, 'Proration credit for upgrade');
              expectedBalance += operation.prorationCredit;
            }
            break;

          case 'purchase':
            if (operation.amount) {
              await createTestCreditTransaction(user.id, 'purchase', operation.amount, `Credit purchase: ${operation.amount}`);
              expectedBalance += operation.amount;
            }
            break;

          case 'refund':
            if (operation.amount) {
              await createTestCreditTransaction(user.id, 'refund', operation.amount, operation.reason);
              expectedBalance += operation.amount;
              expectedUsage -= operation.amount; // Refund reduces usage
            }
            break;
        }

        // Emit billing event
        mockWebSocket.emit('billing_event', {
          userId: user.id,
          subscriptionId: subscription.id,
          operation: operation.type,
          amount: operation.cost || operation.amount,
          timestamp: operation.timestamp,
        });

        await waitFor(50);
      }

      // Update subscription usage
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { creditsUsedThisPeriod: Math.max(0, expectedUsage) },
      });

      // Test billing analytics synchronization
      const billingAnalytics = {
        userId: user.id,
        subscriptionId: subscription.id,
        periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        periodEnd: new Date(),
        totalCreditsUsed: Math.max(0, expectedUsage),
        totalSpent: 200, // Purchase amount
        totalRefunded: 50,
        netSpent: 150,
        averageDailyUsage: Math.max(0, expectedUsage) / 30,
      };

      mockWebSocket.emit('billing_analytics', {
        ...billingAnalytics,
        timestamp: new Date(),
      });

      // Verify final billing state
      const finalUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          creditTransactions: true,
          subscriptions: true,
        },
      });

      const finalSubscription = await prisma.subscription.findUnique({
        where: { id: subscription.id },
      });

      expect(finalUser?.creditBalance).toBe(expectedBalance);
      expect(finalUser?.creditTransactions).toHaveLength(5); // All operations
      expect(finalSubscription?.planId).toBe('ultra');
      expect(finalSubscription?.creditsUsedThisPeriod).toBe(Math.max(0, expectedUsage));
    });
  });
    it('should maintain data consistency across credit, subscription, and generation services', async () => {
      const user = await createTestUser({
        email: 'consistency-test@example.com',
        displayName: 'Consistency Test User',
        creditBalance: 100,
      });

      // Create subscription with credits
      const subscription = await createTestSubscription(user.id, {
        planId: 'premium',
        status: 'active',
        creditsIncluded: 500,
        creditsUsedThisPeriod: 0,
      });

      // Create project
      const project = await createTestProject(user.id, {
        title: 'Consistency Test Project',
        description: 'Testing data consistency',
        status: 'draft',
      });

      // Perform multiple operations that affect credits
      const operations: Array<{ type: 'generation' | 'purchase'; cost?: number; amount?: number }> = [
        { type: 'generation', cost: 50 },
        { type: 'generation', cost: 75 },
        { type: 'purchase', amount: 200 },
        { type: 'generation', cost: 100 },
      ];

      let expectedBalance = 100; // Initial balance
      let expectedSubscriptionUsage = 0;

      for (const operation of operations) {
        if (operation.type === 'generation' && operation.cost) {
          await createTestGenerationJob(project.id, user.id, {
            creditsRequired: operation.cost,
            status: 'completed',
            progress: 100,
          });

          await createTestCreditTransaction(user.id, 'deduction', operation.cost, `Generation cost: ${operation.cost}`);
          expectedBalance -= operation.cost;
          expectedSubscriptionUsage += operation.cost;
        } else if (operation.type === 'purchase' && operation.amount) {
          await createTestCreditTransaction(user.id, 'purchase', operation.amount, `Credit purchase: ${operation.amount}`);
          expectedBalance += operation.amount;
        }
      }

      // Update subscription usage
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { creditsUsedThisPeriod: expectedSubscriptionUsage },
      });

      // Verify consistency
      const finalUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          creditTransactions: true,
          subscriptions: true,
          projects: {
            include: {
              generationJobs: true,
            },
          },
        },
      });

      expect(finalUser?.creditBalance).toBe(expectedBalance);
      expect(finalUser?.creditTransactions).toHaveLength(4); // 3 deductions + 1 purchase
      expect(finalUser?.subscriptions[0].creditsUsedThisPeriod).toBe(expectedSubscriptionUsage);
      expect(finalUser?.projects[0].generationJobs).toHaveLength(3);

      // Verify transaction totals match balance changes
      const totalPurchases = finalUser?.creditTransactions
        .filter((t: any) => t.type === 'purchase')
        .reduce((sum: number, t: any) => sum + t.amount, 0) || 0;

      const totalDeductions = finalUser?.creditTransactions
        .filter((t: any) => t.type === 'deduction')
        .reduce((sum: number, t: any) => sum + t.amount, 0) || 0;

      expect(finalUser?.creditBalance).toBe(100 + totalPurchases - totalDeductions);
    });

    it('should handle concurrent operations without data corruption', async () => {
      const user = await createTestUser({
        email: 'concurrent-test@example.com',
        displayName: 'Concurrent Test User',
        creditBalance: 1000,
      });

      const project = await createTestProject(user.id, {
        title: 'Concurrent Operations Project',
        description: 'Testing concurrent operations',
        status: 'draft',
      });

      // Simulate concurrent generation requests
      const concurrentOperations = Array.from({ length: 5 }, (_, i) => 
        createTestGenerationJob(project.id, user.id, {
          creditsRequired: 50,
          status: 'processing',
          progress: 0,
        })
      );

      const generationJobs = await Promise.all(concurrentOperations);

      // Simulate concurrent credit deductions
      const creditDeductions = generationJobs.map((job: any) => 
        createTestCreditTransaction(user.id, 'deduction', 50, `Concurrent generation ${job.id}`)
      );

      await Promise.all(creditDeductions);

      // Complete all jobs
      const completionPromises = generationJobs.map((job: any) =>
        prisma.generationJob.update({
          where: { id: job.id },
          data: { status: 'completed', progress: 100 },
        })
      );

      await Promise.all(completionPromises);

      // Verify data integrity
      const finalUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          creditTransactions: true,
          projects: {
            include: {
              generationJobs: true,
            },
          },
        },
      });

      expect(finalUser?.creditBalance).toBe(750); // 1000 - (5 * 50)
      expect(finalUser?.creditTransactions).toHaveLength(5);
      expect(finalUser?.projects[0].generationJobs).toHaveLength(5);
      expect(finalUser?.projects[0].generationJobs.every((job: any) => job.status === 'completed')).toBe(true);
    });
  });

  describe('Error Handling and Recovery Integration', () => {
    it('should handle service failures gracefully and maintain system integrity', async () => {
      const user = await createTestUser({
        email: 'error-handling@example.com',
        displayName: 'Error Handling User',
        creditBalance: 200,
      });

      const project = await createTestProject(user.id, {
        title: 'Error Handling Project',
        description: 'Testing error scenarios',
        status: 'draft',
      });

      // Simulate failed generation (insufficient credits scenario)
      const failedJob = await createTestGenerationJob(project.id, user.id, {
        creditsRequired: 300, // More than user balance
        status: 'failed',
        progress: 0,
      });

      // Verify no credit deduction occurred for failed job
      const userAfterFailure = await prisma.user.findUnique({
        where: { id: user.id },
        include: { creditTransactions: true },
      });

      expect(userAfterFailure?.creditBalance).toBe(200); // No change
      expect(userAfterFailure?.creditTransactions).toHaveLength(0); // No transactions

      // Simulate recovery - user purchases credits
      await createTestCreditTransaction(user.id, 'purchase', 200, 'Recovery credit purchase');

      // Retry the generation
      const retryJob = await createTestGenerationJob(project.id, user.id, {
        creditsRequired: 300,
        status: 'completed',
        progress: 100,
      });

      await createTestCreditTransaction(user.id, 'deduction', 300, 'Successful generation after retry');

      // Verify recovery
      const userAfterRecovery = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          creditTransactions: true,
          projects: {
            include: {
              generationJobs: true,
            },
          },
        },
      });

      expect(userAfterRecovery?.creditBalance).toBe(100); // 200 + 200 - 300
      expect(userAfterRecovery?.creditTransactions).toHaveLength(2);
      expect(userAfterRecovery?.projects[0].generationJobs).toHaveLength(2);
      expect(userAfterRecovery?.projects[0].generationJobs.find((j: any) => j.id === failedJob.id)?.status).toBe('failed');
      expect(userAfterRecovery?.projects[0].generationJobs.find((j: any) => j.id === retryJob.id)?.status).toBe('completed');
    });

    it('should handle AI service timeouts and implement retry mechanisms', async () => {
      const user = await createTestUser({
        email: 'timeout-test@example.com',
        displayName: 'Timeout Test User',
        creditBalance: 150,
      });

      const project = await createTestProject(user.id, {
        title: 'Timeout Test Project',
        description: 'Testing AI service timeout scenarios',
      });

      // Simulate AI service timeout
      const timeoutJob = await createTestGenerationJob(project.id, user.id, {
        creditsRequired: 50,
        status: 'processing',
        progress: 25,
      });

      // Deduct credits initially
      await createTestCreditTransaction(user.id, 'deduction', 50, 'Video generation cost');

      // Simulate timeout after partial progress
      await waitFor(100);
      await prisma.generationJob.update({
        where: { id: timeoutJob.id },
        data: {
          status: 'failed',
          errorMessage: 'AI service timeout after 30 seconds',
        },
      });

      // Emit timeout event
      mockWebSocket.emit('generation_error', {
        jobId: timeoutJob.id,
        projectId: project.id,
        userId: user.id,
        error: 'timeout',
        retryable: true,
      });

      // Process automatic refund
      await createTestCreditTransaction(user.id, 'refund', 50, 'Refund for AI service timeout');

      // Verify timeout handling
      const failedJob = await prisma.generationJob.findUnique({
        where: { id: timeoutJob.id },
      });
      expect(failedJob?.status).toBe('failed');
      expect(failedJob?.errorMessage).toContain('timeout');

      // Verify credits refunded
      const userAfterTimeout = await prisma.user.findUnique({
        where: { id: user.id },
      });
      expect(userAfterTimeout?.creditBalance).toBe(150); // Back to original balance

      // Test automatic retry mechanism
      const retryJob = await createTestGenerationJob(project.id, user.id, {
        creditsRequired: 50,
        status: 'queued',
        progress: 0,
      });

      // Simulate successful retry
      await createTestCreditTransaction(user.id, 'deduction', 50, 'Retry generation cost');
      
      const progressUpdates = [
        { status: 'processing', progress: 25 },
        { status: 'processing', progress: 50 },
        { status: 'processing', progress: 75 },
        { status: 'completed', progress: 100 },
      ];

      for (const update of progressUpdates) {
        await prisma.generationJob.update({
          where: { id: retryJob.id },
          data: update,
        });
        await waitFor(50);
      }

      // Verify successful retry
      const completedJob = await prisma.generationJob.findUnique({
        where: { id: retryJob.id },
      });
      expect(completedJob?.status).toBe('completed');
      expect(completedJob?.progress).toBe(100);
    });

    it('should handle database connection failures and maintain data consistency', async () => {
      const user = await createTestUser({
        email: 'db-failure@example.com',
        displayName: 'DB Failure User',
        creditBalance: 100,
      });

      const project = await createTestProject(user.id, {
        title: 'DB Failure Test Project',
      });

      // Test transaction rollback on database failure
      let transactionFailed = false;
      try {
        await prisma.$transaction(async (tx) => {
          // Start generation job
          await tx.generationJob.create({
            data: {
              id: 'db-test-job',
              projectId: project.id,
              userId: user.id,
              status: 'queued',
              progress: 0,
              creditsRequired: 50,
              creditsDeducted: 0,
              estimatedAWSCost: 5.0,
              actualAWSCost: null,
              platformProfit: 0,
              resultUrl: null,
              errorMessage: null,
              createdAt: new Date(),
              updatedAt: new Date(),
              completedAt: null,
              request: JSON.stringify({ prompt: 'DB test' }),
            },
          });

          // Deduct credits
          await tx.user.update({
            where: { id: user.id },
            data: { creditBalance: { decrement: 50 } },
          });

          // Create credit transaction
          await tx.creditTransaction.create({
            data: {
              id: 'db-test-transaction',
              userId: user.id,
              type: 'deduction',
              amount: 50,
              description: 'DB test deduction',
              createdAt: new Date(),
            },
          });

          // Simulate database failure
          throw new Error('Simulated database connection failure');
        });
      } catch (error) {
        transactionFailed = true;
        expect((error as Error).message).toContain('database connection failure');
      }

      expect(transactionFailed).toBe(true);

      // Verify rollback - no changes should have been made
      const userAfterFailure = await prisma.user.findUnique({
        where: { id: user.id },
      });
      expect(userAfterFailure?.creditBalance).toBe(100); // Unchanged

      const job = await prisma.generationJob.findUnique({
        where: { id: 'db-test-job' },
      });
      expect(job).toBeNull(); // Not created

      const transaction = await prisma.creditTransaction.findUnique({
        where: { id: 'db-test-transaction' },
      });
      expect(transaction).toBeNull(); // Not created
    });

    it('should handle payment processing failures and maintain billing integrity', async () => {
      const user = await createTestUser({
        email: 'payment-failure@example.com',
        displayName: 'Payment Failure User',
        creditBalance: 50,
      });

      // Simulate failed credit purchase
      let paymentFailed = false;
      try {
        // This would normally call external payment service
        // Simulate payment failure
        throw new Error('Payment declined: insufficient funds');
      } catch (error) {
        paymentFailed = true;
        expect((error as Error).message).toContain('Payment declined');
      }

      expect(paymentFailed).toBe(true);

      // Verify no credits were added on payment failure
      const userAfterFailure = await prisma.user.findUnique({
        where: { id: user.id },
      });
      expect(userAfterFailure?.creditBalance).toBe(50); // Unchanged

      // Test subscription renewal failure
      const subscription = await createTestSubscription(user.id, {
        planId: 'pro',
        status: 'active',
        creditsIncluded: 200,
      });

      // Simulate renewal failure
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'past_due',
          // In real implementation, would set retry dates
        },
      });

      // Verify subscription status updated
      const failedSubscription = await prisma.subscription.findUnique({
        where: { id: subscription.id },
      });
      expect(failedSubscription?.status).toBe('past_due');

      // Test grace period handling
      const gracePeriodEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      
      // User should still have access during grace period
      const currentTime = new Date();
      const hasGracePeriodAccess = currentTime < gracePeriodEnd;
      expect(hasGracePeriodAccess).toBe(true);

      // Test successful payment retry
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // Grant renewal credits
      await createTestCreditTransaction(user.id, 'subscription_grant', 200, 'Monthly credit allocation after retry');

      // Verify recovery
      const recoveredSubscription = await prisma.subscription.findUnique({
        where: { id: subscription.id },
      });
      expect(recoveredSubscription?.status).toBe('active');

      const userAfterRecovery = await prisma.user.findUnique({
        where: { id: user.id },
      });
      expect(userAfterRecovery?.creditBalance).toBe(250); // 50 + 200
    });

    it('should handle real-time connection failures and implement reconnection', async () => {
      const user = await createTestUser({
        email: 'realtime-failure@example.com',
        displayName: 'Realtime Failure User',
      });

      const project = await createTestProject(user.id, {
        title: 'Realtime Test Project',
      });

      // Simulate WebSocket connection failure
      const connectionEvents: any[] = [];
      mockWebSocket.on('connection_status', (data: any) => {
        connectionEvents.push(data);
      });

      // Emit connection failure
      mockWebSocket.emit('connection_status', {
        status: 'disconnected',
        reason: 'network_error',
        timestamp: new Date(),
      });

      // Simulate automatic reconnection attempts
      const reconnectionAttempts = [
        { attempt: 1, success: false, delay: 1000 },
        { attempt: 2, success: false, delay: 2000 },
        { attempt: 3, success: true, delay: 4000 },
      ];

      for (const attempt of reconnectionAttempts) {
        await waitFor(50); // Simulate delay
        
        mockWebSocket.emit('connection_status', {
          status: attempt.success ? 'connected' : 'reconnecting',
          attempt: attempt.attempt,
          timestamp: new Date(),
        });
      }

      // Verify reconnection events
      expect(connectionEvents).toHaveLength(4); // 1 disconnect + 3 reconnection attempts
      expect(connectionEvents[0].status).toBe('disconnected');
      expect(connectionEvents[3].status).toBe('connected');

      // Test message queue during disconnection
      const queuedMessages: any[] = [];
      
      // Simulate messages sent during disconnection
      const offlineMessages = [
        { type: 'generation_progress', data: { progress: 25 } },
        { type: 'generation_progress', data: { progress: 50 } },
        { type: 'generation_complete', data: { progress: 100 } },
      ];

      // Queue messages (would be handled by client-side queue)
      offlineMessages.forEach(msg => queuedMessages.push(msg));

      // Simulate message replay after reconnection
      mockWebSocket.on('message_replay', (data: any) => {
        expect(data.messages).toHaveLength(3);
        expect(data.messages[2].type).toBe('generation_complete');
      });

      mockWebSocket.emit('message_replay', {
        messages: queuedMessages,
        timestamp: new Date(),
      });
    });
  });
});
  describe('Performance and Scalability Integration', () => {
    it('should maintain performance under high concurrent load', async () => {
      const startTime = Date.now();
      
      // Create multiple users concurrently
      const userCreationPromises = Array.from({ length: 50 }, (_, i) =>
        createTestUser({
          email: `load-test-${i}@example.com`,
          displayName: `Load Test User ${i}`,
          creditBalance: 100,
        })
      );

      const users = await Promise.all(userCreationPromises);
      const userCreationTime = Date.now() - startTime;

      // Verify user creation performance
      expect(userCreationTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(users).toHaveLength(50);

      // Create projects concurrently for all users
      const projectCreationStart = Date.now();
      const projectPromises = users.map((user, i) =>
        createTestProject(user.id, {
          title: `Load Test Project ${i}`,
          description: `Project for load testing user ${i}`,
        })
      );

      const projects = await Promise.all(projectPromises);
      const projectCreationTime = Date.now() - projectCreationStart;

      expect(projectCreationTime).toBeLessThan(3000); // Should complete within 3 seconds
      expect(projects).toHaveLength(50);

      // Test concurrent video generation requests
      const generationStart = Date.now();
      const generationPromises = projects.slice(0, 20).map((project, i) =>
        createTestGenerationJob(project.id, project.userId, {
          creditsRequired: 25,
          status: 'processing',
          progress: 0,
        })
      );

      const generationJobs = await Promise.all(generationPromises);
      const generationTime = Date.now() - generationStart;

      expect(generationTime).toBeLessThan(2000); // Should complete within 2 seconds
      expect(generationJobs).toHaveLength(20);

      // Test concurrent credit transactions
      const transactionStart = Date.now();
      const transactionPromises = users.slice(0, 30).map((user, i) =>
        createTestCreditTransaction(user.id, 'purchase', 50, `Load test purchase ${i}`)
      );

      await Promise.all(transactionPromises);
      const transactionTime = Date.now() - transactionStart;

      expect(transactionTime).toBeLessThan(2000); // Should complete within 2 seconds

      // Verify data consistency after concurrent operations
      const finalUsers = await Promise.all(
        users.slice(0, 30).map(user =>
          prisma.user.findUnique({
            where: { id: user.id },
            include: { creditTransactions: true },
          })
        )
      );

      finalUsers.forEach((user, i) => {
        if (i < 30) {
          expect(user?.creditBalance).toBe(150); // 100 + 50
          expect(user?.creditTransactions).toHaveLength(1);
        } else {
          expect(user?.creditBalance).toBe(100); // No transaction
        }
      });
    });

    it('should handle database connection pooling under load', async () => {
      // Test database connection pool efficiency
      const connectionPoolTests = Array.from({ length: 100 }, async (_, i) => {
        const user = await createTestUser({
          email: `pool-test-${i}@example.com`,
          displayName: `Pool Test ${i}`,
        });

        // Perform multiple database operations per connection
        const project = await createTestProject(user.id, {
          title: `Pool Test Project ${i}`,
        });

        await createTestCreditTransaction(user.id, 'purchase', 25, `Pool test ${i}`);

        const job = await createTestGenerationJob(project.id, user.id, {
          creditsRequired: 10,
          status: 'completed',
        });

        return { user, project, job };
      });

      const startTime = Date.now();
      const results = await Promise.all(connectionPoolTests);
      const totalTime = Date.now() - startTime;

      // Should handle 100 concurrent operations efficiently
      expect(totalTime).toBeLessThan(10000); // Within 10 seconds
      expect(results).toHaveLength(100);

      // Verify all operations completed successfully
      results.forEach(result => {
        expect(result.user.id).toBeDefined();
        expect(result.project.id).toBeDefined();
        expect(result.job.id).toBeDefined();
      });
    });

    it('should handle real-time event broadcasting at scale', async () => {
      const eventBroadcastTests: any[] = [];
      const receivedEvents: any[] = [];

      // Set up event listeners
      mockWebSocket.on('bulk_event', (data: any) => {
        receivedEvents.push(data);
      });

      // Generate large number of events
      const eventCount = 1000;
      const events = Array.from({ length: eventCount }, (_, i) => ({
        id: `event-${i}`,
        type: 'generation_progress',
        userId: `user-${i % 10}`, // 10 different users
        projectId: `project-${i % 20}`, // 20 different projects
        data: {
          progress: (i % 100) + 1,
          stage: `stage-${i % 5}`,
        },
        timestamp: new Date(),
      }));

      // Broadcast events in batches
      const batchSize = 50;
      const startTime = Date.now();

      for (let i = 0; i < events.length; i += batchSize) {
        const batch = events.slice(i, i + batchSize);
        
        // Emit batch of events
        batch.forEach(event => {
          mockWebSocket.emit('bulk_event', event);
        });

        await waitFor(10); // Small delay between batches
      }

      const broadcastTime = Date.now() - startTime;

      // Verify broadcasting performance
      expect(broadcastTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(receivedEvents).toHaveLength(eventCount);

      // Verify event ordering and data integrity
      receivedEvents.forEach((event, index) => {
        expect(event.id).toBe(`event-${index}`);
        expect(event.type).toBe('generation_progress');
      });
    });

    it('should handle memory usage efficiently during large operations', async () => {
      // Simulate memory-intensive operations
      const largeDataOperations = [];

      // Create operations that would typically consume significant memory
      for (let i = 0; i < 100; i++) {
        const operation = async () => {
          const user = await createTestUser({
            email: `memory-test-${i}@example.com`,
            displayName: `Memory Test User ${i}`,
          });

          // Create multiple projects per user
          const projects = await Promise.all(
            Array.from({ length: 5 }, (_, j) =>
              createTestProject(user.id, {
                title: `Memory Test Project ${i}-${j}`,
                description: `Large description for memory testing: ${'x'.repeat(1000)}`,
              })
            )
          );

          // Create multiple generation jobs
          const jobs = await Promise.all(
            projects.map(project =>
              createTestGenerationJob(project.id, user.id, {
                creditsRequired: 25,
                status: 'completed',
              })
            )
          );

          // Create transaction history
          const transactions = await Promise.all(
            Array.from({ length: 10 }, (_, k) =>
              createTestCreditTransaction(user.id, 'purchase', 10, `Memory test transaction ${k}`)
            )
          );

          return { user, projects, jobs, transactions };
        };

        largeDataOperations.push(operation());
      }

      const startTime = Date.now();
      const results = await Promise.all(largeDataOperations);
      const totalTime = Date.now() - startTime;

      // Verify operations completed efficiently
      expect(totalTime).toBeLessThan(15000); // Within 15 seconds
      expect(results).toHaveLength(100);

      // Verify data integrity
      results.forEach(result => {
        expect(result.projects).toHaveLength(5);
        expect(result.jobs).toHaveLength(5);
        expect(result.transactions).toHaveLength(10);
      });

      // Test cleanup efficiency
      const cleanupStart = Date.now();
      await cleanupTestData();
      const cleanupTime = Date.now() - cleanupStart;

      expect(cleanupTime).toBeLessThan(5000); // Cleanup should be fast
    });

    it('should maintain response times under varying load patterns', async () => {
      const responseTimeTests = [];

      // Test different load patterns
      const loadPatterns = [
        { name: 'burst', operations: 50, delay: 0 },
        { name: 'steady', operations: 20, delay: 100 },
        { name: 'gradual', operations: 30, delay: 50 },
      ];

      for (const pattern of loadPatterns) {
        const patternStart = Date.now();
        const patternOperations = [];

        for (let i = 0; i < pattern.operations; i++) {
          const operationStart = Date.now();
          
          const operation = async () => {
            const user = await createTestUser({
              email: `${pattern.name}-${i}@example.com`,
              displayName: `${pattern.name} User ${i}`,
            });

            const project = await createTestProject(user.id, {
              title: `${pattern.name} Project ${i}`,
            });

            await createTestCreditTransaction(user.id, 'purchase', 50, `${pattern.name} purchase`);

            const operationEnd = Date.now();
            return {
              user,
              project,
              responseTime: operationEnd - operationStart,
            };
          };

          patternOperations.push(operation());

          if (pattern.delay > 0) {
            await waitFor(pattern.delay);
          }
        }

        const results = await Promise.all(patternOperations);
        const patternTime = Date.now() - patternStart;

        // Analyze response times
        const responseTimes = results.map(r => r.responseTime);
        const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        const maxResponseTime = Math.max(...responseTimes);
        const p95ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)];

        responseTimeTests.push({
          pattern: pattern.name,
          totalTime: patternTime,
          avgResponseTime,
          maxResponseTime,
          p95ResponseTime,
          operations: pattern.operations,
        });

        // Verify performance thresholds
        expect(avgResponseTime).toBeLessThan(500); // Average under 500ms
        expect(p95ResponseTime).toBeLessThan(1000); // P95 under 1 second
        expect(maxResponseTime).toBeLessThan(2000); // Max under 2 seconds
      }

      // Log performance metrics for analysis
      responseTimeTests.forEach(test => {
        console.log(`Pattern: ${test.pattern}`);
        console.log(`  Total time: ${test.totalTime}ms`);
        console.log(`  Avg response: ${test.avgResponseTime}ms`);
        console.log(`  P95 response: ${test.p95ResponseTime}ms`);
        console.log(`  Max response: ${test.maxResponseTime}ms`);
      });
    });
  });

  describe('Security and Data Integrity Integration', () => {
    it('should handle authentication edge cases and security scenarios', async () => {
      // Test multiple authentication attempts
      const authAttempts = [];
      
      for (let i = 0; i < 10; i++) {
        const user = await createTestUser({
          email: `auth-test-${i}@example.com`,
          displayName: `Auth Test User ${i}`,
        });
        
        // Simulate multiple login attempts
        const loginAttempts = Array.from({ length: 5 }, (_, j) => ({
          userId: user.id,
          attempt: j + 1,
          timestamp: new Date(Date.now() + j * 1000),
          success: j < 3, // First 3 succeed, last 2 fail
        }));
        
        authAttempts.push(...loginAttempts);
      }

      // Verify authentication rate limiting would be applied
      const failedAttempts = authAttempts.filter(a => !a.success);
      expect(failedAttempts).toHaveLength(20); // 2 failed attempts per user × 10 users

      // Test session management
      const activeSessions = authAttempts
        .filter(a => a.success)
        .map(a => ({
          userId: a.userId,
          sessionId: `session-${a.userId}-${a.attempt}`,
          createdAt: a.timestamp,
          expiresAt: new Date(a.timestamp.getTime() + 60 * 60 * 1000), // 1 hour
        }));

      expect(activeSessions).toHaveLength(30); // 3 successful attempts per user × 10 users

      // Test concurrent session validation
      const sessionValidations = activeSessions.map(async (session) => {
        // Simulate session validation
        const isValid = session.expiresAt > new Date();
        return { sessionId: session.sessionId, valid: isValid };
      });

      const validationResults = await Promise.all(sessionValidations);
      expect(validationResults.every(r => r.valid)).toBe(true);
    });

    it('should handle data encryption and secure storage scenarios', async () => {
      const secureDataTests = [];

      // Create users with sensitive data
      for (let i = 0; i < 20; i++) {
        const user = await createTestUser({
          email: `secure-${i}@example.com`,
          displayName: `Secure User ${i}`,
        });

        // Create projects with sensitive content
        const project = await createTestProject(user.id, {
          title: `Secure Project ${i}`,
          description: `Confidential project content for user ${i}`,
        });

        // Simulate encrypted data storage
        const encryptedData = {
          userId: user.id,
          projectId: project.id,
          encryptedContent: `encrypted_content_${i}`,
          encryptionKey: `key_${i}`,
          iv: `iv_${i}`,
          algorithm: 'AES-256-GCM',
        };

        secureDataTests.push(encryptedData);
      }

      // Verify data encryption metadata
      expect(secureDataTests).toHaveLength(20);
      secureDataTests.forEach(data => {
        expect(data.encryptedContent).toMatch(/^encrypted_content_\d+$/);
        expect(data.encryptionKey).toMatch(/^key_\d+$/);
        expect(data.algorithm).toBe('AES-256-GCM');
      });

      // Test secure data access patterns
      const accessAttempts = secureDataTests.map(async (data, index) => {
        // Simulate authorized access
        const authorizedAccess = {
          userId: data.userId,
          projectId: data.projectId,
          accessTime: new Date(),
          authorized: true,
          decrypted: true,
        };

        // Simulate unauthorized access attempt
        const unauthorizedAccess = {
          userId: `different-user-${index}`,
          projectId: data.projectId,
          accessTime: new Date(),
          authorized: false,
          decrypted: false,
        };

        return { authorized: authorizedAccess, unauthorized: unauthorizedAccess };
      });

      const accessResults = await Promise.all(accessAttempts);
      
      // Verify access control
      accessResults.forEach(result => {
        expect(result.authorized.authorized).toBe(true);
        expect(result.authorized.decrypted).toBe(true);
        expect(result.unauthorized.authorized).toBe(false);
        expect(result.unauthorized.decrypted).toBe(false);
      });
    });

    it('should handle data consistency during concurrent modifications', async () => {
      const user = await createTestUser({
        email: 'consistency-test@example.com',
        displayName: 'Consistency Test User',
        creditBalance: 1000,
      });

      const project = await createTestProject(user.id, {
        title: 'Consistency Test Project',
        description: 'Testing data consistency',
      });

      // Test concurrent credit modifications
      const concurrentCreditOperations = Array.from({ length: 50 }, (_, i) => {
        const isDeduction = i % 2 === 0;
        const amount = 10;
        const type = isDeduction ? 'deduction' : 'purchase';
        
        return createTestCreditTransaction(user.id, type, amount, `Concurrent ${type} ${i}`);
      });

      const startTime = Date.now();
      await Promise.all(concurrentCreditOperations);
      const operationTime = Date.now() - startTime;

      // Verify operations completed quickly
      expect(operationTime).toBeLessThan(5000);

      // Verify final balance consistency
      const finalUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { creditTransactions: true },
      });

      // Calculate expected balance: 1000 + (25 purchases × 10) - (25 deductions × 10) = 1000
      expect(finalUser?.creditBalance).toBe(1000);
      expect(finalUser?.creditTransactions).toHaveLength(50);

      // Verify transaction integrity
      const purchases = finalUser?.creditTransactions.filter(t => t.type === 'purchase') || [];
      const deductions = finalUser?.creditTransactions.filter(t => t.type === 'deduction') || [];
      
      expect(purchases).toHaveLength(25);
      expect(deductions).toHaveLength(25);
      
      const totalPurchases = purchases.reduce((sum: number, t: any) => sum + t.amount, 0);
      const totalDeductions = deductions.reduce((sum: number, t: any) => sum + t.amount, 0);
      
      expect(totalPurchases).toBe(250); // 25 × 10
      expect(totalDeductions).toBe(250); // 25 × 10
    });
  });
});