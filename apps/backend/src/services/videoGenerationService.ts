import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { SageMakerRuntimeClient, InvokeEndpointCommand } from '@aws-sdk/client-sagemaker-runtime';
import { getS3Config, getBedrockConfig, getSageMakerConfig, getCostTrackingConfig } from '@ai-video-studio/config';
import { logger } from '../utils/logger.js';
import { creditService } from './creditService.js';
import { realTimeService } from './realTimeService.js';
import { databaseService } from './databaseService.js';
import { createError } from '../middleware/errorHandler.js';
import type {
  GenerationJob,
  GenerationRequest,
  JobStatus,
  OperationType,
  VideoResolution,
  VideoStyle,
  ProgressData
} from '@ai-video-studio/types';

export interface VideoGenerationRequest extends GenerationRequest {
  operationType: OperationType.VIDEO_GENERATION;
  parameters: {
    prompt: string;
    assets?: string[]; // Asset IDs from MediaAsset table
    duration: number; // in seconds
    resolution: VideoResolution;
    style: VideoStyle;
    language?: string;
    aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3';
    fps?: 24 | 30 | 60;
    quality?: 'draft' | 'standard' | 'high' | 'ultra';
  };
}

export interface VideoGenerationResult {
  videoUrl: string;
  thumbnailUrl: string;
  metadata: {
    duration: number;
    resolution: string;
    fileSize: number;
    format: string;
    fps: number;
    aspectRatio: string;
  };
  usage: {
    processingTime: number;
    awsCost: number;
    creditsUsed: number;
  };
}

export interface VideoGenerationEstimate {
  creditsRequired: number;
  awsCost: number;
  estimatedDuration: number; // processing time in minutes
  breakdown: {
    baseCredits: number;
    durationMultiplier: number;
    resolutionMultiplier: number;
    styleMultiplier: number;
    qualityMultiplier: number;
  };
}

class VideoGenerationService {
  private s3Client: S3Client;
  private bedrockClient: BedrockRuntimeClient;
  private sagemakerClient: SageMakerRuntimeClient;
  private s3Config: ReturnType<typeof getS3Config>;
  private bedrockConfig: ReturnType<typeof getBedrockConfig>;
  private sagemakerConfig: ReturnType<typeof getSageMakerConfig>;
  private costConfig: ReturnType<typeof getCostTrackingConfig>;
  private jobQueue: Map<string, GenerationJob> = new Map();
  private processingJobs: Set<string> = new Set();

  constructor() {
    this.s3Config = getS3Config();
    this.bedrockConfig = getBedrockConfig();
    this.sagemakerConfig = getSageMakerConfig();
    this.costConfig = getCostTrackingConfig();

    // Initialize AWS clients
    this.s3Client = new S3Client({
      region: this.s3Config.region,
      credentials: {
        accessKeyId: this.s3Config.accessKeyId,
        secretAccessKey: this.s3Config.secretAccessKey,
        sessionToken: this.s3Config.sessionToken,
      },
    });

    this.bedrockClient = new BedrockRuntimeClient({
      region: this.bedrockConfig.region,
      credentials: {
        accessKeyId: this.bedrockConfig.accessKeyId,
        secretAccessKey: this.bedrockConfig.secretAccessKey,
        sessionToken: this.bedrockConfig.sessionToken,
      },
    });

    this.sagemakerClient = new SageMakerRuntimeClient({
      region: this.sagemakerConfig.region,
      credentials: {
        accessKeyId: this.sagemakerConfig.accessKeyId,
        secretAccessKey: this.sagemakerConfig.secretAccessKey,
        sessionToken: this.sagemakerConfig.sessionToken,
      },
    });

    logger.info('Video Generation Service initialized', {
      s3Bucket: this.s3Config.bucket,
      bedrockModel: this.bedrockConfig.models.videoGeneration,
      sagemakerEndpoint: this.sagemakerConfig.endpoints.videoGeneration,
    });

    // Start job processor
    this.startJobProcessor();
  }

  /**
   * Estimate cost for video generation
   */
  async estimateVideoGenerationCost(request: VideoGenerationRequest): Promise<VideoGenerationEstimate> {
    try {
      const { duration, resolution, style, quality = 'standard' } = request.parameters;

      // Base credits for video generation
      const baseCredits = 50;

      // Duration multiplier (linear scaling from 60 seconds baseline)
      const durationMultiplier = Math.max(0.5, duration / 60);

      // Resolution multiplier
      const resolutionMultipliers = {
        standard: 1.0,
        hd: 2.0,
        ultra: 4.0,
      };
      const resolutionMultiplier = resolutionMultipliers[resolution] || 1.0;

      // Style multiplier
      const styleMultipliers = {
        cinematic: 2.5,
        advertisement: 1.5,
        social_media: 1.0,
        educational: 1.2,
        vr: 3.0,
      };
      const styleMultiplier = styleMultipliers[style] || 1.0;

      // Quality multiplier
      const qualityMultipliers = {
        draft: 0.7,
        standard: 1.0,
        high: 1.5,
        ultra: 2.0,
      };
      const qualityMultiplier = qualityMultipliers[quality] || 1.0;

      // Calculate total credits
      const creditsRequired = Math.ceil(
        baseCredits * durationMultiplier * resolutionMultiplier * styleMultiplier * qualityMultiplier
      );

      // Estimate AWS costs
      const estimatedProcessingTime = duration * resolutionMultiplier * styleMultiplier; // in seconds
      const sagemakerCost = (estimatedProcessingTime / 3600) * this.costConfig.services.sagemaker.inferenceInstanceCost;
      const s3StorageCost = this.estimateS3StorageCost(duration, resolution);
      const awsCost = sagemakerCost + s3StorageCost;

      // Estimate processing duration
      const estimatedDuration = Math.ceil(estimatedProcessingTime / 60); // in minutes

      return {
        creditsRequired,
        awsCost,
        estimatedDuration,
        breakdown: {
          baseCredits,
          durationMultiplier,
          resolutionMultiplier,
          styleMultiplier,
          qualityMultiplier,
        },
      };
    } catch (error) {
      logger.error('Error estimating video generation cost:', error);
      throw new Error('Failed to estimate video generation cost');
    }
  }

  /**
   * Queue video generation job
   */
  async queueVideoGeneration(request: VideoGenerationRequest, userId: string): Promise<GenerationJob> {
    try {
      // Validate user's subscription tier limits
      await this.validateTierLimits(userId, request);

      // Get cost estimate
      const estimate = await this.estimateVideoGenerationCost(request);

      // Check if user has sufficient credits
      const hasSufficientCredits = await creditService.checkSufficientCredits(userId, estimate.creditsRequired);
      if (!hasSufficientCredits) {
        throw createError('Insufficient credits for video generation', 402, 'INSUFFICIENT_CREDITS');
      }

      // Create generation job in database
      const job = await databaseService.createGenerationJob({
        projectId: request.projectId,
        userId,
        operationType: request.operationType,
        requestData: request.parameters,
        status: 'queued',
        progress: 0,
        creditsRequired: estimate.creditsRequired,
        creditsDeducted: 0,
        estimatedAwsCost: estimate.awsCost,
        platformProfit: (estimate.creditsRequired * 0.05) - estimate.awsCost,
        metadata: {
          estimate,
          queuedAt: new Date().toISOString(),
        },
      });

      // Add to job queue
      this.jobQueue.set(job.id, job);

      // Deduct credits upfront
      await creditService.deductCredits(
        userId,
        estimate.creditsRequired,
        job.id,
        `Video generation - ${request.parameters.style} (${request.parameters.resolution})`,
        estimate.awsCost
      );

      // Update job with deducted credits
      const updatedJob = await databaseService.updateGenerationJob(job.id, {
        creditsDeducted: estimate.creditsRequired,
      });

      // Notify user about job queued
      await realTimeService.notifyUser(userId, {
        type: 'info',
        title: 'Video Generation Queued',
        message: `Your video generation job has been queued. Estimated processing time: ${estimate.estimatedDuration} minutes.`,
        data: { jobId: job.id, estimate },
      });

      logger.info('Video generation job queued', {
        jobId: job.id,
        userId,
        projectId: request.projectId,
        creditsRequired: estimate.creditsRequired,
        estimatedDuration: estimate.estimatedDuration,
      });

      return updatedJob;
    } catch (error) {
      logger.error('Error queuing video generation:', error);
      throw error;
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<GenerationJob> {
    try {
      // Check in-memory queue first
      const queuedJob = this.jobQueue.get(jobId);
      if (queuedJob) {
        return queuedJob;
      }

      // Get from database
      const job = await databaseService.getGenerationJobById(jobId);
      if (!job) {
        throw createError('Job not found', 404, 'JOB_NOT_FOUND');
      }

      return job;
    } catch (error) {
      logger.error('Error getting job status:', error);
      throw error;
    }
  }

  /**
   * Cancel job
   */
  async cancelJob(jobId: string, userId: string): Promise<{ success: boolean; refundedCredits?: number }> {
    try {
      const job = await this.getJobStatus(jobId);

      // Verify user owns the job
      if (job.userId !== userId) {
        throw createError('Unauthorized to cancel this job', 403, 'UNAUTHORIZED');
      }

      // Can only cancel queued or processing jobs
      if (!['queued', 'processing'].includes(job.status)) {
        throw createError('Cannot cancel completed or failed job', 400, 'CANNOT_CANCEL');
      }

      // Remove from queue if queued
      if (job.status === 'queued') {
        this.jobQueue.delete(jobId);
      }

      // Update job status
      await databaseService.updateGenerationJob(jobId, {
        status: 'canceled',
        completedAt: new Date(),
        errorMessage: 'Cancelled by user',
      });

      // Calculate refund based on progress
      const refundAmount = await creditService.refundCredits(
        userId,
        job.creditsDeducted,
        jobId,
        'Job cancelled by user',
        job.progress
      );

      // Notify user
      await realTimeService.notifyUser(userId, {
        type: 'info',
        title: 'Video Generation Cancelled',
        message: `Your video generation job has been cancelled. ${refundAmount.amount} credits have been refunded.`,
        data: { jobId, refundedCredits: refundAmount.amount },
      });

      logger.info('Video generation job cancelled', {
        jobId,
        userId,
        progress: job.progress,
        refundedCredits: refundAmount.amount,
      });

      return {
        success: true,
        refundedCredits: refundAmount.amount,
      };
    } catch (error) {
      logger.error('Error cancelling job:', error);
      throw error;
    }
  }

  /**
   * Start job processor (background worker)
   */
  private startJobProcessor(): void {
    setInterval(async () => {
      try {
        await this.processNextJob();
      } catch (error) {
        logger.error('Error in job processor:', error);
      }
    }, 5000); // Check every 5 seconds

    logger.info('Video generation job processor started');
  }

  /**
   * Process next job in queue
   */
  private async processNextJob(): Promise<void> {
    // Find next queued job
    const queuedJobs = Array.from(this.jobQueue.values())
      .filter(job => job.status === 'queued')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    if (queuedJobs.length === 0) {
      return; // No jobs to process
    }

    // Check if we're at max concurrent processing limit
    if (this.processingJobs.size >= this.sagemakerConfig.maxConcurrentRequests) {
      return; // Too many jobs processing
    }

    const job = queuedJobs[0];
    
    // Mark as processing
    this.processingJobs.add(job.id);
    this.jobQueue.set(job.id, { ...job, status: 'processing', progress: 0 });

    // Update database
    await databaseService.updateGenerationJob(job.id, {
      status: 'processing',
      progress: 0,
    });

    // Notify user
    await realTimeService.notifyUser(job.userId, {
      type: 'info',
      title: 'Video Generation Started',
      message: 'Your video is now being generated...',
      data: { jobId: job.id },
    });

    // Process the job
    try {
      await this.processVideoGeneration(job);
    } catch (error) {
      logger.error('Error processing video generation job:', error);
      await this.handleJobFailure(job.id, error instanceof Error ? error.message : 'Unknown error');
    } finally {
      this.processingJobs.delete(job.id);
      this.jobQueue.delete(job.id);
    }
  }

  /**
   * Process video generation job
   */
  private async processVideoGeneration(job: GenerationJob): Promise<void> {
    const startTime = Date.now();
    
    try {
      const request = job.requestData as VideoGenerationRequest['parameters'];
      
      // Update progress: Preparing assets
      await this.updateJobProgress(job.id, 10, 'Preparing assets and inputs');

      // Get project assets if specified
      let assetUrls: string[] = [];
      if (request.assets && request.assets.length > 0) {
        assetUrls = await this.getAssetUrls(request.assets);
      }

      // Update progress: Generating video content
      await this.updateJobProgress(job.id, 30, 'Generating video content with AI');

      // Generate video using SageMaker endpoint
      const videoResult = await this.generateVideoWithSageMaker(request, assetUrls);

      // Update progress: Processing and optimizing
      await this.updateJobProgress(job.id, 70, 'Processing and optimizing video');

      // Upload to S3 and get URLs
      const { videoUrl, thumbnailUrl } = await this.uploadVideoToS3(
        videoResult.videoBuffer,
        videoResult.thumbnailBuffer,
        job.id,
        request
      );

      // Update progress: Finalizing
      await this.updateJobProgress(job.id, 90, 'Finalizing video');

      // Calculate actual costs
      const processingTime = Date.now() - startTime;
      const actualAwsCost = this.calculateActualAwsCost(processingTime, request);

      // Create result metadata
      const metadata = {
        duration: request.duration,
        resolution: `${this.getResolutionDimensions(request.resolution).width}x${this.getResolutionDimensions(request.resolution).height}`,
        fileSize: videoResult.videoBuffer.length,
        format: 'mp4',
        fps: request.fps || 30,
        aspectRatio: request.aspectRatio || '16:9',
      };

      // Complete job
      await databaseService.updateGenerationJob(job.id, {
        status: 'completed',
        progress: 100,
        resultUrl: videoUrl,
        actualAwsCost,
        completedAt: new Date(),
        metadata: {
          ...job.metadata,
          result: {
            videoUrl,
            thumbnailUrl,
            metadata,
            usage: {
              processingTime: processingTime / 1000, // in seconds
              awsCost: actualAwsCost,
              creditsUsed: job.creditsDeducted,
            },
          },
        },
      });

      // Notify user of completion
      await realTimeService.notifyUser(job.userId, {
        type: 'success',
        title: 'Video Generation Complete!',
        message: 'Your video has been successfully generated and is ready for download.',
        data: {
          jobId: job.id,
          videoUrl,
          thumbnailUrl,
          metadata,
        },
      });

      // Update project status if this was the main generation
      await this.updateProjectStatus(job.projectId, 'completed');

      logger.info('Video generation completed successfully', {
        jobId: job.id,
        userId: job.userId,
        processingTime: processingTime / 1000,
        actualAwsCost,
        videoUrl,
      });

    } catch (error) {
      logger.error('Video generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate video using SageMaker endpoint
   */
  private async generateVideoWithSageMaker(
    request: VideoGenerationRequest['parameters'],
    assetUrls: string[]
  ): Promise<{ videoBuffer: Buffer; thumbnailBuffer: Buffer }> {
    try {
      const payload = {
        prompt: request.prompt,
        duration: request.duration,
        resolution: request.resolution,
        style: request.style,
        fps: request.fps || 30,
        aspect_ratio: request.aspectRatio || '16:9',
        quality: request.quality || 'standard',
        assets: assetUrls,
        language: request.language || 'en',
      };

      const command = new InvokeEndpointCommand({
        EndpointName: this.sagemakerConfig.endpoints.videoGeneration,
        ContentType: 'application/json',
        Body: JSON.stringify(payload),
      });

      const response = await this.sagemakerClient.send(command);
      
      if (!response.Body) {
        throw new Error('No response body from SageMaker endpoint');
      }

      const result = JSON.parse(new TextDecoder().decode(response.Body));
      
      if (result.error) {
        throw new Error(`SageMaker error: ${result.error}`);
      }

      // The response should contain base64 encoded video and thumbnail
      const videoBuffer = Buffer.from(result.video, 'base64');
      const thumbnailBuffer = Buffer.from(result.thumbnail, 'base64');

      return { videoBuffer, thumbnailBuffer };

    } catch (error) {
      logger.error('SageMaker video generation failed:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('ModelError')) {
          throw new Error('AI model error. Please try with different parameters.');
        }
        if (error.message.includes('ValidationException')) {
          throw new Error('Invalid request parameters for video generation.');
        }
        if (error.message.includes('ThrottlingException')) {
          throw new Error('Service temporarily overloaded. Please try again in a few minutes.');
        }
      }
      
      throw new Error('Video generation failed. Please try again.');
    }
  }

  /**
   * Upload video and thumbnail to S3
   */
  private async uploadVideoToS3(
    videoBuffer: Buffer,
    thumbnailBuffer: Buffer,
    jobId: string,
    request: VideoGenerationRequest['parameters']
  ): Promise<{ videoUrl: string; thumbnailUrl: string }> {
    try {
      const timestamp = Date.now();
      const videoKey = `videos/${jobId}/${timestamp}.mp4`;
      const thumbnailKey = `thumbnails/${jobId}/${timestamp}.jpg`;

      // Upload video
      const videoUploadCommand = new PutObjectCommand({
        Bucket: this.s3Config.bucket,
        Key: videoKey,
        Body: videoBuffer,
        ContentType: 'video/mp4',
        Metadata: {
          jobId,
          resolution: request.resolution,
          style: request.style,
          duration: request.duration.toString(),
        },
      });

      await this.s3Client.send(videoUploadCommand);

      // Upload thumbnail
      const thumbnailUploadCommand = new PutObjectCommand({
        Bucket: this.s3Config.bucket,
        Key: thumbnailKey,
        Body: thumbnailBuffer,
        ContentType: 'image/jpeg',
        Metadata: {
          jobId,
          type: 'thumbnail',
        },
      });

      await this.s3Client.send(thumbnailUploadCommand);

      // Generate URLs
      const videoUrl = this.s3Config.cdnDomain
        ? `https://${this.s3Config.cdnDomain}/${videoKey}`
        : `https://${this.s3Config.bucket}.s3.${this.s3Config.region}.amazonaws.com/${videoKey}`;

      const thumbnailUrl = this.s3Config.cdnDomain
        ? `https://${this.s3Config.cdnDomain}/${thumbnailKey}`
        : `https://${this.s3Config.bucket}.s3.${this.s3Config.region}.amazonaws.com/${thumbnailKey}`;

      logger.info('Video uploaded to S3', {
        jobId,
        videoKey,
        thumbnailKey,
        videoSize: videoBuffer.length,
        thumbnailSize: thumbnailBuffer.length,
      });

      return { videoUrl, thumbnailUrl };

    } catch (error) {
      logger.error('Error uploading video to S3:', error);
      throw new Error('Failed to upload video to storage');
    }
  }

  /**
   * Update job progress and broadcast to user
   */
  private async updateJobProgress(jobId: string, percentage: number, stage: string, message?: string): Promise<void> {
    try {
      // Update in-memory job
      const job = this.jobQueue.get(jobId);
      if (job) {
        job.progress = percentage;
        this.jobQueue.set(jobId, job);
      }

      // Update database
      await databaseService.updateGenerationJob(jobId, { progress: percentage });

      // Get job to get userId
      const dbJob = await databaseService.getGenerationJobById(jobId);
      if (dbJob) {
        // Broadcast progress update
        await realTimeService.updateGenerationProgress(jobId, {
          percentage,
          stage,
          message,
          data: { jobId, timestamp: new Date().toISOString() },
        });
      }

      logger.debug('Job progress updated', { jobId, percentage, stage });
    } catch (error) {
      logger.error('Error updating job progress:', error);
    }
  }

  /**
   * Handle job failure
   */
  private async handleJobFailure(jobId: string, errorMessage: string): Promise<void> {
    try {
      // Update job status
      await databaseService.updateGenerationJob(jobId, {
        status: 'failed',
        errorMessage,
        completedAt: new Date(),
      });

      // Get job details for refund
      const job = await databaseService.getGenerationJobById(jobId);
      if (job) {
        // Refund credits
        await creditService.refundCredits(
          job.userId,
          job.creditsDeducted,
          jobId,
          `Video generation failed: ${errorMessage}`
        );

        // Notify user
        await realTimeService.notifyUser(job.userId, {
          type: 'error',
          title: 'Video Generation Failed',
          message: `Your video generation failed: ${errorMessage}. Credits have been refunded.`,
          data: { jobId, refundedCredits: job.creditsDeducted },
        });

        // Update project status
        await this.updateProjectStatus(job.projectId, 'failed');
      }

      logger.error('Video generation job failed', { jobId, errorMessage });
    } catch (error) {
      logger.error('Error handling job failure:', error);
    }
  }

  /**
   * Validate user's tier limits for video generation
   */
  private async validateTierLimits(userId: string, request: VideoGenerationRequest): Promise<void> {
    try {
      const user = await databaseService.getUserById(userId);
      if (!user) {
        throw createError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Get user's subscription
      const subscription = await databaseService.getUserActiveSubscription(userId);
      const tier = subscription?.planId || 'free';

      // Define tier limits
      const tierLimits = {
        free: {
          maxDuration: 60, // 1 minute
          allowedResolutions: ['standard'],
          allowedStyles: ['social_media', 'educational'],
          maxCreditsPerOperation: 100,
        },
        starter: {
          maxDuration: 60, // 1 minute
          allowedResolutions: ['standard'],
          allowedStyles: ['social_media', 'educational', 'advertisement'],
          maxCreditsPerOperation: 200,
        },
        pro: {
          maxDuration: 7200, // 2 hours
          allowedResolutions: ['standard', 'hd'],
          allowedStyles: ['social_media', 'educational', 'advertisement', 'cinematic'],
          maxCreditsPerOperation: 1000,
        },
        ultra: {
          maxDuration: 7200, // 2 hours
          allowedResolutions: ['standard', 'hd', 'ultra'],
          allowedStyles: ['social_media', 'educational', 'advertisement', 'cinematic', 'vr'],
          maxCreditsPerOperation: 5000,
        },
      };

      const limits = tierLimits[tier as keyof typeof tierLimits];
      if (!limits) {
        throw createError('Invalid subscription tier', 400, 'INVALID_TIER');
      }

      // Check duration limit
      if (request.parameters.duration > limits.maxDuration) {
        throw createError(
          `Duration exceeds tier limit. Maximum: ${limits.maxDuration} seconds`,
          400,
          'DURATION_LIMIT_EXCEEDED'
        );
      }

      // Check resolution limit
      if (!limits.allowedResolutions.includes(request.parameters.resolution)) {
        throw createError(
          `Resolution not allowed for ${tier} tier. Allowed: ${limits.allowedResolutions.join(', ')}`,
          400,
          'RESOLUTION_NOT_ALLOWED'
        );
      }

      // Check style limit
      if (!limits.allowedStyles.includes(request.parameters.style)) {
        throw createError(
          `Style not allowed for ${tier} tier. Allowed: ${limits.allowedStyles.join(', ')}`,
          400,
          'STYLE_NOT_ALLOWED'
        );
      }

      // Estimate credits and check limit
      const estimate = await this.estimateVideoGenerationCost(request);
      if (estimate.creditsRequired > limits.maxCreditsPerOperation) {
        throw createError(
          `Operation exceeds credit limit for ${tier} tier. Maximum: ${limits.maxCreditsPerOperation} credits`,
          400,
          'CREDIT_LIMIT_EXCEEDED'
        );
      }

    } catch (error) {
      logger.error('Error validating tier limits:', error);
      throw error;
    }
  }

  /**
   * Helper methods
   */
  private async getAssetUrls(assetIds: string[]): Promise<string[]> {
    const assets = await databaseService.getMediaAssetsByIds(assetIds);
    return assets.map(asset => asset.url);
  }

  private estimateS3StorageCost(duration: number, resolution: VideoResolution): number {
    // Estimate file size based on duration and resolution
    const baseSizePerSecond = {
      standard: 1, // MB per second
      hd: 3,
      ultra: 8,
    };
    
    const estimatedSizeGB = (duration * baseSizePerSecond[resolution]) / 1024;
    return estimatedSizeGB * this.costConfig.services.s3.storageCost;
  }

  private calculateActualAwsCost(processingTimeMs: number, request: VideoGenerationRequest['parameters']): number {
    const processingHours = processingTimeMs / (1000 * 60 * 60);
    const sagemakerCost = processingHours * this.costConfig.services.sagemaker.inferenceInstanceCost;
    const s3Cost = this.estimateS3StorageCost(request.duration, request.resolution);
    return sagemakerCost + s3Cost;
  }

  private getResolutionDimensions(resolution: VideoResolution): { width: number; height: number } {
    const dimensions = {
      standard: { width: 1280, height: 720 },
      hd: { width: 1920, height: 1080 },
      ultra: { width: 3840, height: 2160 },
    };
    return dimensions[resolution];
  }

  private async updateProjectStatus(projectId: string, status: 'completed' | 'failed'): Promise<void> {
    try {
      await databaseService.updateProject(projectId, { status });
    } catch (error) {
      logger.error('Error updating project status:', error);
    }
  }

  /**
   * Health check for video generation service
   */
  async healthCheck(): Promise<{ status: 'ok' | 'error'; details: any }> {
    try {
      // Check S3 connectivity
      const s3Health = await this.checkS3Health();
      
      // Check SageMaker endpoint
      const sagemakerHealth = await this.checkSageMakerHealth();

      const allHealthy = s3Health.status === 'ok' && sagemakerHealth.status === 'ok';

      return {
        status: allHealthy ? 'ok' : 'error',
        details: {
          s3: s3Health,
          sagemaker: sagemakerHealth,
          jobQueue: {
            queuedJobs: this.jobQueue.size,
            processingJobs: this.processingJobs.size,
          },
        },
      };
    } catch (error) {
      logger.error('Video generation service health check failed:', error);
      return {
        status: 'error',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  private async checkS3Health(): Promise<{ status: 'ok' | 'error'; details?: any }> {
    try {
      // Try to list objects in bucket (just to test connectivity)
      const command = new GetObjectCommand({
        Bucket: this.s3Config.bucket,
        Key: 'health-check-dummy-key', // This key doesn't need to exist
      });

      try {
        await this.s3Client.send(command);
      } catch (error: any) {
        // NoSuchKey error is expected and means S3 is accessible
        if (error.name === 'NoSuchKey') {
          return { status: 'ok', details: { bucket: this.s3Config.bucket } };
        }
        throw error;
      }

      return { status: 'ok', details: { bucket: this.s3Config.bucket } };
    } catch (error) {
      return {
        status: 'error',
        details: { error: error instanceof Error ? error.message : 'S3 connectivity failed' },
      };
    }
  }

  private async checkSageMakerHealth(): Promise<{ status: 'ok' | 'error'; details?: any }> {
    try {
      // Simple health check payload
      const payload = { health_check: true };

      const command = new InvokeEndpointCommand({
        EndpointName: this.sagemakerConfig.endpoints.videoGeneration,
        ContentType: 'application/json',
        Body: JSON.stringify(payload),
      });

      const response = await this.sagemakerClient.send(command);
      
      return {
        status: 'ok',
        details: {
          endpoint: this.sagemakerConfig.endpoints.videoGeneration,
          responseReceived: !!response.Body,
        },
      };
    } catch (error) {
      return {
        status: 'error',
        details: {
          endpoint: this.sagemakerConfig.endpoints.videoGeneration,
          error: error instanceof Error ? error.message : 'SageMaker endpoint failed',
        },
      };
    }
  }
}

export const videoGenerationService = new VideoGenerationService();