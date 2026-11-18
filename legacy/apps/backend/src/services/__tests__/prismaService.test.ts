import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { initializePrisma, disconnectPrisma, getPrisma } from '../../config/prisma.js';
import { PrismaService } from '../prismaService.js';
import type { User, UserRole, Project, CreditTransaction } from '@ai-video-studio/types';

describe('PrismaService', () => {
  let prismaService: PrismaService;
  let testUser: User;

  beforeAll(async () => {
    // Initialize Prisma for testing
    await initializePrisma();
    prismaService = new PrismaService();
  });

  afterAll(async () => {
    // Clean up test data and disconnect
    const prisma = getPrisma();
    
    // Clean up test data
    await prisma.creditTransaction.deleteMany({
      where: { user: { email: { contains: 'test-' } } }
    });
    await prisma.project.deleteMany({
      where: { user: { email: { contains: 'test-' } } }
    });
    await prisma.subscription.deleteMany({
      where: { user: { email: { contains: 'test-' } } }
    });
    await prisma.user.deleteMany({
      where: { email: { contains: 'test-' } }
    });

    await disconnectPrisma();
  });

  beforeEach(async () => {
    // Create a test user for each test
    const uniqueEmail = `test-user-${Date.now()}@example.com`;
    testUser = await prismaService.createUser({
      email: uniqueEmail,
      authProviderId: `auth0|test-${Date.now()}`,
      displayName: 'Test User',
      language: 'en',
      timezone: 'UTC',
      role: 'user' as UserRole,
    });
  });

  describe('User Operations', () => {
    it('should create a user successfully', async () => {
      const userData = {
        email: `test-create-${Date.now()}@example.com`,
        authProviderId: `auth0|create-${Date.now()}`,
        displayName: 'Create Test User',
        language: 'en',
        timezone: 'UTC',
        role: 'user' as UserRole,
      };

      const user = await prismaService.createUser(userData);

      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.authProviderId).toBe(userData.authProviderId);
      expect(user.displayName).toBe(userData.displayName);
      expect(user.creditBalance).toBe(0);
      expect(user.isActive).toBe(true);
    });

    it('should get user by ID', async () => {
      const user = await prismaService.getUserById(testUser.id);

      expect(user).toBeDefined();
      expect(user!.id).toBe(testUser.id);
      expect(user!.email).toBe(testUser.email);
    });

    it('should get user by auth provider ID', async () => {
      const user = await prismaService.getUserByAuthProviderId(testUser.authProviderId);

      expect(user).toBeDefined();
      expect(user!.id).toBe(testUser.id);
      expect(user!.authProviderId).toBe(testUser.authProviderId);
    });

    it('should get user by email', async () => {
      const user = await prismaService.getUserByEmail(testUser.email);

      expect(user).toBeDefined();
      expect(user!.id).toBe(testUser.id);
      expect(user!.email).toBe(testUser.email);
    });

    it('should update user successfully', async () => {
      const updates = {
        displayName: 'Updated Test User',
        language: 'es',
        timezone: 'America/New_York',
      };

      const updatedUser = await prismaService.updateUser(testUser.id, updates);

      expect(updatedUser.displayName).toBe(updates.displayName);
      expect(updatedUser.language).toBe(updates.language);
      expect(updatedUser.timezone).toBe(updates.timezone);
    });

    it('should soft delete user', async () => {
      await prismaService.softDeleteUser(testUser.id);

      const user = await prismaService.getUserById(testUser.id);
      expect(user).toBeNull(); // Should not find inactive user
    });

    it('should update last login', async () => {
      const beforeUpdate = new Date();
      await prismaService.updateLastLogin(testUser.id);

      const user = await prismaService.getUserById(testUser.id);
      expect(user!.lastLoginAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    });
  });

  describe('Project Operations', () => {
    it('should create a project successfully', async () => {
      const projectData = {
        userId: testUser.id,
        title: 'Test Project',
        description: 'A test project for unit testing',
        settings: {
          resolution: 'hd',
          duration: 60,
          style: 'cinematic',
        },
      };

      const project = await prismaService.createProject(projectData);

      expect(project).toBeDefined();
      expect(project.title).toBe(projectData.title);
      expect(project.description).toBe(projectData.description);
      expect(project.userId).toBe(testUser.id);
      expect(project.status).toBe('draft');
      expect(project.isPublic).toBe(false);
    });

    it('should get user projects', async () => {
      // Create multiple projects
      const project1 = await prismaService.createProject({
        userId: testUser.id,
        title: 'Project 1',
        settings: {},
      });

      const project2 = await prismaService.createProject({
        userId: testUser.id,
        title: 'Project 2',
        settings: {},
      });

      const projects = await prismaService.getUserProjects(testUser.id);

      expect(projects).toHaveLength(2);
      expect(projects.map(p => p.title)).toContain('Project 1');
      expect(projects.map(p => p.title)).toContain('Project 2');
    });

    it('should update project successfully', async () => {
      const project = await prismaService.createProject({
        userId: testUser.id,
        title: 'Original Title',
        settings: {},
      });

      const updates = {
        title: 'Updated Title',
        description: 'Updated description',
        status: 'completed' as const,
      };

      const updatedProject = await prismaService.updateProject(project.id, updates);

      expect(updatedProject.title).toBe(updates.title);
      expect(updatedProject.description).toBe(updates.description);
      expect(updatedProject.status).toBe(updates.status);
    });

    it('should delete project successfully', async () => {
      const project = await prismaService.createProject({
        userId: testUser.id,
        title: 'Project to Delete',
        settings: {},
      });

      await prismaService.deleteProject(project.id);

      // Verify project is deleted
      const projects = await prismaService.getUserProjects(testUser.id);
      expect(projects.find(p => p.id === project.id)).toBeUndefined();
    });
  });

  describe('Credit Operations', () => {
    it('should create credit transaction successfully', async () => {
      const transactionData = {
        userId: testUser.id,
        type: 'purchase' as const,
        amount: 100,
        description: 'Test credit purchase',
        awsCostCovered: 0,
        platformProfit: 5.00,
      };

      const transaction = await prismaService.createCreditTransaction(transactionData);

      expect(transaction).toBeDefined();
      expect(transaction.userId).toBe(testUser.id);
      expect(transaction.type).toBe(transactionData.type);
      expect(transaction.amount).toBe(transactionData.amount);
      expect(transaction.description).toBe(transactionData.description);
    });

    it('should update user credit balance after transaction', async () => {
      const initialBalance = testUser.creditBalance;

      await prismaService.createCreditTransaction({
        userId: testUser.id,
        type: 'purchase',
        amount: 50,
        description: 'Test credit addition',
      });

      const updatedUser = await prismaService.getUserById(testUser.id);
      expect(updatedUser!.creditBalance).toBe(initialBalance + 50);
    });

    it('should get user credit history', async () => {
      // Create multiple transactions
      await prismaService.createCreditTransaction({
        userId: testUser.id,
        type: 'purchase',
        amount: 100,
        description: 'Purchase 1',
      });

      await prismaService.createCreditTransaction({
        userId: testUser.id,
        type: 'deduction',
        amount: -25,
        description: 'Video generation',
      });

      const history = await prismaService.getUserCreditHistory(testUser.id);

      expect(history).toHaveLength(2);
      expect(history[0].description).toBe('Video generation'); // Most recent first
      expect(history[1].description).toBe('Purchase 1');
    });
  });

  describe('Generation Job Operations', () => {
    let testProject: Project;

    beforeEach(async () => {
      testProject = await prismaService.createProject({
        userId: testUser.id,
        title: 'Test Project for Jobs',
        settings: {},
      });
    });

    it('should create generation job successfully', async () => {
      const jobData = {
        projectId: testProject.id,
        userId: testUser.id,
        operationType: 'video_generation' as const,
        requestData: {
          prompt: 'Generate a test video',
          duration: 30,
        },
        creditsRequired: 50,
        estimatedAWSCost: 2.50,
        platformProfit: 2.50,
      };

      const job = await prismaService.createGenerationJob(jobData);

      expect(job).toBeDefined();
      expect(job.projectId).toBe(testProject.id);
      expect(job.userId).toBe(testUser.id);
      expect(job.operationType).toBe(jobData.operationType);
      expect(job.status).toBe('queued');
      expect(job.progress).toBe(0);
    });

    it('should update generation job successfully', async () => {
      const job = await prismaService.createGenerationJob({
        projectId: testProject.id,
        userId: testUser.id,
        operationType: 'video_generation',
        requestData: { prompt: 'test' },
        creditsRequired: 50,
        estimatedAWSCost: 2.50,
        platformProfit: 2.50,
      });

      const updates = {
        status: 'processing' as const,
        progress: 50,
        creditsDeducted: 50,
      };

      const updatedJob = await prismaService.updateGenerationJob(job.id, updates);

      expect(updatedJob.status).toBe(updates.status);
      expect(updatedJob.progress).toBe(updates.progress);
      expect(updatedJob.creditsDeducted).toBe(updates.creditsDeducted);
    });

    it('should get generation job by ID', async () => {
      const job = await prismaService.createGenerationJob({
        projectId: testProject.id,
        userId: testUser.id,
        operationType: 'script_generation',
        requestData: { prompt: 'test script' },
        creditsRequired: 25,
        estimatedAWSCost: 1.25,
        platformProfit: 1.25,
      });

      const retrievedJob = await prismaService.getGenerationJob(job.id);

      expect(retrievedJob).toBeDefined();
      expect(retrievedJob!.id).toBe(job.id);
      expect(retrievedJob!.operationType).toBe('script_generation');
    });
  });

  describe('Media Asset Operations', () => {
    let testProject: Project;

    beforeEach(async () => {
      testProject = await prismaService.createProject({
        userId: testUser.id,
        title: 'Test Project for Assets',
        settings: {},
      });
    });

    it('should create media asset successfully', async () => {
      const assetData = {
        projectId: testProject.id,
        filename: 'test-video.mp4',
        originalName: 'My Test Video.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 1024000,
        url: 'https://example.com/test-video.mp4',
        thumbnailUrl: 'https://example.com/test-video-thumb.jpg',
        metadata: {
          duration: 30,
          resolution: '1920x1080',
        },
      };

      const asset = await prismaService.createMediaAsset(assetData);

      expect(asset).toBeDefined();
      expect(asset.projectId).toBe(testProject.id);
      expect(asset.filename).toBe(assetData.filename);
      expect(asset.originalName).toBe(assetData.originalName);
      expect(asset.mimeType).toBe(assetData.mimeType);
      expect(asset.sizeBytes).toBe(assetData.sizeBytes);
    });

    it('should get project assets', async () => {
      // Create multiple assets
      await prismaService.createMediaAsset({
        projectId: testProject.id,
        filename: 'asset1.jpg',
        originalName: 'Asset 1.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 500000,
        url: 'https://example.com/asset1.jpg',
      });

      await prismaService.createMediaAsset({
        projectId: testProject.id,
        filename: 'asset2.mp4',
        originalName: 'Asset 2.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 2000000,
        url: 'https://example.com/asset2.mp4',
      });

      const assets = await prismaService.getProjectAssets(testProject.id);

      expect(assets).toHaveLength(2);
      expect(assets.map(a => a.filename)).toContain('asset1.jpg');
      expect(assets.map(a => a.filename)).toContain('asset2.mp4');
    });
  });

  describe('Error Handling', () => {
    it('should handle user not found', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const user = await prismaService.getUserById(nonExistentId);
      expect(user).toBeNull();
    });

    it('should handle duplicate email creation', async () => {
      const userData = {
        email: testUser.email, // Use existing email
        authProviderId: 'auth0|duplicate-test',
        displayName: 'Duplicate Test',
      };

      await expect(prismaService.createUser(userData)).rejects.toThrow();
    });

    it('should handle invalid project update', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      
      await expect(
        prismaService.updateProject(nonExistentId, { title: 'Updated' })
      ).rejects.toThrow();
    });
  });
});