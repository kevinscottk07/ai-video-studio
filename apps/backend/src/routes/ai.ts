import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { aiService } from '../services/aiService.js';
import { creditService } from '../services/creditService.js';
import { logger } from '../utils/logger.js';
import { createError } from '../middleware/errorHandler.js';

const router = Router();

// Validation middleware for script generation
const validateScriptGeneration = [
  body('prompt')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Prompt must be between 10 and 2000 characters')
    .trim(),
  body('language')
    .isIn(['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh', 'ar', 'hi', 'ru'])
    .withMessage('Unsupported language'),
  body('style')
    .optional()
    .isIn(['casual', 'professional', 'creative', 'educational'])
    .withMessage('Invalid style'),
  body('duration')
    .optional()
    .isInt({ min: 15, max: 600 })
    .withMessage('Duration must be between 15 and 600 seconds'),
  body('targetAudience')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Target audience description too long')
    .trim(),
];

/**
 * POST /api/v1/ai/script/estimate
 * Estimate cost for script generation
 */
router.post('/script/estimate', authenticate, validateScriptGeneration, async (req: Request, res: Response) => {
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

    const { prompt, language, style, duration, targetAudience } = req.body;
    const userId = req.user!.id;

    // Get cost estimate
    const estimate = await aiService.estimateScriptGenerationCost({
      prompt,
      language,
      style,
      duration,
      targetAudience,
    });

    // Check if user has sufficient credits
    const hasSufficientCredits = await creditService.checkSufficientCredits(
      userId,
      estimate.creditsRequired
    );

    logger.info('Script generation cost estimated', {
      userId,
      creditsRequired: estimate.creditsRequired,
      awsCost: estimate.awsCost,
      hasSufficientCredits,
      language,
      style,
    });

    res.json({
      success: true,
      data: {
        estimate: {
          creditsRequired: estimate.creditsRequired,
          awsCost: estimate.awsCost,
          breakdown: estimate.breakdown,
        },
        userBalance: await creditService.getCreditBalance(userId),
        canProceed: hasSufficientCredits,
      },
      requestId: req.id,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Error estimating script generation cost:', error);
    
    if (error instanceof Error && error.message.includes('Failed to estimate cost')) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Cost estimation service temporarily unavailable',
          requestId: req.id,
          timestamp: new Date().toISOString(),
        },
      });
    }

    throw error;
  }
});

/**
 * POST /api/v1/ai/script/generate
 * Generate a script using AWS Bedrock
 */
router.post('/script/generate', authenticate, validateScriptGeneration, async (req: Request, res: Response) => {
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

    const { prompt, language, style, duration, targetAudience } = req.body;
    const userId = req.user!.id;

    // First, get cost estimate
    const estimate = await aiService.estimateScriptGenerationCost({
      prompt,
      language,
      style,
      duration,
      targetAudience,
    });

    // Check if user has sufficient credits
    const hasSufficientCredits = await creditService.checkSufficientCredits(
      userId,
      estimate.creditsRequired
    );

    if (!hasSufficientCredits) {
      const balance = await creditService.getCreditBalance(userId);
      return res.status(402).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_CREDITS',
          message: 'Insufficient credits for this operation',
          details: {
            required: estimate.creditsRequired,
            available: balance.current - balance.reserved,
            shortfall: estimate.creditsRequired - (balance.current - balance.reserved),
          },
          requestId: req.id,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Generate unique operation ID for tracking
    const operationId = `script_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Deduct credits upfront (will be refunded if generation fails)
      const deductionTransaction = await creditService.deductCredits(
        userId,
        estimate.creditsRequired,
        operationId,
        `Script generation - ${language} (${style || 'professional'})`,
        estimate.awsCost
      );

      logger.info('Credits deducted for script generation', {
        userId,
        operationId,
        creditsDeducted: estimate.creditsRequired,
        transactionId: deductionTransaction.id,
      });

      // Generate the script
      const result = await aiService.generateScript({
        prompt,
        language,
        style,
        duration,
        targetAudience,
      });

      // Calculate any credit adjustment based on actual vs estimated cost
      const costDifference = result.cost.awsCost - estimate.awsCost;
      const creditDifference = result.cost.creditsRequired - estimate.creditsRequired;

      if (creditDifference !== 0) {
        // Adjust credits based on actual usage
        if (creditDifference > 0) {
          // Need to deduct more credits
          await creditService.deductCredits(
            userId,
            creditDifference,
            operationId,
            `Script generation cost adjustment - additional ${creditDifference} credits`,
            costDifference
          );
        } else {
          // Refund excess credits
          await creditService.refundCredits(
            userId,
            Math.abs(creditDifference),
            operationId,
            `Script generation cost adjustment - refund ${Math.abs(creditDifference)} credits`
          );
        }
      }

      logger.info('Script generation completed successfully', {
        userId,
        operationId,
        actualCredits: result.cost.creditsRequired,
        estimatedCredits: estimate.creditsRequired,
        creditAdjustment: creditDifference,
        wordCount: result.metadata.wordCount,
        language,
        style,
      });

      res.json({
        success: true,
        data: {
          script: result.script,
          metadata: result.metadata,
          usage: {
            creditsUsed: result.cost.creditsRequired,
            awsCost: result.cost.awsCost,
            tokens: result.usage,
          },
          operationId,
        },
        requestId: req.id,
        timestamp: new Date().toISOString(),
      });

    } catch (generationError) {
      // Refund credits if generation failed
      try {
        await creditService.refundCredits(
          userId,
          estimate.creditsRequired,
          operationId,
          'Script generation failed - full refund'
        );

        logger.info('Credits refunded due to generation failure', {
          userId,
          operationId,
          refundedCredits: estimate.creditsRequired,
        });
      } catch (refundError) {
        logger.error('Failed to refund credits after generation failure:', refundError);
      }

      throw generationError;
    }

  } catch (error) {
    logger.error('Error generating script:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Service temporarily unavailable')) {
        return res.status(503).json({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: error.message,
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
      
      if (error.message.includes('Invalid request parameters')) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: error.message,
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
      
      if (error.message.includes('Authentication failed')) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: 'AI service authentication failed. Please contact support.',
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    }

    // Generic error response
    res.status(500).json({
      success: false,
      error: {
        code: 'SCRIPT_GENERATION_FAILED',
        message: 'Script generation failed. Please try again.',
        requestId: req.id,
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * GET /api/v1/ai/health
 * Health check for AI services
 */
router.get('/health', authenticate, async (req: Request, res: Response) => {
  try {
    const healthCheck = await aiService.healthCheck();
    
    res.status(healthCheck.status === 'ok' ? 200 : 503).json({
      success: healthCheck.status === 'ok',
      data: healthCheck,
      requestId: req.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('AI health check failed:', error);
    
    res.status(503).json({
      success: false,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'AI service health check failed',
        requestId: req.id,
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * GET /api/v1/ai/supported-languages
 * Get list of supported languages for script generation
 */
router.get('/supported-languages', async (req: Request, res: Response) => {
  try {
    const supportedLanguages = [
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
    ];

    res.json({
      success: true,
      data: {
        languages: supportedLanguages,
        total: supportedLanguages.length,
      },
      requestId: req.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error getting supported languages:', error);
    throw error;
  }
});

export { router as aiRoutes };