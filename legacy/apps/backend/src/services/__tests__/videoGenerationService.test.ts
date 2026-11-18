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

describe('VideoGenerationService', () => {
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

  const mockSubscription = {
    id: 'sub-123',
    userId: mockUserId,
    planId: 'pro',
    status: 'active' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockDatabaseService.getUserById.mockResolvedValue(mockUser as any);
    mockDatabaseService.getUserActiveSubscription.mockResolvedValue(mockSubscription as any);
    mockCreditService.checkSufficientCredits.mockResolvedValue(true);
    mockCreditService.deductCredits.mockResolvedValue({} as any);
    mockDatabaseService.createGenerationJob.mockResolvedValue(mockGenerationJob);
    mockDatabaseService.updateGenerationJob.mockResolvedValue(mockGenerationJob);
    mockRealTimeService.notifyUser.mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('estimateVideoGenerationCost', () => {
    it('should calculate correct cost for standard video', async () => {
      const request: VideoGenerationRequest = {
        ...mockVideoRequest,
        parameters: {
          ...mockVideoRequest.parameters,
          duration: 60,
          resolution: 'standard',
          style: 'social_media',
          quality: 'standard',
        },
      };

      const estimate = await videoGenerationService.estimateVideoGenerationCost(request);

      expect(estimate).toEqual({
        creditsRequired: 50, // base 50 * 1.0 duration * 1.0 resolution * 1.0 style * 1.0 quality
        awsCost: expect.any(Number),
        estimatedDuration: expect.any(Number),
        breakdown: {
          baseCredits: 50,
          durationMultiplier: 1.0,
          resolutionMultiplier: 1.0,
          styleMultiplier: 1.0,
          qualityMultiplier: 1.0,
        },
      });
    });

    it('should apply correct multipliers for HD cinematic video', async () => {
      const request: VideoGenerationRequest = {
        ...mockVideoRequest,
        parameters: {
          ...mockVideoRequest.parameters,
          duration: 120, // 2x duration
          resolution: 'hd', // 2x resolution
          style: 'cinematic', // 2.5x style
          quality: 'high', // 1.5x quality
        },
      };

      const estimate = await videoGenerationService.estimateVideoGenerationCost(request);

      // Expected: 50 * 2.0 * 2.0 * 2.5 * 1.5 = 750 credits
      expect(estimate.creditsRequired).toBe(750);
      expect(estimate.breakdown.durationMultiplier).toBe(2.0);
      expect(estimate.breakdown.resolutionMultiplier).toBe(2.0);
      expect(estimate.breakdown.styleMultiplier).toBe(2.5);
      expect(estimate.breakdown.qualityMultiplier).toBe(1.5);
    });

    it('should handle minimum duration multiplier', async () => {
      const request: VideoGenerationRequest = {
        ...mockVideoRequest,
        parameters: {
          ...mockVideoRequest.parameters,
          duration: 15, // Very short duration
        },
      };

      const estimate = await videoGenerationService.estimateVideoGenerationCost(request);

      // Duration multiplier should be at least 0.5
      expect(estimate.breakdown.durationMultiplier).toBe(0.5);
    });

    it('should throw error on invalid parameters', async () => {
      const invalidRequest = {
        ...mockVideoRequest,
        parameters: {
          ...mockVideoRequest.parameters,
          resolution: 'invalid' as any,
        },
      };

      await expect(
        videoGenerationService.estimateVideoGenerationCost(invalidRequest)
      ).rejects.toThrow('Failed to estimate video generation cost');
    });
  });

  describe('queueVideoGeneration', () => {
    it('should successfully queue video generation job', async () => {
      const job = await videoGenerationService.queueVideoGeneration(mockVideoRequest, mockUserId);

      expect(mockDatabaseService.getUserById).toHaveBeenCalledWith(mockUserId);
      expect(mockDatabaseService.getUserActiveSubscription).toHaveBeenCalledWith(mockUserId);
      expect(mockCreditService.checkSufficientCredits).toHaveBeenCalled();
      expect(mockDatabaseService.createGenerationJob).toHaveBeenCalled();
      expect(mockCreditService.deductCredits).toHaveBeenCalled();
      expect(mockRealTimeService.notifyUser).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          type: 'info',
          title: 'Video Generation Queued',
        })
      );

      expect(job).toEqual(mockGenerationJob);
    });

    it('should reject if user has insufficient credits', async () => {
      mockCreditService.checkSufficientCredits.mockResolvedValue(false);

      await expect(
        videoGenerationService.queueVideoGeneration(mockVideoRequest, mockUserId)
      ).rejects.toThrow('INSUFFICIENT_CREDITS');

      expect(mockDatabaseService.createGenerationJob).not.toHaveBeenCalled();
      expect(mockCreditService.deductCredits).not.toHaveBeenCalled();
    });

    it('should validate tier limits for free user', async () => {
      const freeSubscription = { ...mockSubscription, planId: 'free' };
      mockDatabaseService.getUserActiveSubscription.mockResolvedValue(freeSubscription as any);

      const longVideoRequest: VideoGenerationRequest = {
        ...mockVideoRequest,
        parameters: {
          ...mockVideoRequest.parameters,
          duration: 120, // Exceeds free tier limit
        },
      };

      await expect(
        videoGenerationService.queueVideoGeneration(longVideoRequest, mockUserId)
      ).rejects.toThrow('DURATION_LIMIT_EXCEEDED');
    });

    it('should validate resolution limits for free user', async () => {
      const freeSubscription = { ...mockSubscription, planId: 'free' };
      mockDatabaseService.getUserActiveSubscription.mockResolvedValue(freeSubscription as any);

      const hdVideoRequest: VideoGenerationRequest = {
        ...mockVideoRequest,
        parameters: {
          ...mockVideoRequest.parameters,
          resolution: 'ultra', // Not allowed for free tier
        },
      };

      await expect(
        videoGenerationService.queueVideoGeneration(hdVideoRequest, mockUserId)
      ).rejects.toThrow('RESOLUTION_NOT_ALLOWED');
    });

    it('should validate style limits for starter user', async () => {
      const starterSubscription = { ...mockSubscription, planId: 'starter' };
      mockDatabaseService.getUserActiveSubscription.mockResolvedValue(starterSubscription as any);

      const vrVideoRequest: VideoGenerationRequest = {
        ...mockVideoRequest,
        parameters: {
          ...mockVideoRequest.parameters,
          style: 'vr', // Not allowed for starter tier
        },
      };

      await expect(
        videoGenerationService.queueVideoGeneration(vrVideoRequest, mockUserId)
      ).rejects.toThrow('STYLE_NOT_ALLOWED');
    });

    it('should handle user not found', async () => {
      mockDatabaseService.getUserById.mockResolvedValue(null);

      await expect(
        videoGenerationService.queueVideoGeneration(mockVideoRequest, mockUserId)
      ).rejects.toThrow('USER_NOT_FOUND');
    });
  });

  describe('getJobStatus', () => {
    it('should return job status from database', async () => {
      mockDatabaseService.getGenerationJobById.mockResolvedValue(mockGenerationJob);

      const job = await videoGenerationService.getJobStatus(mockJobId);

      expect(mockDatabaseService.getGenerationJobById).toHaveBeenCalledWith(mockJobId);
      expect(job).toEqual(mockGenerationJob);
    });

    it('should throw error if job not found', async () => {
      mockDatabaseService.getGenerationJobById.mockResolvedValue(null);

      await expect(
        videoGenerationService.getJobStatus(mockJobId)
      ).rejects.toThrow('JOB_NOT_FOUND');
    });
  });

  describe('cancelJob', () => {
    it('should successfully cancel queued job', async () => {
      const queuedJob = { ...mockGenerationJob, status: 'queued' as JobStatus };
      mockDatabaseService.getGenerationJobById.mockResolvedValue(queuedJob);
      mockCreditService.refundCredits.mockResolvedValue({ amount: 100 } as any);

      const result = await videoGenerationService.cancelJob(mockJobId, mockUserId);

      expect(mockDatabaseService.updateGenerationJob).toHaveBeenCalledWith(
        mockJobId,
        expect.objectContaining({
          status: 'canceled',
          errorMessage: 'Cancelled by user',
        })
      );
      expect(mockCreditService.refundCredits).toHaveBeenCalled();
      expect(mockRealTimeService.notifyUser).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          type: 'info',
          title: 'Video Generation Cancelled',
        })
      );
      expect(result).toEqual({
        success: true,
        refundedCredits: 100,
      });
    });

    it('should reject if user does not own job', async () => {
      const otherUserJob = { ...mockGenerationJob, userId: 'other-user' };
      mockDatabaseService.getGenerationJobById.mockResolvedValue(otherUserJob);

      await expect(
        videoGenerationService.cancelJob(mockJobId, mockUserId)
      ).rejects.toThrow('UNAUTHORIZED');
    });

    it('should reject if job cannot be cancelled', async () => {
      const completedJob = { ...mockGenerationJob, status: 'completed' as JobStatus };
      mockDatabaseService.getGenerationJobById.mockResolvedValue(completedJob);

      await expect(
        videoGenerationService.cancelJob(mockJobId, mockUserId)
      ).rejects.toThrow('CANNOT_CANCEL');
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when all services are ok', async () => {
      // Mock successful health checks
      const mockS3Send = jest.fn().mockRejectedValue({ name: 'NoSuchKey' }); // Expected for health check
      const mockSageMakerSend = jest.fn().mockResolvedValue({ Body: new Uint8Array() });

      // Mock AWS clients
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

      expect(health.status).toBe('ok');
      expect(health.details).toHaveProperty('s3');
      expect(health.details).toHaveProperty('sagemaker');
      expect(health.details).toHaveProperty('jobQueue');
    });
  });

  describe('tier validation', () => {
    const tierTestCases = [
      {
        tier: 'free',
        limits: {
          maxDuration: 60,
          allowedResolutions: ['standard'],
          allowedStyles: ['social_media', 'educational'],
          maxCreditsPerOperation: 100,
        },
      },
      {
        tier: 'starter',
        limits: {
          maxDuration: 60,
          allowedResolutions: ['standard'],
          allowedStyles: ['social_media', 'educational', 'advertisement'],
          maxCreditsPerOperation: 200,
        },
      },
      {
        tier: 'pro',
        limits: {
          maxDuration: 7200,
          allowedResolutions: ['standard', 'hd'],
          allowedStyles: ['social_media', 'educational', 'advertisement', 'cinematic'],
          maxCreditsPerOperation: 1000,
        },
      },
      {
        tier: 'ultra',
        limits: {
          maxDuration: 7200,
          allowedResolutions: ['standard', 'hd', 'ultra'],
          allowedStyles: ['social_media', 'educational', 'advertisement', 'cinematic', 'vr'],
          maxCreditsPerOperation: 5000,
        },
      },
    ];

    tierTestCases.forEach(({ tier, limits }) => {
      describe(`${tier} tier`, () => {
        beforeEach(() => {
          const subscription = { ...mockSubscription, planId: tier };
          mockDatabaseService.getUserActiveSubscription.mockResolvedValue(subscription as any);
        });

        it(`should allow maximum duration of ${limits.maxDuration} seconds`, async () => {
          const request: VideoGenerationRequest = {
            ...mockVideoRequest,
            parameters: {
              ...mockVideoRequest.parameters,
              duration: limits.maxDuration,
              resolution: limits.allowedResolutions[0] as any,
              style: limits.allowedStyles[0] as any,
            },
          };

          await expect(
            videoGenerationService.queueVideoGeneration(request, mockUserId)
          ).resolves.toBeDefined();
        });

        it(`should reject duration exceeding ${limits.maxDuration} seconds`, async () => {
          const request: VideoGenerationRequest = {
            ...mockVideoRequest,
            parameters: {
              ...mockVideoRequest.parameters,
              duration: limits.maxDuration + 1,
              resolution: limits.allowedResolutions[0] as any,
              style: limits.allowedStyles[0] as any,
            },
          };

          await expect(
            videoGenerationService.queueVideoGeneration(request, mockUserId)
          ).rejects.toThrow('DURATION_LIMIT_EXCEEDED');
        });

        it('should allow all permitted resolutions', async () => {
          for (const resolution of limits.allowedResolutions) {
            const request: VideoGenerationRequest = {
              ...mockVideoRequest,
              parameters: {
                ...mockVideoRequest.parameters,
                resolution: resolution as any,
                style: limits.allowedStyles[0] as any,
              },
            };

            await expect(
              videoGenerationService.queueVideoGeneration(request, mockUserId)
            ).resolves.toBeDefined();
          }
        });

        it('should allow all permitted styles', async () => {
          for (const style of limits.allowedStyles) {
            const request: VideoGenerationRequest = {
              ...mockVideoRequest,
              parameters: {
                ...mockVideoRequest.parameters,
                resolution: limits.allowedResolutions[0] as any,
                style: style as any,
              },
            };

            await expect(
              videoGenerationService.queueVideoGeneration(request, mockUserId)
            ).resolves.toBeDefined();
          }
        });
      });
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockDatabaseService.createGenerationJob.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        videoGenerationService.queueVideoGeneration(mockVideoRequest, mockUserId)
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle credit service errors', async () => {
      mockCreditService.checkSufficientCredits.mockRejectedValue(new Error('Credit service unavailable'));

      await expect(
        videoGenerationService.queueVideoGeneration(mockVideoRequest, mockUserId)
      ).rejects.toThrow('Credit service unavailable');
    });

    it('should handle real-time service errors gracefully', async () => {
      mockRealTimeService.notifyUser.mockRejectedValue(new Error('WebSocket connection failed'));

      // Should still complete successfully even if notification fails
      const job = await videoGenerationService.queueVideoGeneration(mockVideoRequest, mockUserId);
      expect(job).toBeDefined();
    });
  });

  describe('cost calculations', () => {
    it('should calculate AWS costs correctly', async () => {
      const request: VideoGenerationRequest = {
        ...mockVideoRequest,
        parameters: {
          ...mockVideoRequest.parameters,
          duration: 120,
          resolution: 'hd',
        },
      };

      const estimate = await videoGenerationService.estimateVideoGenerationCost(request);

      expect(estimate.awsCost).toBeGreaterThan(0);
      expect(typeof estimate.awsCost).toBe('number');
    });

    it('should scale costs with video complexity', async () => {
      const simpleRequest: VideoGenerationRequest = {
        ...mockVideoRequest,
        parameters: {
          ...mockVideoRequest.parameters,
          duration: 30,
          resolution: 'standard',
          style: 'social_media',
          quality: 'draft',
        },
      };

      const complexRequest: VideoGenerationRequest = {
        ...mockVideoRequest,
        parameters: {
          ...mockVideoRequest.parameters,
          duration: 300,
          resolution: 'ultra',
          style: 'vr',
          quality: 'ultra',
        },
      };

      const simpleEstimate = await videoGenerationService.estimateVideoGenerationCost(simpleRequest);
      const complexEstimate = await videoGenerationService.estimateVideoGenerationCost(complexRequest);

      expect(complexEstimate.creditsRequired).toBeGreaterThan(simpleEstimate.creditsRequired);
      expect(complexEstimate.awsCost).toBeGreaterThan(simpleEstimate.awsCost);
    });
  });
});