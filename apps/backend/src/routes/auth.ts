import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { UserService } from '../services/userService.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { logger } from '../utils/logger.js';
import { createError } from '../middleware/errorHandler.js';

const router = Router();
const userService = new UserService();

// Validation middleware
const validateUserProfile = [
  body('email').isEmail().normalizeEmail(),
  body('displayName').isLength({ min: 1, max: 100 }).trim(),
  body('profileImage').optional().isURL(),
  body('language').optional().isLength({ min: 2, max: 5 }),
  body('timezone').optional().isLength({ min: 1, max: 50 }),
];

// POST /auth/profile - Create or update user profile after Auth0 authentication
router.post('/profile', authRateLimiter, authenticate, validateUserProfile, async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
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

    const { email, displayName, profileImage, language, timezone } = req.body;
    const authProviderId = req.user!.sub;

    // Find or create user
    const user = await userService.findOrCreateUser(authProviderId, {
      email,
      authProviderId,
      displayName,
      profileImage,
      language,
      timezone,
    });

    logger.info('User profile created/updated', {
      userId: user.id,
      email: user.email,
      isNewUser: !user.last_login_at,
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
          profileImage: user.profile_image,
          language: user.language,
          timezone: user.timezone,
          creditBalance: user.credit_balance,
          role: user.role,
          createdAt: user.created_at,
          lastLoginAt: user.last_login_at,
        },
      },
      requestId: req.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error in profile endpoint:', error);
    throw error;
  }
});

// GET /auth/me - Get current user profile
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await userService.getUserByAuthProviderId(req.user!.sub);
    
    if (!user) {
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
          profileImage: user.profile_image,
          language: user.language,
          timezone: user.timezone,
          creditBalance: user.credit_balance,
          totalCreditsEver: user.total_credits_ever,
          role: user.role,
          createdAt: user.created_at,
          lastLoginAt: user.last_login_at,
        },
      },
      requestId: req.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error in me endpoint:', error);
    throw error;
  }
});

// PUT /auth/profile - Update user profile
router.put('/profile', authenticate, validateUserProfile, async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
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

    const user = await userService.getUserByAuthProviderId(req.user!.sub);
    
    if (!user) {
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    const { displayName, profileImage, language, timezone } = req.body;
    
    const updatedUser = await userService.updateUser(user.id, {
      displayName,
      profileImage,
      language,
      timezone,
    });

    logger.info('User profile updated', { userId: updatedUser.id });

    res.json({
      success: true,
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          displayName: updatedUser.display_name,
          profileImage: updatedUser.profile_image,
          language: updatedUser.language,
          timezone: updatedUser.timezone,
          creditBalance: updatedUser.credit_balance,
          role: updatedUser.role,
          createdAt: updatedUser.created_at,
          lastLoginAt: updatedUser.last_login_at,
        },
      },
      requestId: req.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error updating profile:', error);
    throw error;
  }
});

// POST /auth/logout - Logout user (invalidate session)
router.post('/logout', optionalAuthenticate, async (req: Request, res: Response) => {
  try {
    // In a JWT-based system, logout is typically handled client-side
    // But we can log the logout event and potentially blacklist the token
    
    if (req.user) {
      logger.info('User logged out', { userId: req.user.id });
    }

    res.json({
      success: true,
      message: 'Logged out successfully',
      requestId: req.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error in logout endpoint:', error);
    throw error;
  }
});

// GET /auth/status - Check authentication status
router.get('/status', optionalAuthenticate, async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: {
        authenticated: !!req.user,
        user: req.user ? {
          id: req.user.id,
          email: req.user.email,
          role: req.user.role,
        } : null,
      },
      requestId: req.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error in status endpoint:', error);
    throw error;
  }
});

export default router;