/**
 * Test Helper Functions
 * Provides utilities for setting up test data and environments
 */

import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export interface TestUser {
  id: string;
  email: string;
  displayName: string;
  authProviderId: string;
  creditBalance: number;
  role: 'user' | 'admin' | 'moderator';
  subscription?: TestSubscription;
}

export interface TestProject {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: 'draft' | 'generating' | 'completed' | 'failed';
  isPublic: boolean;
  settings: {
    resolution: string;
    duration: number;
    language: string;
    style: string;
    musicEnabled: boolean;
  };
}

export interface TestSubscription {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'canceled' | 'past_due' | 'unpaid';
  creditsIncluded: number;
  creditsUsedThisPeriod: number;
}

export interface TestGenerationJob {
  id: string;
  projectId: string;
  userId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'canceled';
  progress: number;
  creditsRequired: number;
  creditsDeducted: number;
  estimatedAWSCost: number;
}

/**
 * Create a test user with optional subscription
 */
export async function createTestUser(overrides: Partial<TestUser> = {}): Promise<TestUser> {
  const userId = uuidv4();
  const userData = {
    id: userId,
    email: overrides.email || `test-${userId}@example.com`,
    displayName: overrides.displayName || `Test User ${userId.slice(0, 8)}`,
    authProviderId: overrides.authProviderId || `auth0|${userId}`,
    creditBalance: overrides.creditBalance ?? 100,
    role: overrides.role || 'user',
    language: 'en',
    timezone: 'UTC',
    totalCreditsEver: overrides.creditBalance ?? 100,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
    isActive: true,
    ...overrides,
  };

  await prisma.user.create({
    data: userData,
  });

  // Create subscription if provided
  if (overrides.subscription) {
    const subscription = await createTestSubscription(userId, overrides.subscription);
    userData.subscription = subscription;
  }

  return userData;
}

/**
 * Create a test project
 */
export async function createTestProject(userId: string, overrides: Partial<TestProject> = {}): Promise<TestProject> {
  const projectId = uuidv4();
  const projectData = {
    id: projectId,
    userId,
    title: overrides.title || `Test Project ${projectId.slice(0, 8)}`,
    description: overrides.description || 'A test project for integration testing',
    status: overrides.status || 'draft',
    isPublic: overrides.isPublic ?? false,
    settings: {
      resolution: '1080p',
      duration: 60,
      language: 'en',
      style: 'cinematic',
      musicEnabled: true,
      ...overrides.settings,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };

  await prisma.project.create({
    data: {
      ...projectData,
      settings: JSON.stringify(projectData.settings),
    },
  });

  return projectData;
}

/**
 * Create a test subscription
 */
export async function createTestSubscription(userId: string, overrides: Partial<TestSubscription> = {}): Promise<TestSubscription> {
  const subscriptionId = uuidv4();
  const subscriptionData = {
    id: subscriptionId,
    userId,
    planId: overrides.planId || 'pro',
    paymentProcessorId: `lemon_${subscriptionId}`,
    status: overrides.status || 'active',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    cancelAtPeriodEnd: false,
    creditsIncluded: overrides.creditsIncluded ?? 200,
    creditsUsedThisPeriod: overrides.creditsUsedThisPeriod ?? 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };

  await prisma.subscription.create({
    data: subscriptionData,
  });

  return subscriptionData;
}

/**
 * Create a test generation job
 */
export async function createTestGenerationJob(projectId: string, userId: string, overrides: Partial<TestGenerationJob> = {}): Promise<TestGenerationJob> {
  const jobId = uuidv4();
  const jobData = {
    id: jobId,
    projectId,
    userId,
    status: overrides.status || 'queued',
    progress: overrides.progress ?? 0,
    creditsRequired: overrides.creditsRequired ?? 25,
    creditsDeducted: overrides.creditsDeducted ?? 0,
    estimatedAWSCost: overrides.estimatedAWSCost ?? 2.5,
    actualAWSCost: null,
    platformProfit: 0,
    resultUrl: null,
    errorMessage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: null,
    request: JSON.stringify({
      prompt: 'Test video generation',
      style: 'cinematic',
      duration: 60,
    }),
    ...overrides,
  };

  await prisma.generationJob.create({
    data: jobData,
  });

  return jobData;
}

/**
 * Create a test credit transaction
 */
export async function createTestCreditTransaction(userId: string, type: 'purchase' | 'deduction' | 'refund' | 'subscription_grant', amount: number, description?: string) {
  const transactionId = uuidv4();
  
  await prisma.creditTransaction.create({
    data: {
      id: transactionId,
      userId,
      type,
      amount,
      description: description || `Test ${type} transaction`,
      awsCostCovered: type === 'deduction' ? amount * 0.6 : null,
      platformProfit: type === 'deduction' ? amount * 0.4 : null,
      createdAt: new Date(),
    },
  });

  // Update user's credit balance
  await prisma.user.update({
    where: { id: userId },
    data: {
      creditBalance: {
        increment: type === 'deduction' ? -amount : amount,
      },
    },
  });

  return transactionId;
}

/**
 * Create a test community post
 */
export async function createTestCommunityPost(userId: string, projectId: string, overrides: any = {}) {
  const postId = uuidv4();
  
  await prisma.communityPost.create({
    data: {
      id: postId,
      userId,
      projectId,
      title: overrides.title || 'Test Community Post',
      description: overrides.description || 'A test post for integration testing',
      videoUrl: overrides.videoUrl || 'https://example.com/test-video.mp4',
      thumbnailUrl: overrides.thumbnailUrl || 'https://example.com/test-thumbnail.jpg',
      tags: JSON.stringify(overrides.tags || ['test', 'integration']),
      likes: overrides.likes ?? 0,
      views: overrides.views ?? 0,
      isPublic: overrides.isPublic ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    },
  });

  return postId;
}

/**
 * Generate a test JWT token
 */
export function generateTestToken(user: TestUser): string {
  const payload = {
    sub: user.authProviderId,
    email: user.email,
    name: user.displayName,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour
  };

  return jwt.sign(payload, process.env.JWT_SECRET || 'test-secret');
}

/**
 * Clean up all test data
 */
export async function cleanupTestData(): Promise<void> {
  // Delete in order to respect foreign key constraints
  await prisma.creditTransaction.deleteMany({
    where: {
      description: {
        contains: 'Test',
      },
    },
  });

  await prisma.generationJob.deleteMany({
    where: {
      request: {
        contains: 'Test',
      },
    },
  });

  await prisma.communityPost.deleteMany({
    where: {
      title: {
        contains: 'Test',
      },
    },
  });

  await prisma.subscription.deleteMany({
    where: {
      paymentProcessorId: {
        startsWith: 'lemon_',
      },
    },
  });

  await prisma.project.deleteMany({
    where: {
      title: {
        contains: 'Test',
      },
    },
  });

  await prisma.user.deleteMany({
    where: {
      email: {
        contains: 'test-',
      },
    },
  });
}

/**
 * Setup test database with clean state
 */
export async function setupTestDatabase(): Promise<void> {
  await cleanupTestData();
}

/**
 * Mock WebSocket events for testing
 */
export class MockWebSocketService {
  private events: Map<string, Function[]> = new Map();

  emit(event: string, data: any): void {
    const listeners = this.events.get(event) || [];
    listeners.forEach(listener => listener(data));
  }

  on(event: string, callback: Function): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
  }

  off(event: string, callback?: Function): void {
    if (!callback) {
      this.events.delete(event);
      return;
    }
    
    const listeners = this.events.get(event) || [];
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  clear(): void {
    this.events.clear();
  }
}

/**
 * Create test environment with mocked services
 */
export async function createTestEnvironment() {
  const mockWebSocket = new MockWebSocketService();
  
  return {
    mockWebSocket,
    cleanup: async () => {
      mockWebSocket.clear();
      await cleanupTestData();
    },
  };
}

/**
 * Wait for async operations to complete
 */
export function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry an operation with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 100
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      const delay = baseDelay * Math.pow(2, attempt);
      await waitFor(delay);
    }
  }
  
  throw lastError!;
}