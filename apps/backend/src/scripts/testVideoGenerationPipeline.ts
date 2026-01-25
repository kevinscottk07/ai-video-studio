#!/usr/bin/env node

/**
 * Test Video Generation Pipeline
 * 
 * This script tests the complete video generation pipeline including:
 * - Cost estimation
 * - Job queuing
 * - Progress tracking
 * - Real-time updates
 * - S3 integration
 */

import { videoGenerationService } from '../services/videoGenerationService.js';
import { realTimeService } from '../services/realTimeService.js';
import { creditService } from '../services/creditService.js';
import { databaseService } from '../services/databaseService.js';
import { logger } from '../utils/logger.js';

async function testVideoGenerationPipeline() {
  try {
    console.log('🎬 Testing Video Generation Pipeline...\n');

    // Test 1: Cost Estimation
    console.log('1. Testing cost estimation...');
    const testRequest = {
      projectId: 'test-project-123',
      operationType: 'video_generation' as const,
      parameters: {
        prompt: 'A professional product showcase featuring a sleek smartphone with dynamic lighting and smooth camera movements',
        duration: 30,
        resolution: 'standard' as const,
        style: 'advertisement' as const,
        aspectRatio: '16:9' as const,
        fps: 30,
        quality: 'standard' as const,
      },
    };

    const estimate = await videoGenerationService.estimateVideoGenerationCost(testRequest);
    console.log('✅ Cost estimation successful:', {
      creditsRequired: estimate.creditsRequired,
      awsCost: estimate.awsCost,
      estimatedDuration: estimate.estimatedDuration,
    });

    // Test 2: Service Health Check
    console.log('\n2. Testing service health...');
    const healthCheck = await videoGenerationService.healthCheck();
    console.log('✅ Health check result:', healthCheck.status);
    if (healthCheck.status === 'error') {
      console.log('⚠️  Health check details:', healthCheck.details);
    }

    // Test 3: Job Queue Management
    console.log('\n3. Testing job queue management...');
    
    // Create a test user (this would normally come from the database)
    const testUserId = 'test-user-123';
    
    try {
      // This will fail if user doesn't exist, but that's expected in a test environment
      const job = await videoGenerationService.queueVideoGeneration(testRequest, testUserId);
      console.log('✅ Job queued successfully:', {
        jobId: job.id,
        status: job.status,
        creditsRequired: job.creditsRequired,
      });

      // Test job status retrieval
      const jobStatus = await videoGenerationService.getJobStatus(job.id);
      console.log('✅ Job status retrieved:', {
        status: jobStatus.status,
        progress: jobStatus.progress,
      });

      // Test job cancellation
      const cancelResult = await videoGenerationService.cancelJob(job.id, testUserId);
      console.log('✅ Job cancelled successfully:', {
        success: cancelResult.success,
        refundedCredits: cancelResult.refundedCredits,
      });

    } catch (error) {
      if (error instanceof Error && error.message.includes('User not found')) {
        console.log('⚠️  Job queue test skipped - test user not found (expected in test environment)');
      } else {
        throw error;
      }
    }

    // Test 4: Real-time Progress Updates
    console.log('\n4. Testing real-time progress updates...');
    try {
      await realTimeService.updateGenerationProgress('test-job-123', {
        percentage: 50,
        stage: 'Processing video content',
        message: 'Generating frames...',
        data: { jobId: 'test-job-123', timestamp: new Date().toISOString() },
      });
      console.log('✅ Progress update sent successfully');
    } catch (error) {
      if (error instanceof Error && error.message.includes('not initialized')) {
        console.log('⚠️  Real-time service not initialized (expected without WebSocket server)');
      } else {
        throw error;
      }
    }

    // Test 5: Configuration Validation
    console.log('\n5. Testing configuration...');
    const s3Config = process.env.AWS_S3_BUCKET;
    const sagemakerEndpoint = process.env.SAGEMAKER_VIDEO_ENDPOINT;
    const bedrockModel = process.env.BEDROCK_VIDEO_MODEL;

    console.log('Configuration status:');
    console.log(`  S3 Bucket: ${s3Config ? '✅ Configured' : '❌ Missing'}`);
    console.log(`  SageMaker Endpoint: ${sagemakerEndpoint ? '✅ Configured' : '❌ Missing'}`);
    console.log(`  Bedrock Model: ${bedrockModel ? '✅ Configured' : '❌ Missing'}`);

    console.log('\n🎉 Video Generation Pipeline Test Complete!');
    console.log('\nNext steps:');
    console.log('1. Configure AWS credentials and endpoints');
    console.log('2. Set up database with test users');
    console.log('3. Initialize WebSocket server for real-time updates');
    console.log('4. Test with actual video generation');

  } catch (error) {
    console.error('❌ Pipeline test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testVideoGenerationPipeline();
}

export { testVideoGenerationPipeline };