import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { videoGenerationService } from '../services/videoGenerationService.js';
import { logger } from '../utils/logger.js';
import { createError } from '../middleware/errorHandler.js';
import type { VideoGenerationRequest } from '../services/videoGenerationService.js';

const router = Router();

// Validation middleware for video generation
const validateVideoGeneration = [
  body('projectId')
    .isUUID()
    .withMessage('Invalid project ID'),
  body('parameters.prompt')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Prompt must be between 10 and 2000 characters')
    .trim(),
  body('parameters.duration')
    .isInt({ min: 15, max: 7200 })
    .withMessage('Duration must be between 15 seconds and 2 hours'),
  body('parameters.resolution')
    .isIn(['standard', 'hd', 'ultra'])
    .withMessage('Invalid resolution'),
  body('parameters.style')
    .isIn(['cinematic', 'advertisement', 'social_media', 'educational', 'vr'])
    .withMessage('Invalid style'),
  body('parameters.language')
    .optional()
    .isIn(['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh', 'ar', 'hi', 'ru'])
    .withMessage('Unsupported language'),
  body('parameters.aspectRatio')
    .optional()
    .isIn(['16:9', '9:16', '1:1', '4:3'])
    .withMessage('Invalid aspect ratio'),
  body('parameters.fps')
    .optional()
    .isIn([24, 30, 60])
    .withMessage('Invalid FPS'),
  body('parameters.quality')
    .optional()
    .isIn(['draft', 'standard', 'high', 'ultra'])
    .withMessage('Invalid quality setting'),
  body('parameters.assets')
    .optional()
    .isArray()
    .withMessage('Assets must be an array')
    .custom((assets) => {
      if (assets && assets.length > 0) {
        return assets.every((asset: any) => typeof asset === 'string');
      }
      return true;
    })
    .withMessage('All assets must be valid asset IDs'),
];

/**
 * POST /api/v1/video/estimate
 * Estimate cost for video generation
 */
router.post('/estimate', authenticate, validateVideoGeneration, async (req: Request, res: Response) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array(),
          requestId: req.id,
          timestamp: new Date().toISOString(),
        },
      });
    }

    const userId = req.user!.id;
    const request: VideoGenerationRequest = {
      ...req.body,
      operationType: 'video_generation',
    };

    // Get cost estimate
    const estimate = await videoGenerationService.estimateVideoGenerationCost(request);

    logger.info('Video generation cost estimated', {
      userId,
      projectId: request.projectId,
      creditsRequired: estimate.creditsRequired,
      awsCost: estimate.awsCost,
      estimatedDuration: estimate.estimatedDuration,
    });

    res.json({
      success: true,
      data: {
        estimate: {
          creditsRequired: estimate.creditsRequired,
          awsCost: estimate.awsCost,
          estimatedDuration: estimate.estimatedDuration,
          breakdown: estimate.breakdown,
        },
      },
      requestId: req.id,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Error estimating video generation cost:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('DURATION_LIMIT_EXCEEDED')) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'DURATION_LIMIT_EXCEEDED',
            message: error.message,
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
      
      if (error.message.includes('RESOLUTION_NOT_ALLOWED')) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'RESOLUTION_NOT_ALLOWED',
            message: error.message,
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
      
      if (error.message.includes('STYLE_NOT_ALLOWED')) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'STYLE_NOT_ALLOWED',
            message: error.message,
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'ESTIMATION_FAILED',
        message: 'Failed to estimate video generation cost',
        requestId: req.id,
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * POST /api/v1/video/generate
 * Queue video generation job
 */
router.post('/generate', authenticate, validateVideoGeneration, async (req: Request, res: Response) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array(),
          requestId: req.id,
          timestamp: new Date().toISOString(),
        },
      });
    }

    const userId = req.user!.id;
    const request: VideoGenerationRequest = {
      ...req.body,
      operationType: 'video_generation',
    };

    // Queue video generation job
    const job = await videoGenerationService.queueVideoGeneration(request, userId);

    logger.info('Video generation job queued', {
      jobId: job.id,
      userId,
      projectId: request.projectId,
      creditsRequired: job.creditsRequired,
    });

    res.status(202).json({
      success: true,
      data: {
        job: {
          id: job.id,
          status: job.status,
          progress: job.progress,
          creditsRequired: job.creditsRequired,
          estimatedCompletion: new Date(Date.now() + (job.metadata?.estimate?.estimatedDuration || 10) * 60 * 1000),
        },
      },
      requestId: req.id,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Error queuing video generation:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('INSUFFICIENT_CREDITS')) {
        return res.status(402).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_CREDITS',
            message: error.message,
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
      
      if (error.message.includes('DURATION_LIMIT_EXCEEDED') || 
          error.message.includes('RESOLUTION_NOT_ALLOWED') ||
          error.message.includes('STYLE_NOT_ALLOWED') ||
          error.message.includes('CREDIT_LIMIT_EXCEEDED')) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'TIER_LIMIT_EXCEEDED',
            message: error.message,
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'GENERATION_FAILED',
        message: 'Failed to queue video generation',
        requestId: req.id,
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * GET /api/v1/video/job/:jobId
 * Get video generation job status
 */
router.get('/job/:jobId', authenticate, [
  param('jobId').isUUID().withMessage('Invalid job ID'),
], async (req: Request, res: Response) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid job ID',
          details: errors.array(),
          requestId: req.id,
          timestamp: new Date().toISOString(),
        },
      });
    }

    const { jobId } = req.params;
    const userId = req.user!.id;

    // Get job status
    const job = await videoGenerationService.getJobStatus(jobId);

    // Verify user owns the job
    if (job.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'You do not have access to this job',
          requestId: req.id,
          timestamp: new Date().toISOString(),
        },
      });
    }

    res.json({
      success: true,
      data: {
        job: {
          id: job.id,
          projectId: job.projectId,
          status: job.status,
          progress: job.progress,
          creditsRequired: job.creditsRequired,
          creditsDeducted: job.creditsDeducted,
          resultUrl: job.resultUrl,
          errorMessage: job.errorMessage,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt,
          completedAt: job.completedAt,
          metadata: job.metadata,
        },
      },
      requestId: req.id,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Error getting job status:', error);
    
    if (error instanceof Error && error.message.includes('JOB_NOT_FOUND')) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'JOB_NOT_FOUND',
          message: 'Job not found',
          requestId: req.id,
          timestamp: new Date().toISOString(),
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'GET_JOB_FAILED',
        message: 'Failed to get job status',
        requestId: req.id,
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * DELETE /api/v1/video/job/:jobId
 * Cancel video generation job
 */
router.delete('/job/:jobId', authenticate, [
  param('jobId').isUUID().withMessage('Invalid job ID'),
], async (req: Request, res: Response) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid job ID',
          details: errors.array(),
          requestId: req.id,
          timestamp: new Date().toISOString(),
        },
      });
    }

    const { jobId } = req.params;
    const userId = req.user!.id;

    // Cancel job
    const result = await videoGenerationService.cancelJob(jobId, userId);

    logger.info('Video generation job cancelled', {
      jobId,
      userId,
      refundedCredits: result.refundedCredits,
    });

    res.json({
      success: true,
      data: {
        cancelled: result.success,
        refundedCredits: result.refundedCredits,
      },
      requestId: req.id,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Error cancelling job:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('JOB_NOT_FOUND')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'JOB_NOT_FOUND',
            message: 'Job not found',
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
      
      if (error.message.includes('UNAUTHORIZED')) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'You do not have access to this job',
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
      
      if (error.message.includes('CANNOT_CANCEL')) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'CANNOT_CANCEL',
            message: error.message,
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'CANCEL_FAILED',
        message: 'Failed to cancel job',
        requestId: req.id,
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * GET /api/v1/video/health
 * Health check for video generation service
 */
router.get('/health', authenticate, async (req: Request, res: Response) => {
  try {
    const healthCheck = await videoGenerationService.healthCheck();
    
    res.status(healthCheck.status === 'ok' ? 200 : 503).json({
      success: healthCheck.status === 'ok',
      data: healthCheck,
      requestId: req.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Video generation health check failed:', error);
    
    res.status(503).json({
      success: false,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Video generation service health check failed',
        requestId: req.id,
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * GET /api/v1/video/supported-options
 * Get supported video generation options
 */
router.get('/supported-options', async (req: Request, res: Response) => {
  try {
    const supportedOptions = {
      resolutions: [
        { value: 'standard', label: 'Standard (720p)', dimensions: '1280x720' },
        { value: 'hd', label: 'HD (1080p)', dimensions: '1920x1080' },
        { value: 'ultra', label: 'Ultra (4K)', dimensions: '3840x2160' },
      ],
      styles: [
        { value: 'cinematic', label: 'Cinematic', description: 'Professional movie-style videos' },
        { value: 'advertisement', label: 'Advertisement', description: 'Marketing and promotional content' },
        { value: 'social_media', label: 'Social Media', description: 'Optimized for social platforms' },
        { value: 'educational', label: 'Educational', description: 'Learning and instructional content' },
        { value: 'vr', label: 'VR/360°', description: 'Virtual reality and 360-degree videos' },
      ],
      aspectRatios: [
        { value: '16:9', label: 'Widescreen (16:9)', description: 'Standard for YouTube, TV' },
        { value: '9:16', label: 'Vertical (9:16)', description: 'Perfect for TikTok, Instagram Stories' },
        { value: '1:1', label: 'Square (1:1)', description: 'Instagram posts, Facebook' },
        { value: '4:3', label: 'Traditional (4:3)', description: 'Classic TV format' },
      ],
      frameRates: [
        { value: 24, label: '24 FPS', description: 'Cinematic standard' },
        { value: 30, label: '30 FPS', description: 'Standard video' },
        { value: 60, label: '60 FPS', description: 'Smooth motion' },
      ],
      qualities: [
        { value: 'draft', label: 'Draft', description: 'Quick preview quality' },
        { value: 'standard', label: 'Standard', description: 'Good quality for most uses' },
        { value: 'high', label: 'High', description: 'Professional quality' },
        { value: 'ultra', label: 'Ultra', description: 'Maximum quality' },
      ],
      languages: [
        { code: 'en', name: 'English', nativeName: 'English' },
        { code: 'es', name: 'Spanish', nativeName: 'Español' },
        { code: 'fr', name: 'French', nativeName: 'Français' },
        { code: 'de', name: 'German', nativeName: 'Deutsch' },
        { code: 'it', name: 'Italian', nativeName: 'Italiano' },
        { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
        { code: 'ja', name: 'Japanese', nativeName: '日本語' },
        { code: 'ko', name: 'Korean', nativeName: '한국어' },
        { code: 'zh', name: 'Chinese', nativeName: '中文' },
        { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
        { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
        { code: 'ru', name: 'Russian', nativeName: 'Русский' },
      ],
    };

    res.json({
      success: true,
      data: supportedOptions,
      requestId: req.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error getting supported options:', error);
    throw error;
  }
});

export { router as videoRoutes };