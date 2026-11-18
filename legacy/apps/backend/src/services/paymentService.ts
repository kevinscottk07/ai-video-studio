import { logger } from '../utils/logger.js';
import { createError } from '../middleware/errorHandler.js';

/**
 * Payment Service for LemonSqueezy Integration
 * Handles payment processing, webhook validation, and checkout creation
 */
export class PaymentService {
  private readonly apiKey: string;
  private readonly storeId: string;
  private readonly webhookSecret: string;
  private readonly baseUrl = 'https://api.lemonsqueezy.com/v1';

  constructor() {
    this.apiKey = process.env.LEMONSQUEEZY_API_KEY || '';
    this.storeId = process.env.LEMONSQUEEZY_STORE_ID || '';
    this.webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || '';

    if (!this.apiKey || !this.storeId) {
      logger.warn('LemonSqueezy credentials not configured');
    }
  }

  // ============================================================================
  // CHECKOUT OPERATIONS
  // ============================================================================

  /**
   * Create a checkout session for credit purchase
   */
  async createCheckout(params: {
    purchaseId: string;
    amount: number; // in cents
    credits: number;
    successUrl: string;
    cancelUrl: string;
    customerEmail?: string;
  }): Promise<string> {
    try {
      if (!this.apiKey || !this.storeId) {
        // Return mock checkout URL for development
        const mockUrl = `https://checkout.lemonsqueezy.com/buy/mock?` +
          `purchase_id=${params.purchaseId}&` +
          `amount=${params.amount}&` +
          `credits=${params.credits}&` +
          `success_url=${encodeURIComponent(params.successUrl)}&` +
          `cancel_url=${encodeURIComponent(params.cancelUrl)}`;
        
        logger.info('Created mock LemonSqueezy checkout (development mode)', {
          purchaseId: params.purchaseId,
          amount: params.amount,
          credits: params.credits,
        });

        return mockUrl;
      }

      // Create checkout with LemonSqueezy API
      const checkoutData = {
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              custom: {
                purchase_id: params.purchaseId,
                credits: params.credits.toString(),
              },
            },
            checkout_options: {
              embed: false,
              media: false,
              logo: true,
            },
            product_options: {
              name: `${params.credits} AI Video Studio Credits`,
              description: `Purchase ${params.credits} credits for AI video generation`,
              media: [],
              redirect_url: params.successUrl,
              receipt_button_text: 'Go to Dashboard',
              receipt_link_url: params.successUrl,
            },
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
          },
          relationships: {
            store: {
              data: {
                type: 'stores',
                id: this.storeId,
              },
            },
            variant: {
              data: {
                type: 'variants',
                id: await this.getOrCreateCreditVariant(params.credits, params.amount),
              },
            },
          },
        },
      };

      const response = await this.makeApiRequest('POST', '/checkouts', checkoutData);

      if (!response.data?.attributes?.url) {
        throw createError('Failed to create checkout session', 500, 'CHECKOUT_CREATION_FAILED');
      }

      logger.info('LemonSqueezy checkout created', {
        purchaseId: params.purchaseId,
        checkoutId: response.data.id,
        url: response.data.attributes.url,
      });

      return response.data.attributes.url;
    } catch (error) {
      logger.error('Error creating LemonSqueezy checkout:', error);
      throw error;
    }
  }

  // ============================================================================
  // WEBHOOK OPERATIONS
  // ============================================================================

  /**
   * Validate webhook signature
   */
  validateWebhookSignature(payload: string, signature: string): boolean {
    try {
      if (!this.webhookSecret) {
        logger.warn('Webhook secret not configured, skipping validation');
        return true; // Allow in development
      }

      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      logger.error('Error validating webhook signature:', error);
      return false;
    }
  }

  /**
   * Process webhook event
   */
  async processWebhookEvent(event: any): Promise<{
    type: 'purchase_completed' | 'purchase_failed' | 'subscription_created' | 'subscription_updated' | 'subscription_cancelled' | 'subscription_payment_failed' | 'unknown';
    data: any;
  }> {
    try {
      const eventType = event.meta?.event_name;
      const eventData = event.data;

      logger.info('Processing LemonSqueezy webhook', {
        eventType,
        eventId: eventData?.id,
      });

      switch (eventType) {
        case 'order_created':
          return {
            type: 'purchase_completed',
            data: {
              purchaseId: eventData.attributes?.first_order_item?.product_name?.match(/purchase_id:(\w+)/)?.[1],
              paymentProcessorId: eventData.id,
              amount: eventData.attributes?.total,
              customerEmail: eventData.attributes?.user_email,
            },
          };

        case 'order_refunded':
          return {
            type: 'purchase_failed',
            data: {
              purchaseId: eventData.attributes?.first_order_item?.product_name?.match(/purchase_id:(\w+)/)?.[1],
              paymentProcessorId: eventData.id,
              reason: 'refunded',
            },
          };

        case 'subscription_created':
          return {
            type: 'subscription_created',
            data: {
              subscriptionId: eventData.id,
              customerId: eventData.attributes?.customer_id,
              planId: eventData.attributes?.product_id,
              status: eventData.attributes?.status,
            },
          };

        case 'subscription_updated':
          return {
            type: 'subscription_updated',
            data: {
              subscriptionId: eventData.id,
              status: eventData.attributes?.status,
              planId: eventData.attributes?.product_id,
            },
          };

        case 'subscription_cancelled':
          return {
            type: 'subscription_cancelled',
            data: {
              subscriptionId: eventData.id,
              cancelledAt: eventData.attributes?.cancelled_at,
            },
          };

        case 'subscription_payment_failed':
          return {
            type: 'subscription_payment_failed',
            data: {
              subscriptionId: eventData.attributes?.subscription_id,
              reason: eventData.attributes?.failure_reason || 'payment_failed',
              attemptCount: eventData.attributes?.attempt_count || 1,
            },
          };

        default:
          logger.info('Unknown webhook event type', { eventType });
          return {
            type: 'unknown',
            data: eventData,
          };
      }
    } catch (error) {
      logger.error('Error processing webhook event:', error);
      throw error;
    }
  }

  // ============================================================================
  // SUBSCRIPTION OPERATIONS
  // ============================================================================

  /**
   * Create subscription checkout
   */
  async createSubscriptionCheckout(params: {
    planId: string;
    customerId?: string;
    successUrl: string;
    cancelUrl: string;
    customerEmail?: string;
  }): Promise<string> {
    try {
      // This would create a subscription checkout
      // For now, return a mock URL
      const mockUrl = `https://checkout.lemonsqueezy.com/subscription/mock?` +
        `plan_id=${params.planId}&` +
        `success_url=${encodeURIComponent(params.successUrl)}&` +
        `cancel_url=${encodeURIComponent(params.cancelUrl)}`;

      logger.info('Created mock subscription checkout', {
        planId: params.planId,
        customerEmail: params.customerEmail,
      });

      return mockUrl;
    } catch (error) {
      logger.error('Error creating subscription checkout:', error);
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      if (!this.apiKey) {
        logger.info('Mock subscription cancellation', { subscriptionId });
        return;
      }

      await this.makeApiRequest('DELETE', `/subscriptions/${subscriptionId}`);

      logger.info('Subscription cancelled', { subscriptionId });
    } catch (error) {
      logger.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async makeApiRequest(method: string, endpoint: string, data?: any): Promise<any> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const headers = {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json',
      };

      const options: RequestInit = {
        method,
        headers,
      };

      if (data) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        const errorData = await response.text();
        throw createError(
          `LemonSqueezy API error: ${response.status}`,
          response.status,
          'LEMONSQUEEZY_API_ERROR',
          { errorData }
        );
      }

      return await response.json();
    } catch (error) {
      logger.error('LemonSqueezy API request failed:', error);
      throw error;
    }
  }

  private async getOrCreateCreditVariant(credits: number, amount: number): Promise<string> {
    // This would get or create a product variant for the specific credit amount
    // For now, return a mock variant ID
    return `variant_${credits}_credits`;
  }
}

// Export singleton instance
export const paymentService = new PaymentService();