import express from 'express';
import { subscriptionService } from '../services/subscriptionService.js';
import { requireAuth } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { logger } from '../utils/logger.js';
import { createError } from '../middleware/errorHandler.js';
import { z } from 'zod';

const router = express.Router();

// Apply authentication to all routes
router.use(requireAuth);

// ============================================================================
// SUBSCRIPTION PLAN ROUTES
// ============================================================================

/**
 * GET /api/subscriptions/plans
 * Get all available subscription plans
 */
router.get('/plans', async (req, res, next) => {
  try {
    const plans = await subscriptionService.getSubscriptionPlans();
    res.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    logger.error('Error getting subscription plans:', error);
    next(error);
  }
});

/**
 * GET /api/subscriptions/plans/:planId
 * Get specific subscription plan
 */
router.get('/plans/:planId', async (req, res, next) => {
  try {
    const { planId } = req.params;
    const plan = await subscriptionService.getSubscriptionPlan(planId);
    
    if (!plan) {
      throw createError('Subscription plan not found', 404, 'PLAN_NOT_FOUND');
    }

    res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    logger.error('Error getting subscription plan:', error);
    next(error);
  }
});

// ============================================================================
// USER SUBSCRIPTION ROUTES
// ============================================================================

/**
 * GET /api/subscriptions/current
 * Get user's current subscription
 */
router.get('/current', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const subscription = await subscriptionService.getUserSubscription(userId);
    
    res.json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    logger.error('Error getting user subscription:', error);
    next(error);
  }
});

/**
 * POST /api/subscriptions/create
 * Create new subscription
 */
const createSubscriptionSchema = z.object({
  planId: z.string().min(1, 'Plan ID is required'),
  successUrl: z.string().url('Valid success URL is required'),
  cancelUrl: z.string().url('Valid cancel URL is required'),
});

router.post('/create', validateRequest(createSubscriptionSchema), async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { planId, successUrl, cancelUrl } = req.body;

    const result = await subscriptionService.createSubscription(
      userId,
      planId,
      successUrl,
      cancelUrl
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error creating subscription:', error);
    next(error);
  }
});

/**
 * PUT /api/subscriptions/:subscriptionId/plan
 * Update subscription plan (upgrade/downgrade)
 */
const updatePlanSchema = z.object({
  newPlanId: z.string().min(1, 'New plan ID is required'),
});

router.put('/:subscriptionId/plan', validateRequest(updatePlanSchema), async (req, res, next) => {
  try {
    const { subscriptionId } = req.params;
    const { newPlanId } = req.body;
    const userId = req.user!.id;

    // Verify subscription belongs to user
    const subscription = await subscriptionService.getUserSubscription(userId);
    if (!subscription || subscription.id !== subscriptionId) {
      throw createError('Subscription not found', 404, 'SUBSCRIPTION_NOT_FOUND');
    }

    const updatedSubscription = await subscriptionService.updateSubscription(
      subscriptionId,
      newPlanId
    );

    res.json({
      success: true,
      data: updatedSubscription,
    });
  } catch (error) {
    logger.error('Error updating subscription plan:', error);
    next(error);
  }
});

/**
 * POST /api/subscriptions/:subscriptionId/cancel
 * Cancel subscription
 */
const cancelSubscriptionSchema = z.object({
  cancelAtPeriodEnd: z.boolean().optional().default(true),
});

router.post('/:subscriptionId/cancel', validateRequest(cancelSubscriptionSchema), async (req, res, next) => {
  try {
    const { subscriptionId } = req.params;
    const { cancelAtPeriodEnd } = req.body;
    const userId = req.user!.id;

    // Verify subscription belongs to user
    const subscription = await subscriptionService.getUserSubscription(userId);
    if (!subscription || subscription.id !== subscriptionId) {
      throw createError('Subscription not found', 404, 'SUBSCRIPTION_NOT_FOUND');
    }

    const cancelledSubscription = await subscriptionService.cancelSubscription(
      subscriptionId,
      cancelAtPeriodEnd
    );

    res.json({
      success: true,
      data: cancelledSubscription,
    });
  } catch (error) {
    logger.error('Error cancelling subscription:', error);
    next(error);
  }
});

/**
 * POST /api/subscriptions/:subscriptionId/reactivate
 * Reactivate cancelled subscription
 */
router.post('/:subscriptionId/reactivate', async (req, res, next) => {
  try {
    const { subscriptionId } = req.params;
    const userId = req.user!.id;

    // Verify subscription belongs to user
    const subscription = await subscriptionService.getUserSubscription(userId);
    if (!subscription || subscription.id !== subscriptionId) {
      throw createError('Subscription not found', 404, 'SUBSCRIPTION_NOT_FOUND');
    }

    const reactivatedSubscription = await subscriptionService.reactivateSubscription(subscriptionId);

    res.json({
      success: true,
      data: reactivatedSubscription,
    });
  } catch (error) {
    logger.error('Error reactivating subscription:', error);
    next(error);
  }
});

// ============================================================================
// SUBSCRIPTION ANALYTICS AND BILLING
// ============================================================================

/**
 * GET /api/subscriptions/:subscriptionId/usage
 * Get subscription usage analytics
 */
router.get('/:subscriptionId/usage', async (req, res, next) => {
  try {
    const { subscriptionId } = req.params;
    const userId = req.user!.id;

    // Verify subscription belongs to user
    const subscription = await subscriptionService.getUserSubscription(userId);
    if (!subscription || subscription.id !== subscriptionId) {
      throw createError('Subscription not found', 404, 'SUBSCRIPTION_NOT_FOUND');
    }

    const usage = await subscriptionService.getSubscriptionUsage(subscriptionId);

    res.json({
      success: true,
      data: usage,
    });
  } catch (error) {
    logger.error('Error getting subscription usage:', error);
    next(error);
  }
});

/**
 * GET /api/subscriptions/:subscriptionId/billing-history
 * Get subscription billing history
 */
router.get('/:subscriptionId/billing-history', async (req, res, next) => {
  try {
    const { subscriptionId } = req.params;
    const userId = req.user!.id;

    // Verify subscription belongs to user
    const subscription = await subscriptionService.getUserSubscription(userId);
    if (!subscription || subscription.id !== subscriptionId) {
      throw createError('Subscription not found', 404, 'SUBSCRIPTION_NOT_FOUND');
    }

    const billingHistory = await subscriptionService.getSubscriptionBillingHistory(subscriptionId);

    res.json({
      success: true,
      data: billingHistory,
    });
  } catch (error) {
    logger.error('Error getting billing history:', error);
    next(error);
  }
});

export default router;