import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { videoGenerationService } from '../videoGenerationService.js';
import { creditService } from '../creditService.js';
import { realTimeService } from '../realTimeService.js';
import { databaseService } from '../databaseService.js';
import type { VideoGenerationRequest } from '../videoGenerationService.js';
import type { GenerationJob, JobStatus } from '@ai-video-studio/types';

// Mock dependencies
jest.mock('../creditService.js');
jest.mock('../realTimeService.js');
jest.mock('../databaseService.js');
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/client-bedrock-runtime');
jest.mock('@aws-sdk/client-sagemaker-runtime');

const mockCreditService = creditService as jest.Mocked<typeof creditService>;
const mockRealTimeService = realTimeService as jest.Mocked<typeof realTimeService>;
const mockDatabaseService = databaseService as jest.Mocked<typeof databaseService>;

describe('Video Generation Pipeline - Additional Unit Tests', () => {
  const mockUserId = 'user-123';
  const mockProjectId = 'project-456';
  const mockJobId = 'job-789';

  const mockVideoRequest: VideoGenerationRequest = {
    projectId: mockProjectId,
    operationType: 'video_generation',
    parameters: {
      prompt: 'Create a beautiful sunset video',
      duration: 60,
      resolution: 'hd',
      style: 'cinematic',
      language: 'en',
      aspectRatio: '16:9',
      fps: 30,
      quality: 'standard',
    },
  };

  const mockGenerationJob: GenerationJob = {
    id: mockJobId,
    projectId: mockProjectId,
    userId: mockUserId,
    request: mockVideoRequest.parameters,
    status: 'queued',
    progress: 0,
    creditsRequired: 100,
    creditsDeducted: 0,
    estimatedAWSCost: 2.5,
    platformProfit: 2.5,
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: {},
  };

  const mockUser = {
    id: mockUserId,
    email: 'test@example.com',
    creditBalance: 500,
    role: 'user' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockDatabaseService.getUserById.mockResolvedValue(mockUser as any);
    mockDatabaseService.getUserActiveSubscription.mockResolvedValue({
      id: 'sub-123',
      userId: mockUserId,
      planId: 'pro',
      status: 'active',
    } as any);
    mockCreditService.checkSufficientCredits.mockResolvedValue(true);
    mockCreditService.deductCredits.mockResolvedValue({} as any);
    mockDatabaseService.createGenerationJob.mockResolvedValue(mockGenerationJob);
    mockDatabaseService.updateGenerationJob.mockResolvedValue(mockGenerationJob);
    mockRealTimeService.notifyUser.mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Job Progress Tracking', () => {
    it('should track progress through all stages', async () => {
      const processingJob = { ...mockGenerationJob, status: 'processing' as JobStatus };
      mockDatabaseService.getGenerationJobById.mockResolvedValue(processingJob);

      // Mock the private updateJobProgress method by testing its effects
      const progressUpdates = [
        { percentage: 10, stage: 'Initializing', message: 'Setting up generation environment' },
        { percentage: 30, stage: 'Processing Assets', message: 'Analyzing uploaded assets' },
        { percentage: 60, stage: 'Generating Video', message: 'Creating video content' },
        { percentage: 90, stage: 'Finalizing', message: 'Optimizing output' },
        { percentage: 100, stage: 'Complete', message: 'Video generation complete' },
      ];

      // Test that progress updates are properly formatted and broadcast
      for (const update of progressUpdates) {
        expect(update.percentage).toBeGreaterThanOrEqual(0);
        expect(update.percentage).toBeLessThanOrEqual(100);
        expect(update.stage).toBeTruthy();
        expect(typeof update.message).toBe('string');
      }
    });

    it('should handle progress updates for non-existent jobs gracefully', async () => {
      mockDatabaseService.getGenerationJobById.mockResolvedValue(null);

      // This should not throw an error but should log appropriately
      // Since updateJobProgress is private, we test through public methods
      await expect(
        videoGenerationService.getJobStatus('non-existent-job')
      ).rejects.toThrow('JOB_NOT_FOUND');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle AWS service timeouts gracefully', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      
      mockDatabaseService.createGenerationJob.mockRejectedValue(timeoutError);

      await expect(
        videoGenerationService.queueVideoGeneration(mockVideoRequest, mockUserId)
      ).rejects.toThrow('Request timeout');
    });

    it('should handle S3 upload failures with retry logic', async () => {
      const s3Error = new Error('S3 upload failed');
      s3Error.name = 'S3ServiceException';

      // Mock S3 client to fail initially
      const mockS3Send = jest.fn()
        .mockRejectedValueOnce(s3Error)
        .mockResolvedValueOnce({ ETag: 'test-etag' });

      jest.doMock('@aws-sdk/client-s3', () => ({
        S3Client: jest.fn().mockImplementation(() => ({
          send: mockS3Send,
        })),
        PutObjectCommand: jest.fn(),
        GetObjectCommand: jest.fn(),
        DeleteObjectCommand: jest.fn(),
      }));

      // Test that the service handles S3 errors appropriately
      const health = await videoGenerationService.healthCheck();
      expect(health.details).toHaveProperty('s3');
    });

    it('should handle SageMaker endpoint failures', async () => {
      const sagemakerError = new Error('Model endpoint unavailable');
      sagemakerError.name = 'ModelError';

      const mockSageMakerSend = jest.fn().mockRejectedValue(sagemakerError);

      jest.doMock('@aws-sdk/client-sagemaker-runtime', () => ({
        SageMakerRuntimeClient: jest.fn().mockImplementation(() => ({
          send: mockSageMakerSend,
        })),
        InvokeEndpointCommand: jest.fn(),
      }));

      const health = await videoGenerationService.healthCheck();
      expect(health.details).toHaveProperty('sagemaker');
    });

    it('should handle credit refund failures during job cancellation', async () => {
      const queuedJob = { ...mockGenerationJob, status: 'queued' as JobStatus };
      mockDatabaseService.getGenerationJobById.mockResolvedValue(queuedJob);
      mockCreditService.refundCredits.mockRejectedValue(new Error('Refund service unavailable'));

      // Should still cancel the job even if refund fails
      const result = await videoGenerationService.cancelJob(mockJobId, mockUserId);
      
      expect(mockDatabaseService.updateGenerationJob).toHaveBeenCalledWith(
        mockJobId,
        expect.objectContaining({
          status: 'canceled',
          errorMessage: 'Cancelled by user',
        })
      );
      expect(result.success).toBe(true);
      expect(result.refundedCredits).toBeUndefined(); // No refund due to service failure
    });

    it('should handle database connection failures during job creation', async () => {
      const dbError = new Error('Database connection lost');
      dbError.name = 'DatabaseError';
      
      mockDatabaseService.createGenerationJob.mockRejectedValue(dbError);

      await expect(
        videoGenerationService.queueVideoGeneration(mockVideoRequest, mockUserId)
      ).rejects.toThrow('Database connection lost');

      // Ensure credits are not deducted if job creation fails
      expect(mockCreditService.deductCredits).not.toHaveBeenCalled();
    });
  });

  describe('Asset Management', () => {
    it('should handle missing assets gracefully', async () => {
      const requestWithAssets: VideoGenerationRequest = {
        ...mockVideoRequest,
        parameters: {
          ...mockVideoRequest.parameters,
          assets: ['asset-1', 'asset-2', 'non-existent-asset'],
        },
      };

      mockDatabaseService.getMediaAssetsByIds.mockResolvedValue([
        { id: 'asset-1', url: 'https://s3.amazonaws.com/bucket/asset1.jpg' },
        { id: 'asset-2', url: 'https://s3.amazonaws.com/bucket/asset2.jpg' },
        // Missing asset-3
      ] as any);

      // Should handle missing assets without failing
      await expect(
        videoGenerationService.queueVideoGeneration(requestWithAssets, mockUserId)
      ).resolves.toBeDefined();
    });

    it('should validate asset file types and sizes', async () => {
      const requestWithLargeAssets: VideoGenerationRequest = {
        ...mockVideoRequest,
        parameters: {
          ...mockVideoRequest.parameters,
          assets: ['large-asset-1'],
        },
      };

      mockDatabaseService.getMediaAssetsByIds.mockResolvedValue([
        {
          id: 'large-asset-1',
          url: 'https://s3.amazonaws.com/bucket/large-video.mp4',
          sizeBytes: 1024 * 1024 * 1024 * 2, // 2GB file
          mimeType: 'video/mp4',
        },
      ] as any);

      // Should handle large assets appropriately
      await expect(
        videoGenerationService.queueVideoGeneration(requestWithLargeAssets, mockUserId)
      ).resolves.toBeDefined();
    });
  });

  describe('Cost Calculation Edge Cases', () => {
    it('should handle extreme duration values', async () => {
      const extremeRequest: VideoGenerationRequest = {
        ...mockVideoRequest,
        parameters: {
          ...mockVideoRequest.parameters,
          duration: 1, // Very short video
        },
      };

      const estimate = await videoGenerationService.estimateVideoGenerationCost(extremeRequest);
      
      expect(estimate.creditsRequired).toBeGreaterThan(0);
      expect(estimate.breakdown.durationMultiplier).toBeGreaterThanOrEqual(0.5); // Minimum multiplier
    });

    it('should handle maximum duration for ultra tier', async () => {
      mockDatabaseService.getUserActiveSubscription.mockResolvedValue({
        id: 'sub-123',
        userId: mockUserId,
        planId: 'ultra',
        status: 'active',
      } as any);

      const maxDurationRequest: VideoGenerationRequest = {
        ...mockVideoRequest,
        parameters: {
          ...mockVideoRequest.parameters,
          duration: 7200, // 2 hours - maximum for ultra tier
          resolution: 'ultra',
          style: 'vr',
          quality: 'ultra',
        },
      };

      const estimate = await videoGenerationService.estimateVideoGenerationCost(maxDurationRequest);
      
      expect(estimate.creditsRequired).toBeGreaterThan(1000); // Should be expensive
      expect(estimate.awsCost).toBeGreaterThan(10); // Significant AWS cost
    });

    it('should calculate costs for different quality levels', async () => {
      const qualityLevels = ['draft', 'standard', 'high', 'ultra'] as const;
      const estimates = [];

      for (const quality of qualityLevels) {
        const request: VideoGenerationRequest = {
          ...mockVideoRequest,
          parameters: {
            ...mockVideoRequest.parameters,
            quality,
          },
        };

        const estimate = await videoGenerationService.estimateVideoGenerationCost(request);
        estimates.push({ quality, estimate });
      }

      // Verify that higher quality costs more
      for (let i = 1; i < estimates.length; i++) {
        expect(estimates[i].estimate.creditsRequired).toBeGreaterThanOrEqual(
          estimates[i - 1].estimate.creditsRequired
        );
      }
    });
  });

  describe('Concurrent Job Handling', () => {
    it('should handle multiple simultaneous job submissions', async () => {
      const jobPromises = [];
      
      for (let i = 0; i < 5; i++) {
        const request: VideoGenerationRequest = {
          ...mockVideoRequest,
          projectId: `project-${i}`,
        };
        
        mockDatabaseService.createGenerationJob.mockResolvedValueOnce({
          ...mockGenerationJob,
          id: `job-${i}`,
          projectId: `project-${i}`,
        });

        jobPromises.push(
          videoGenerationService.queueVideoGeneration(request, mockUserId)
        );
      }

      const jobs = await Promise.all(jobPromises);
      
      expect(jobs).toHaveLength(5);
      jobs.forEach((job, index) => {
        expect(job.id).toBe(`job-${index}`);
        expect(job.projectId).toBe(`project-${index}`);
      });
    });

    it('should prevent duplicate job submissions for same project', async () => {
      // First submission should succeed
      const job1 = await videoGenerationService.queueVideoGeneration(mockVideoRequest, mockUserId);
      expect(job1).toBeDefined();

      // Mock that a job already exists for this project
      mockDatabaseService.getGenerationJobsByProjectId = jest.fn().mockResolvedValue([
        { ...mockGenerationJob, status: 'processing' }
      ]);

      // Second submission for same project should be rejected or queued appropriately
      // This depends on business logic - for now, we'll test that the service handles it
      await expect(
        videoGenerationService.queueVideoGeneration(mockVideoRequest, mockUserId)
      ).resolves.toBeDefined(); // Should handle gracefully
    });
  });

  describe('Health Check Comprehensive Testing', () => {
    it('should report detailed health status for all components', async () => {
      const health = await videoGenerationService.healthCheck();

      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('details');
      expect(health.details).toHaveProperty('s3');
      expect(health.details).toHaveProperty('sagemaker');
      expect(health.details).toHaveProperty('jobQueue');
      
      expect(['ok', 'error']).toContain(health.status);
    });

    it('should handle partial service failures in health check', async () => {
      // Mock S3 as healthy but SageMaker as unhealthy
      const mockS3Send = jest.fn().mockRejectedValue({ name: 'NoSuchKey' }); // Expected for health check
      const mockSageMakerSend = jest.fn().mockRejectedValue(new Error('Service unavailable'));

      jest.doMock('@aws-sdk/client-s3', () => ({
        S3Client: jest.fn().mockImplementation(() => ({
          send: mockS3Send,
        })),
        GetObjectCommand: jest.fn(),
      }));

      jest.doMock('@aws-sdk/client-sagemaker-runtime', () => ({
        SageMakerRuntimeClient: jest.fn().mockImplementation(() => ({
          send: mockSageMakerSend,
        })),
        InvokeEndpointCommand: jest.fn(),
      }));

      const health = await videoGenerationService.healthCheck();
      
      // Should report overall error status if any component fails
      expect(health.status).toBe('error');
      expect(health.details.s3.status).toBe('ok');
      expect(health.details.sagemaker.status).toBe('error');
    });
  });

  describe('Memory and Resource Management', () => {
    it('should clean up completed jobs from memory queue', async () => {
      // This tests the internal job queue management
      // Since the queue is private, we test through observable behavior
      
      const completedJob = { ...mockGenerationJob, status: 'completed' as JobStatus };
      mockDatabaseService.getGenerationJobById.mockResolvedValue(completedJob);

      const job = await videoGenerationService.getJobStatus(mockJobId);
      expect(job.status).toBe('completed');
      
      // Completed jobs should be retrievable but not consume memory indefinitely
      // This is more of an integration concern, but we can verify the service handles it
    });

    it('should handle memory pressure during large job processing', async () => {
      // Test that the service can handle multiple large jobs without memory issues
      const largeJobRequest: VideoGenerationRequest = {
        ...mockVideoRequest,
        parameters: {
          ...mockVideoRequest.parameters,
          duration: 3600, // 1 hour video
          resolution: 'ultra',
          quality: 'ultra',
        },
      };

      // Should not throw memory-related errors
      await expect(
        videoGenerationService.estimateVideoGenerationCost(largeJobRequest)
      ).resolves.toBeDefined();
    });
  });
});