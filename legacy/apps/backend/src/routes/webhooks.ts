import express from 'express';
import { paymentService } from '../services/paymentService.js';
import { creditService } from '../services/creditService.js';
import { subscriptionService } from '../services/subscriptionService.js';
import { logger } from '../utils/logger.js';
import { createError } from '../middleware/errorHandler.js';

const router = express.Router();

// Raw body parser for webhook signature validation
router.use(express.raw({ type: 'application/json' }));

// ============================================================================
// LEMONSQUEEZY WEBHOOK HANDLER
// ============================================================================

/**
 * POST /api/webhooks/lemonsqueezy
 * Handle LemonSqueezy webhook events
 */
router.post('/lemonsqueezy', async (req, res, next) => {
  try {
    const signature = req.headers['x-signature'] as string;
    const payload = req.body.toString();

    // Validate webhook signature
    if (!paymentService.validateWebhookSignature(payload, signature)) {
      throw createError('Invalid webhook signature', 401, 'INVALID_SIGNATURE');
    }

    // Parse webhook event
    const event = JSON.parse(payload);
    const processedEvent = await paymentService.processWebhookEvent(event);

    logger.info('Processing LemonSqueezy webhook', {
      type: processedEvent.type,
      eventId: event.data?.id,
    });

    // Handle different event types
    switch (processedEvent.type) {
      case 'purchase_completed':
        await handlePurchaseCompleted(processedEvent.data);
        break;

      case 'purchase_failed':
        await handlePurchaseFailed(processedEvent.data);
        break;

      case 'subscription_created':
        await handleSubscriptionCreated(processedEvent.data);
        break;

      case 'subscription_updated':
        await handleSubscriptionUpdated(processedEvent.data);
        break;

      case 'subscription_cancelled':
        await handleSubscriptionCancelled(processedEvent.data);
        break;

      case 'subscription_payment_failed':
        await handleSubscriptionPaymentFailed(processedEvent.data);
        break;

      default:
        logger.info('Unhandled webhook event type', { type: processedEvent.type });
    }

    res.json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    logger.error('Error processing LemonSqueezy webhook:', error);
    next(error);
  }
});

// ============================================================================
// WEBHOOK EVENT HANDLERS
// ============================================================================

async function handlePurchaseCompleted(data: {
  purchaseId: string;
  paymentProcessorId: string;
  amount: number;
  customerEmail: string;
}): Promise<void> {
  try {
    if (!data.purchaseId) {
      logger.warn('Purchase completed webhook missing purchase ID', data);
      return;
    }

    await creditService.completeCreditPurchase(
      data.purchaseId,
      data.paymentProcessorId
    );

    logger.info('Credit purchase completed via webhook', {
      purchaseId: data.purchaseId,
      paymentProcessorId: data.paymentProcessorId,
    });
  } catch (error) {
    logger.error('Error handling purchase completed webhook:', error);
    throw error;
  }
}

async function handlePurchaseFailed(data: {
  purchaseId: string;
  paymentProcessorId: string;
  reason: string;
}): Promise<void> {
  try {
    if (!data.purchaseId) {
      logger.warn('Purchase failed webhook missing purchase ID', data);
      return;
    }

    await creditService.failCreditPurchase(data.purchaseId, data.reason);

    logger.info('Credit purchase failed via webhook', {
      purchaseId: data.purchaseId,
      reason: data.reason,
    });
  } catch (error) {
    logger.error('Error handling purchase failed webhook:', error);
    throw error;
  }
}

async function handleSubscriptionCreated(data: {
  subscriptionId: string;
  customerId: string;
  planId: string;
  status: string;
}): Promise<void> {
  try {
    logger.info('Subscription created via webhook', data);
    
    // The subscription should already exist in our database from the checkout process
    // Here we would update it with the payment processor ID and confirm activation
    
    // TODO: Update subscription with payment processor details
    // TODO: Grant initial subscription credits if applicable
    
  } catch (error) {
    logger.error('Error handling subscription created webhook:', error);
    throw error;
  }
}

async function handleSubscriptionUpdated(data: {
  subscriptionId: string;
  status: string;
  planId?: string;
}): Promise<void> {
  try {
    logger.info('Subscription updated via webhook', data);
    
    // TODO: Update subscription status and plan if changed
    // TODO: Handle plan changes and credit adjustments
    
  } catch (error) {
    logger.error('Error handling subscription updated webhook:', error);
    throw error;
  }
}

async function handleSubscriptionCancelled(data: {
  subscriptionId: string;
  cancelledAt: string;
}): Promise<void> {
  try {
    logger.info('Subscription cancelled via webhook', data);
    
    // TODO: Update subscription status to cancelled
    // TODO: Handle end-of-period access
    
  } catch (error) {
    logger.error('Error handling subscription cancelled webhook:', error);
    throw error;
  }
}

async function handleSubscriptionPaymentFailed(data: {
  subscriptionId: string;
  reason: string;
  attemptCount: number;
}): Promise<void> {
  try {
    logger.info('Subscription payment failed via webhook', data);
    
    await subscriptionService.handlePaymentFailure(data.subscriptionId, data.reason);
    
  } catch (error) {
    logger.error('Error handling subscription payment failed webhook:', error);
    throw error;
  }
}

export default router;