import express, { Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { adminService } from '../services/adminService.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import type {
  GetUsersRequest,
  UpdateUserRequest,
  GetSystemMetricsRequest,
  UpdatePricingConfigRequest,
  GetAuditLogsRequest,
  DateRange
} from '../types/index.js';

const router = express.Router();

// All admin routes require admin role
router.use(authenticateToken);
router.use(requireRole(['admin']));

// ============================================================================
// DASHBOARD METRICS
// ============================================================================

/**
 * GET /api/admin/dashboard/metrics
 * Get comprehensive dashboard metrics
 */
router.get(
  '/dashboard/metrics',
  [
    query('startDate').optional().isISO8601().toDate(),
    query('endDate').optional().isISO8601().toDate(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw createError('Invalid request parameters', 400, 'VALIDATION_ERROR', errors.array());
      }

      const dateRange: DateRange | undefined = req.query.startDate && req.query.endDate
        ? {
            start: req.query.startDate as Date,
            end: req.query.endDate as Date
          }
        : undefined;

      const metrics = await adminService.getDashboardMetrics(dateRange);

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      logger.error('Failed to get dashboard metrics:', error);
      throw error;
    }
  }
);

// ============================================================================
// USER MANAGEMENT
// ============================================================================

/**
 * GET /api/admin/users
 * Get users with filtering and pagination
 */
router.get(
  '/users',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('role').optional().isIn(['user', 'admin', 'moderator']),
    query('isActive').optional().isBoolean().toBoolean(),
    query('search').optional().isString().trim(),
    query('startDate').optional().isISO8601().toDate(),
    query('endDate').optional().isISO8601().toDate(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw createError('Invalid request parameters', 400, 'VALIDATION_ERROR', errors.array());
      }

      const request: GetUsersRequest = {
        filters: {
          role: req.query.role ? [req.query.role as any] : undefined,
          isActive: req.query.isActive as boolean | undefined,
          search: req.query.search as string | undefined,
          dateRange: req.query.startDate && req.query.endDate
            ? {
                start: req.query.startDate as Date,
                end: req.query.endDate as Date
              }
            : undefined
        },
        pagination: {
          page: (req.query.page as number) || 1,
          limit: (req.query.limit as number) || 20
        }
      };

      const result = await adminService.getUsers(request);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Failed to get users:', error);
      throw error;
    }
  }
);

/**
 * PUT /api/admin/users/:userId
 * Update user details
 */
router.put(
  '/users/:userId',
  [
    param('userId').isUUID(),
    body('role').optional().isIn(['user', 'admin', 'moderator']),
    body('isActive').optional().isBoolean(),
    body('creditBalance').optional().isInt({ min: 0 }),
    body('displayName').optional().isString().trim().isLength({ min: 1, max: 100 }),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw createError('Invalid request parameters', 400, 'VALIDATION_ERROR', errors.array());
      }

      const request: UpdateUserRequest = {
        userId: req.params.userId,
        updates: {
          role: req.body.role,
          isActive: req.body.isActive,
          creditBalance: req.body.creditBalance,
          displayName: req.body.displayName
        }
      };

      const result = await adminService.updateUser(request);

      res.json({
        success: true,
        data: result.user
      });
    } catch (error) {
      logger.error('Failed to update user:', error);
      throw error;
    }
  }
);

// ============================================================================
// SYSTEM METRICS
// ============================================================================

/**
 * GET /api/admin/system/metrics
 * Get detailed system metrics
 */
router.get(
  '/system/metrics',
  [
    query('dateRange.start').optional().isISO8601().toDate(),
    query('dateRange.end').optional().isISO8601().toDate(),
    query('granularity').optional().isIn(['hour', 'day', 'week', 'month']),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw createError('Invalid request parameters', 400, 'VALIDATION_ERROR', errors.array());
      }

      const request: GetSystemMetricsRequest = {
        dateRange: req.query['dateRange.start'] && req.query['dateRange.end']
          ? {
              start: req.query['dateRange.start'] as Date,
              end: req.query['dateRange.end'] as Date
            }
          : undefined,
        granularity: req.query.granularity as 'hour' | 'day' | 'week' | 'month' | undefined
      };

      // For now, return mock metrics
      // In production, this would query monitoring systems
      const metrics = {
        responseTime: [
          { timestamp: new Date(), value: 150, metadata: { endpoint: '/api/video/generate' } },
          { timestamp: new Date(), value: 120, metadata: { endpoint: '/api/credits/balance' } }
        ],
        errorRate: [
          { timestamp: new Date(), value: 0.1, metadata: { type: 'client_error' } },
          { timestamp: new Date(), value: 0.05, metadata: { type: 'server_error' } }
        ],
        throughput: [
          { timestamp: new Date(), value: 1000, metadata: { requests_per_minute: 1000 } }
        ]
      };

      res.json({
        success: true,
        data: { metrics }
      });
    } catch (error) {
      logger.error('Failed to get system metrics:', error);
      throw error;
    }
  }
);

// ============================================================================
// PRICING CONFIGURATION
// ============================================================================

/**
 * GET /api/admin/pricing/config
 * Get current pricing configuration
 */
router.get('/pricing/config', async (req: Request, res: Response) => {
  try {
    const config = await adminService.getPricingConfig();

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    logger.error('Failed to get pricing config:', error);
    throw error;
  }
});

/**
 * PUT /api/admin/pricing/config
 * Update pricing configuration
 */
router.put(
  '/pricing/config',
  [
    body('creditPrice').optional().isInt({ min: 1 }),
    body('operationCosts').optional().isObject(),
    body('subscriptionPlans').optional().isArray(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw createError('Invalid request parameters', 400, 'VALIDATION_ERROR', errors.array());
      }

      const request: UpdatePricingConfigRequest = {
        config: {
          creditPrice: req.body.creditPrice,
          operationCosts: req.body.operationCosts,
          subscriptionPlans: req.body.subscriptionPlans
        }
      };

      const result = await adminService.updatePricingConfig(request);

      res.json({
        success: true,
        data: result.config
      });
    } catch (error) {
      logger.error('Failed to update pricing config:', error);
      throw error;
    }
  }
);

// ============================================================================
// AUDIT LOGS
// ============================================================================

/**
 * GET /api/admin/audit/logs
 * Get audit logs with filtering and pagination
 */
router.get(
  '/audit/logs',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('userId').optional().isUUID(),
    query('action').optional().isString().trim(),
    query('resource').optional().isString().trim(),
    query('startDate').optional().isISO8601().toDate(),
    query('endDate').optional().isISO8601().toDate(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw createError('Invalid request parameters', 400, 'VALIDATION_ERROR', errors.array());
      }

      const request: GetAuditLogsRequest = {
        filters: {
          userId: req.query.userId as string | undefined,
          action: req.query.action as string | undefined,
          resource: req.query.resource as string | undefined,
          dateRange: req.query.startDate && req.query.endDate
            ? {
                start: req.query.startDate as Date,
                end: req.query.endDate as Date
              }
            : undefined
        },
        pagination: {
          page: (req.query.page as number) || 1,
          limit: (req.query.limit as number) || 20
        }
      };

      const result = await adminService.getAuditLogs(request);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Failed to get audit logs:', error);
      throw error;
    }
  }
);

// ============================================================================
// SYSTEM ACTIONS
// ============================================================================

/**
 * POST /api/admin/system/maintenance
 * Trigger system maintenance tasks
 */
router.post('/system/maintenance', async (req: Request, res: Response) => {
  try {
    // This would trigger maintenance tasks like cleanup, optimization, etc.
    logger.info('System maintenance triggered by admin', { adminId: req.user?.userId });

    res.json({
      success: true,
      message: 'System maintenance tasks initiated'
    });
  } catch (error) {
    logger.error('Failed to trigger system maintenance:', error);
    throw error;
  }
});

/**
 * GET /api/admin/system/health
 * Get detailed system health status
 */
router.get('/system/health', async (req: Request, res: Response) => {
  try {
    // This would check various system components
    const health = {
      database: { status: 'healthy', responseTime: 50 },
      redis: { status: 'healthy', responseTime: 10 },
      aws: { status: 'healthy', responseTime: 200 },
      storage: { status: 'healthy', usage: 75 },
      queue: { status: 'healthy', pending: 5 }
    };

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    logger.error('Failed to get system health:', error);
    throw error;
  }
});

export default router;