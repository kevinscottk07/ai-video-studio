#!/usr/bin/env tsx

/**
 * Database Schema Test Script
 * 
 * This script tests the database schema by creating sample data
 * and verifying all relationships work correctly.
 */

import { connectDatabase } from '../config/database.js';
import { databaseService } from '../services/databaseService.js';
import { databaseHealthCheck } from '../utils/healthCheck.js';
import { logger } from '../utils/logger.js';

async function testDatabaseSchema() {
  try {
    logger.info('Starting database schema test...');

    // Connect to database
    await connectDatabase();
    logger.info('Database connected successfully');

    // Run health check
    const healthResult = await databaseHealthCheck.runHealthCheck();
    logger.info('Health check result:', healthResult);

    if (healthResult.status !== 'healthy') {
      throw new Error('Database health check failed');
    }

    // Test user creation
    logger.info('Testing user creation...');
    const testUser = await databaseService.createUser({
      email: 'test@example.com',
      authProviderId: 'test-auth-123',
      displayName: 'Test User',
      language: 'en',
      timezone: 'UTC',
    });
    logger.info('User created:', { userId: testUser.id, email: testUser.email });

    // Test user retrieval
    const retrievedUser = await databaseService.getUserById(testUser.id);
    if (!retrievedUser) {
      throw new Error('Failed to retrieve created user');
    }
    logger.info('User retrieved successfully');

    // Test user update
    const updatedUser = await databaseService.updateUser(testUser.id, {
      displayName: 'Updated Test User',
      language: 'es',
    });
    logger.info('User updated:', { displayName: updatedUser.displayName, language: updatedUser.language });

    // Test project creation
    logger.info('Testing project creation...');
    const testProject = await databaseService.createProject({
      userId: testUser.id,
      title: 'Test Project',
      description: 'A test project for schema validation',
      settings: {
        resolution: 'hd',
        duration: 60,
        language: 'en',
        style: 'cinematic',
        musicEnabled: true,
      },
    });
    logger.info('Project created:', { projectId: testProject.id, title: testProject.title });

    // Test credit transaction
    logger.info('Testing credit transaction...');
    const creditTransaction = await databaseService.createCreditTransaction({
      userId: testUser.id,
      type: 'purchase',
      amount: 100,
      description: 'Test credit purchase',
      awsCostCovered: 0,
      platformProfit: 5,
      metadata: { testTransaction: true },
    });
    logger.info('Credit transaction created:', { transactionId: creditTransaction.id, amount: creditTransaction.amount });

    // Test generation job
    logger.info('Testing generation job creation...');
    const generationJob = await databaseService.createGenerationJob({
      projectId: testProject.id,
      userId: testUser.id,
      operationType: 'video_generation',
      requestData: { prompt: 'Generate a test video' },
      creditsRequired: 50,
      estimatedAWSCost: 2.5,
      platformProfit: 2.5,
    });
    logger.info('Generation job created:', { jobId: generationJob.id, status: generationJob.status });

    // Test job update
    const updatedJob = await databaseService.updateGenerationJob(generationJob.id, {
      status: 'completed',
      progress: 100,
      creditsDeducted: 50,
      actualAWSCost: 2.3,
      resultUrl: 'https://example.com/result.mp4',
      completedAt: new Date(),
    });
    logger.info('Generation job updated:', { status: updatedJob.status, progress: updatedJob.progress });

    // Test subscription creation
    logger.info('Testing subscription creation...');
    const subscription = await databaseService.createSubscription({
      userId: testUser.id,
      planId: 'pro',
      paymentProcessorId: 'test-payment-123',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      creditsIncluded: 500,
    });
    logger.info('Subscription created:', { subscriptionId: subscription.id, planId: subscription.planId });

    // Test data retrieval
    logger.info('Testing data retrieval...');
    const userProjects = await databaseService.getUserProjects(testUser.id);
    const creditHistory = await databaseService.getUserCreditHistory(testUser.id);
    const userSubscription = await databaseService.getUserSubscription(testUser.id);

    logger.info('Data retrieval results:', {
      projectCount: userProjects.length,
      creditTransactionCount: creditHistory.length,
      hasSubscription: !!userSubscription,
    });

    // Get database stats
    const stats = await databaseHealthCheck.getDatabaseStats();
    logger.info('Database statistics:', stats);

    logger.info('✅ Database schema test completed successfully!');
    logger.info('All core functionality is working correctly.');

    return {
      success: true,
      testResults: {
        userCreated: !!testUser,
        projectCreated: !!testProject,
        creditTransactionCreated: !!creditTransaction,
        generationJobCreated: !!generationJob,
        subscriptionCreated: !!subscription,
        dataRetrievalWorking: userProjects.length > 0 && creditHistory.length > 0,
        healthCheckPassed: healthResult.status === 'healthy',
      },
      stats,
    };

  } catch (error) {
    logger.error('❌ Database schema test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testDatabaseSchema()
    .then((result) => {
      if (result.success) {
        console.log('✅ Schema test passed!');
        process.exit(0);
      } else {
        console.error('❌ Schema test failed:', result.error);
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('❌ Schema test crashed:', error);
      process.exit(1);
    });
}

export { testDatabaseSchema };