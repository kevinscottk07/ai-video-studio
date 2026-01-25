import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth.js';
import { translationService } from '../services/translationService.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * @route POST /api/translation/translate
 * @desc Translate text from one language to another
 * @access Private
 */
router.post('/translate',
  authenticateToken,
  [
    body('text')
      .notEmpty()
      .withMessage('Text is required')
      .isLength({ max: 5000 })
      .withMessage('Text must be less than 5000 characters'),
    body('sourceLanguage')
      .notEmpty()
      .withMessage('Source language is required'),
    body('targetLanguage')
      .notEmpty()
      .withMessage('Target language is required'),
    body('context')
      .optional()
      .isIn(['video_script', 'ui_text', 'marketing', 'technical'])
      .withMessage('Invalid context type'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: errors.array(),
          },
        });
      }

      const { text, sourceLanguage, targetLanguage, context } = req.body;
      const userId = req.user?.sub;

      logger.info('Translation request received', {
        userId,
        sourceLanguage,
        targetLanguage,
        context,
        textLength: text.length,
      });

      const result = await translationService.translateText({
        text,
        sourceLanguage,
        targetLanguage,
        context,
      });

      logger.info('Translation completed successfully', {
        userId,
        sourceLanguage,
        targetLanguage,
        confidence: result.confidence,
      });

      res.json({
        success: true,
        data: {
          translation: result,
        },
      });

    } catch (error) {
      logger.error('Translation failed', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.sub,
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'TRANSLATION_ERROR',
          message: error instanceof Error ? error.message : 'Translation failed',
        },
      });
    }
  }
);

/**
 * @route POST /api/translation/optimize-prompt
 * @desc Optimize video generation prompt for specific language and culture
 * @access Private
 */
router.post('/optimize-prompt',
  authenticateToken,
  [
    body('prompt')
      .notEmpty()
      .withMessage('Prompt is required')
      .isLength({ max: 2000 })
      .withMessage('Prompt must be less than 2000 characters'),
    body('targetLanguage')
      .notEmpty()
      .withMessage('Target language is required'),
    body('videoStyle')
      .notEmpty()
      .withMessage('Video style is required'),
    body('culturalContext')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Cultural context must be less than 500 characters'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: errors.array(),
          },
        });
      }

      const { prompt, targetLanguage, videoStyle, culturalContext } = req.body;
      const userId = req.user?.sub;

      logger.info('Prompt optimization request received', {
        userId,
        targetLanguage,
        videoStyle,
        promptLength: prompt.length,
      });

      const result = await translationService.optimizePromptForLanguage({
        prompt,
        targetLanguage,
        videoStyle,
        culturalContext,
      });

      logger.info('Prompt optimization completed successfully', {
        userId,
        targetLanguage,
        adaptationsCount: result.culturalAdaptations.length,
      });

      res.json({
        success: true,
        data: {
          optimization: result,
        },
      });

    } catch (error) {
      logger.error('Prompt optimization failed', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.sub,
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'OPTIMIZATION_ERROR',
          message: error instanceof Error ? error.message : 'Prompt optimization failed',
        },
      });
    }
  }
);

/**
 * @route GET /api/translation/supported-languages
 * @desc Get list of supported languages for translation
 * @access Public
 */
router.get('/supported-languages', async (req, res) => {
  try {
    // Return the same languages we support in the UI
    const supportedLanguages = [
      {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        flag: '🇺🇸',
      },
      {
        code: 'es',
        name: 'Spanish',
        nativeName: 'Español',
        flag: '🇪🇸',
      },
      {
        code: 'fr',
        name: 'French',
        nativeName: 'Français',
        flag: '🇫🇷',
      },
      {
        code: 'de',
        name: 'German',
        nativeName: 'Deutsch',
        flag: '🇩🇪',
      },
      {
        code: 'zh',
        name: 'Chinese',
        nativeName: '中文',
        flag: '🇨🇳',
      },
      {
        code: 'ja',
        name: 'Japanese',
        nativeName: '日本語',
        flag: '🇯🇵',
      },
      {
        code: 'ko',
        name: 'Korean',
        nativeName: '한국어',
        flag: '🇰🇷',
      },
      {
        code: 'pt',
        name: 'Portuguese',
        nativeName: 'Português',
        flag: '🇵🇹',
      },
      {
        code: 'it',
        name: 'Italian',
        nativeName: 'Italiano',
        flag: '🇮🇹',
      },
      {
        code: 'ru',
        name: 'Russian',
        nativeName: 'Русский',
        flag: '🇷🇺',
      },
    ];

    res.json({
      success: true,
      data: {
        languages: supportedLanguages,
      },
    });

  } catch (error) {
    logger.error('Failed to get supported languages', {
      error: error instanceof Error ? error.message : error,
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to get supported languages',
      },
    });
  }
});

/**
 * @route GET /api/translation/health
 * @desc Check translation service health
 * @access Private
 */
router.get('/health',
  authenticateToken,
  async (req, res) => {
    try {
      const health = await translationService.healthCheck();

      res.json({
        success: true,
        data: {
          health,
        },
      });

    } catch (error) {
      logger.error('Translation health check failed', {
        error: error instanceof Error ? error.message : error,
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'HEALTH_CHECK_ERROR',
          message: 'Translation service health check failed',
        },
      });
    }
  }
);

export default router;