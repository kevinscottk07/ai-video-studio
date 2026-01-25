import { Router, Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { contentModerationService } from '../services/contentModerationService.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { ModerationStatus, ReportReason, ModerationAction } from '@prisma/client';

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
 * POST /api/moderation/analyze
 * Analyze content for moderation (admin/moderator only)
 */
router.post(
  '/analyze',
  authenticateToken,
  requireRole(['admin', 'moderator']),
  [
    body('contentType').isIn(['post', 'comment', 'user_profile']),
    body('contentId').isUUID(),
    body('content.text').optional().isString(),
    body('content.imageUrls').optional().isArray(),
    body('content.videoUrl').optional().isURL(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { contentType, contentId, content } = req.body;

      const analysis = await contentModerationService.analyzeContent(
        contentType,
        contentId,
        content
      );

      res.json({
        success: true,
        data: analysis,
      });
    } catch (error) {
      logger.error('Failed to analyze content', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        body: req.body,
      });

      res.status(500).json({
        error: 'Failed to analyze content',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/moderation/report
 * Create a user report
 */
router.post(
  '/report',
  authenticateToken,
  [
    body('contentType').optional().isIn(['post', 'comment', 'user_profile']),
    body('contentId').optional().isUUID(),
    body('reportedUserId').optional().isUUID(),
    body('reason').isIn(Object.values(ReportReason)),
    body('description').isString().isLength({ min: 10, max: 1000 }).trim(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { contentType, contentId, reportedUserId, reason, description } = req.body;

      const report = await contentModerationService.createReport(userId, {
        contentType,
        contentId,
        reportedUserId,
        reason,
        description,
      });

      res.status(201).json({
        success: true,
        data: {
          id: report.id,
          status: report.status,
          createdAt: report.createdAt,
        },
      });
    } catch (error) {
      logger.error('Failed to create report', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        body: req.body,
      });

      let statusCode = 500;
      if (error instanceof Error && error.message.includes('already reported')) {
        statusCode = 409;
      }

      res.status(statusCode).json({
        error: 'Failed to create report',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/moderation/queue
 * Get moderation queue (admin/moderator only)
 */
router.get(
  '/queue',
  authenticateToken,
  requireRole(['admin', 'moderator']),
  [
    query('status').optional().isIn(Object.values(ModerationStatus)),
    query('contentType').optional().isString(),
    query('reason').optional().isIn(Object.values(ReportReason)),
    query('flaggedBy').optional().isUUID(),
    query('reviewedBy').optional().isUUID(),
    query('dateFrom').optional().isISO8601(),
    query('dateTo').optional().isISO8601(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const filters = {
        status: req.query.status as ModerationStatus | undefined,
        contentType: req.query.contentType as string | undefined,
        reason: req.query.reason as ReportReason | undefined,
        flaggedBy: req.query.flaggedBy as string | undefined,
        reviewedBy: req.query.reviewedBy as string | undefined,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      };

      const result = await contentModerationService.getModerationQueue(filters);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Failed to get moderation queue', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        query: req.query,
      });

      res.status(500).json({
        error: 'Failed to get moderation queue',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/moderation/review/:flagId
 * Review a moderation flag (admin/moderator only)
 */
router.post(
  '/review/:flagId',
  authenticateToken,
  requireRole(['admin', 'moderator']),
  [
    param('flagId').isUUID(),
    body('status').isIn(Object.values(ModerationStatus)),
    body('action').isIn(Object.values(ModerationAction)),
    body('moderatorNotes').optional().isString().isLength({ max: 1000 }),
    body('actionDuration').optional().isInt({ min: 1, max: 8760 }), // Max 1 year in hours
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { flagId } = req.params;
      const moderatorId = req.user!.id;
      const { status, action, moderatorNotes, actionDuration } = req.body;

      const reviewedFlag = await contentModerationService.reviewFlag(moderatorId, {
        flagId,
        status,
        action,
        moderatorNotes,
        actionDuration,
      });

      res.json({
        success: true,
        data: reviewedFlag,
      });
    } catch (error) {
      logger.error('Failed to review flag', {
        error: error instanceof Error ? error.message : 'Unknown error',
        flagId: req.params.flagId,
        moderatorId: req.user?.id,
        body: req.body,
      });

      const statusCode = error instanceof Error && error.message === 'Moderation flag not found' ? 404 : 500;

      res.status(statusCode).json({
        error: 'Failed to review flag',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/moderation/guidelines
 * Get community guidelines
 */
router.get(
  '/guidelines',
  async (req: Request, res: Response) => {
    try {
      const guidelines = await contentModerationService.getCommunityGuidelines();

      res.json({
        success: true,
        data: guidelines,
      });
    } catch (error) {
      logger.error('Failed to get community guidelines', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        error: 'Failed to get community guidelines',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/moderation/stats
 * Get moderation statistics (admin/moderator only)
 */
router.get(
  '/stats',
  authenticateToken,
  requireRole(['admin', 'moderator']),
  async (req: Request, res: Response) => {
    try {
      // Get basic moderation statistics
      const [
        totalFlags,
        pendingFlags,
        resolvedFlags,
        totalReports,
        pendingReports,
      ] = await Promise.all([
        contentModerationService['prisma'].contentModerationFlag.count({
          where: { isActive: true },
        }),
        contentModerationService['prisma'].contentModerationFlag.count({
          where: { status: ModerationStatus.pending, isActive: true },
        }),
        contentModerationService['prisma'].contentModerationFlag.count({
          where: { 
            status: { in: [ModerationStatus.approved, ModerationStatus.rejected] },
            isActive: true,
          },
        }),
        contentModerationService['prisma'].userReport.count(),
        contentModerationService['prisma'].userReport.count({
          where: { status: ModerationStatus.pending },
        }),
      ]);

      const stats = {
        flags: {
          total: totalFlags,
          pending: pendingFlags,
          resolved: resolvedFlags,
        },
        reports: {
          total: totalReports,
          pending: pendingReports,
        },
        efficiency: {
          resolutionRate: totalFlags > 0 ? (resolvedFlags / totalFlags) * 100 : 0,
          pendingPercentage: totalFlags > 0 ? (pendingFlags / totalFlags) * 100 : 0,
        },
      };

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Failed to get moderation stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
      });

      res.status(500).json({
        error: 'Failed to get moderation stats',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;