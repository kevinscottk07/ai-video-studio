import { Router, Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { communityService } from '../services/communityService.js';
import { authenticateToken } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Validation middleware
const validateRequest = (req: Request, res: Response, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array(),
    });
  }
  next();
};

/**
 * GET /api/community/feed
 * Get community feed with optional filters
 */
router.get(
  '/feed',
  [
    query('tags').optional().isString(),
    query('sortBy').optional().isIn(['createdAt', 'likes', 'comments', 'views']),
    query('sortOrder').optional().isIn(['asc', 'desc']),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('offset').optional().isInt({ min: 0 }),
    query('search').optional().isString().isLength({ min: 1, max: 100 }),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id; // Optional - works for both authenticated and anonymous users
      
      const filters = {
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        sortBy: req.query.sortBy as 'createdAt' | 'likes' | 'comments' | 'views' | undefined,
        sortOrder: req.query.sortOrder as 'asc' | 'desc' | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
        search: req.query.search as string | undefined,
      };

      const result = await communityService.getCommunityFeed(userId, filters);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Failed to get community feed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        query: req.query,
      });

      res.status(500).json({
        error: 'Failed to get community feed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/community/posts/:postId
 * Get a specific community post
 */
router.get(
  '/posts/:postId',
  [
    param('postId').isUUID(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { postId } = req.params;
      const userId = req.user?.id;

      const post = await communityService.getPost(postId, userId);

      res.json({
        success: true,
        data: post,
      });
    } catch (error) {
      logger.error('Failed to get post', {
        error: error instanceof Error ? error.message : 'Unknown error',
        postId: req.params.postId,
        userId: req.user?.id,
      });

      const statusCode = error instanceof Error && error.message === 'Post not found' ? 404 : 500;
      
      res.status(statusCode).json({
        error: 'Failed to get post',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/community/posts/:postId/like
 * Like or unlike a post
 */
router.post(
  '/posts/:postId/like',
  authenticateToken,
  [
    param('postId').isUUID(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { postId } = req.params;
      const userId = req.user!.id;

      const result = await communityService.likePost(postId, userId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Failed to toggle post like', {
        error: error instanceof Error ? error.message : 'Unknown error',
        postId: req.params.postId,
        userId: req.user?.id,
      });

      const statusCode = error instanceof Error && error.message === 'Post not found' ? 404 : 500;
      
      res.status(statusCode).json({
        error: 'Failed to toggle post like',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/community/posts/:postId/comments
 * Add a comment to a post
 */
router.post(
  '/posts/:postId/comments',
  authenticateToken,
  [
    param('postId').isUUID(),
    body('content').isString().isLength({ min: 1, max: 1000 }).trim(),
    body('parentCommentId').optional().isUUID(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { postId } = req.params;
      const userId = req.user!.id;
      const { content, parentCommentId } = req.body;

      const comment = await communityService.commentOnPost(postId, userId, {
        content,
        parentCommentId,
      });

      res.status(201).json({
        success: true,
        data: comment,
      });
    } catch (error) {
      logger.error('Failed to create comment', {
        error: error instanceof Error ? error.message : 'Unknown error',
        postId: req.params.postId,
        userId: req.user?.id,
      });

      let statusCode = 500;
      if (error instanceof Error) {
        if (error.message === 'Post not found' || error.message === 'Parent comment not found') {
          statusCode = 404;
        } else if (error.message === 'Comments are not allowed on this post') {
          statusCode = 403;
        }
      }
      
      res.status(statusCode).json({
        error: 'Failed to create comment',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/community/posts/:postId/comments
 * Get comments for a post
 */
router.get(
  '/posts/:postId/comments',
  [
    param('postId').isUUID(),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('offset').optional().isInt({ min: 0 }),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { postId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const result = await communityService.getPostComments(postId, limit, offset);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Failed to get post comments', {
        error: error instanceof Error ? error.message : 'Unknown error',
        postId: req.params.postId,
      });

      res.status(500).json({
        error: 'Failed to get post comments',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/community/posts/:postId/share
 * Share a post on a platform
 */
router.post(
  '/posts/:postId/share',
  authenticateToken,
  [
    param('postId').isUUID(),
    body('platform').isString().isIn(['twitter', 'facebook', 'linkedin', 'instagram', 'tiktok', 'youtube', 'other']),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { postId } = req.params;
      const userId = req.user!.id;
      const { platform } = req.body;

      const result = await communityService.sharePost(postId, userId, platform);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Failed to share post', {
        error: error instanceof Error ? error.message : 'Unknown error',
        postId: req.params.postId,
        userId: req.user?.id,
        platform: req.body.platform,
      });

      const statusCode = error instanceof Error && error.message === 'Post not found' ? 404 : 500;
      
      res.status(statusCode).json({
        error: 'Failed to share post',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/community/trending-tags
 * Get trending tags
 */
router.get(
  '/trending-tags',
  [
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      
      const tags = await communityService.getTrendingTags(limit);

      res.json({
        success: true,
        data: tags,
      });
    } catch (error) {
      logger.error('Failed to get trending tags', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        error: 'Failed to get trending tags',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;