import express from 'express';
import { creditService } from '../services/creditService.js';
import { authenticateToken } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import type {
  PurchaseCreditsRequest,
  PurchaseCreditsResponse,
  GetCreditHistoryRequest,
  GetCreditHistoryResponse,
  EstimateCreditsRequest,
  EstimateCreditsResponse,
} from '@ai-video-studio/types';

const router = express.Router();

// All credit routes require authentication
router.use(authenticateToken);

// ============================================================================
// CREDIT BALANCE ROUTES
// ============================================================================

/**
 * GET /api/credits/balance
 * Get user's current credit balance
 */
router.get('/balance', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw createError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const balance = await creditService.getCreditBalance(userId);

    res.json({
      success: true,
      data: balance,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// CREDIT PURCHASE ROUTES
// ============================================================================

/**
 * POST /api/credits/purchase
 * Initiate credit purchase
 */
router.post('/purchase', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw createError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const { amount, successUrl, cancelUrl }: PurchaseCreditsRequest = req.body;

    // Validate request
    if (!amount || amount <= 0) {
      throw createError('Invalid credit amount', 400, 'INVALID_AMOUNT');
    }

    if (!successUrl || !cancelUrl) {
      throw createError('Success and cancel URLs are required', 400, 'MISSING_URLS');
    }

    // Initiate purchase
    const result = await creditService.initiateCreditPurchase(
      userId,
      amount,
      successUrl,
      cancelUrl
    );

    const response: PurchaseCreditsResponse = {
      checkoutUrl: result.checkoutUrl,
    };

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/credits/purchase/complete
 * Complete credit purchase (webhook handler)
 */
router.post('/purchase/complete', async (req, res, next) => {
  try {
    const { purchaseId, paymentProcessorId } = req.body;

    if (!purchaseId || !paymentProcessorId) {
      throw createError('Purchase ID and payment processor ID are required', 400, 'MISSING_PARAMETERS');
    }

    const purchase = await creditService.completeCreditPurchase(purchaseId, paymentProcessorId);

    res.json({
      success: true,
      data: { purchase },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/credits/purchase/failed
 * Handle failed credit purchase (webhook handler)
 */
router.post('/purchase/failed', async (req, res, next) => {
  try {
    const { purchaseId, reason } = req.body;

    if (!purchaseId) {
      throw createError('Purchase ID is required', 400, 'MISSING_PURCHASE_ID');
    }

    await creditService.failCreditPurchase(purchaseId, reason);

    res.json({
      success: true,
      message: 'Purchase failure handled',
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// COST ESTIMATION ROUTES
// ============================================================================

/**
 * POST /api/credits/estimate
 * Estimate credit cost for an operation
 */
router.post('/estimate', async (req, res, next) => {
  try {
    const { operationType, parameters }: EstimateCreditsRequest = req.body;

    if (!operationType) {
      throw createError('Operation type is required', 400, 'MISSING_OPERATION_TYPE');
    }

    const estimate = await creditService.estimateOperationCost(operationType, parameters || {});

    const response: EstimateCreditsResponse = {
      estimate,
    };

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// CREDIT HISTORY ROUTES
// ============================================================================

/**
 * GET /api/credits/history
 * Get user's credit transaction history
 */
router.get('/history', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw createError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const {
      type,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
    } = req.query;

    // Parse filters
    const filters: any = {};
    if (type) filters.type = type;
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);

    const pagination = {
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
    };

    const transactions = await creditService.getCreditHistory(userId, filters, pagination);

    const response: GetCreditHistoryResponse = {
      data: transactions,
      pagination: {
        limit: pagination.limit,
        offset: pagination.offset,
        total: transactions.length, // This should be the total count from database
        hasMore: transactions.length === pagination.limit,
      },
    };

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// CREDIT OPERATIONS ROUTES (Internal use)
// ============================================================================

/**
 * POST /api/credits/deduct
 * Deduct credits for an operation (internal use)
 */
router.post('/deduct', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw createError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const { amount, operationId, description, awsCostCovered } = req.body;

    if (!amount || amount <= 0) {
      throw createError('Invalid credit amount', 400, 'INVALID_AMOUNT');
    }

    if (!operationId || !description) {
      throw createError('Operation ID and description are required', 400, 'MISSING_PARAMETERS');
    }

    const transaction = await creditService.deductCredits(
      userId,
      amount,
      operationId,
      description,
      awsCostCovered
    );

    res.json({
      success: true,
      data: { transaction },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/credits/refund
 * Refund credits for a failed operation (internal use)
 */
router.post('/refund', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw createError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const { originalAmount, operationId, reason, progressPercentage = 0 } = req.body;

    if (!originalAmount || originalAmount <= 0) {
      throw createError('Invalid original amount', 400, 'INVALID_AMOUNT');
    }

    if (!operationId || !reason) {
      throw createError('Operation ID and reason are required', 400, 'MISSING_PARAMETERS');
    }

    const transaction = await creditService.refundCredits(
      userId,
      originalAmount,
      operationId,
      reason,
      progressPercentage
    );

    res.json({
      success: true,
      data: { transaction },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// ADMIN ROUTES
// ============================================================================

/**
 * GET /api/credits/admin/stats
 * Get credit system statistics (admin only)
 */
router.get('/admin/stats', async (req, res, next) => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'admin') {
      throw createError('Admin access required', 403, 'FORBIDDEN');
    }

    // This would implement admin statistics
    const stats = {
      totalCreditsIssued: 0,
      totalCreditsSpent: 0,
      totalRevenue: 0,
      activeUsers: 0,
      // Add more statistics as needed
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

export default router;