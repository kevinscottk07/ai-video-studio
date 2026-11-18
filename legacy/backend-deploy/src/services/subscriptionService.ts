import { databaseService } from './databaseService.js';
import { paymentService } from './paymentService.js';
import { creditService } from './creditService.js';
import { logger } from '../utils/logger.js';
import { createError } from '../middleware/errorHandler.js';
import type {
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
  User,
  CreditTransaction
} from '../types/index.js';

/**
 * Subscription Management Service
 * Handles subscription creation, management, renewals, and billing
 */
export class SubscriptionService {

  // ============================================================================
  // SUBSCRIPTION PLAN OPERATIONS
  // ============================================================================

  /**
   * Get all available subscription plans
   */
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    try {
      return await databaseService.getSubscriptionPlans();
    } catch (error) {
      logger.error('Error getting subscription plans:', error);
      throw error;
    }
  }

  /**
   * Get subscription plan by ID
   */
  async getSubscriptionPlan(planId: string): Promise<SubscriptionPlan | null> {
    try {
      return await databaseService.getSubscriptionPlanById(planId);
    } catch (error) {
      logger.error('Error getting subscription plan:', error);
      throw error;
    }
  }

  // ============================================================================
  // SUBSCRIPTION MANAGEMENT OPERATIONS
  // ============================================================================

  /**
   * Get user's current subscription
   */
  async getUserSubscription(userId: string): Promise<Subscription | null> {
    try {
      return await databaseService.getUserActiveSubscription(userId);
    } catch (error) {
      logger.error('Error getting user subscription:', error);
      throw error;
    }
  }

  /**
   * Create new subscription
   */
  async createSubscription(
    userId: string,
    planId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<{ checkoutUrl: string; subscriptionId: string }> {
    try {
      // Validate user exists
      const user = await databaseService.getUserById(userId);
      if (!user) {
        throw createError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Validate plan exists
      const plan = await this.getSubscriptionPlan(planId);
      if (!plan) {
        throw createError('Subscription plan not found', 404, 'PLAN_NOT_FOUND');
      }

      // Check if user already has an active subscription
      const existingSubscription = await this.getUserSubscription(userId);
      if (existingSubscription && existingSubscription.status === 'active') {
        throw createError('User already has an active subscription', 400, 'SUBSCRIPTION_EXISTS');
      }

      // Calculate subscription period
      const currentPeriodStart = new Date();
      const currentPeriodEnd = new Date();
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1); // Monthly billing

      // Create pending subscription record
      const subscription = await databaseService.createSubscription({
        userId,
        planId,
        status: 'active', // Will be updated after payment confirmation
        currentPeriodStart,
        currentPeriodEnd,
        creditsIncluded: plan.creditsIncluded,
        creditsUsedThisPeriod: 0,
      });

      // Create LemonSqueezy subscription checkout
      const checkoutUrl = await paymentService.createSubscriptionCheckout({
        planId,
        customerId: userId,
        successUrl,
        cancelUrl,
        customerEmail: user.email,
      });

      logger.info('Subscription created', {
        userId,
        subscriptionId: subscription.id,
        planId,
      });

      return {
        checkoutUrl,
        subscriptionId: subscription.id,
      };
    } catch (error) {
      logger.error('Error creating subscription:', error);
      throw error;
    }
  }

  /**
   * Update subscription plan (upgrade/downgrade)
   */
  async updateSubscription(
    subscriptionId: string,
    newPlanId: string
  ): Promise<Subscription> {
    try {
      const subscription = await databaseService.getSubscriptionById(subscriptionId);
      if (!subscription) {
        throw createError('Subscription not found', 404, 'SUBSCRIPTION_NOT_FOUND');
      }

      const newPlan = await this.getSubscriptionPlan(newPlanId);
      if (!newPlan) {
        throw createError('Subscription plan not found', 404, 'PLAN_NOT_FOUND');
      }

      const oldPlan = await this.getSubscriptionPlan(subscription.planId);
      if (!oldPlan) {
        throw createError('Current plan not found', 404, 'CURRENT_PLAN_NOT_FOUND');
      }

      // Calculate proration
      const prorationData = this.calculateProration(subscription, oldPlan, newPlan);

      // Update subscription
      const updatedSubscription = await databaseService.updateSubscription(subscriptionId, {
        planId: newPlanId,
        creditsIncluded: newPlan.creditsIncluded,
      });

      // Handle credit adjustments
      if (prorationData.creditAdjustment !== 0) {
        await this.handleCreditAdjustment(
          subscription.userId,
          prorationData.creditAdjustment,
          `Plan change from ${oldPlan.name} to ${newPlan.name}`,
          subscriptionId
        );
      }

      logger.info('Subscription updated', {
        subscriptionId,
        oldPlanId: subscription.planId,
        newPlanId,
        creditAdjustment: prorationData.creditAdjustment,
      });

      return updatedSubscription;
    } catch (error) {
      logger.error('Error updating subscription:', error);
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean = true
  ): Promise<Subscription> {
    try {
      const subscription = await databaseService.getSubscriptionById(subscriptionId);
      if (!subscription) {
        throw createError('Subscription not found', 404, 'SUBSCRIPTION_NOT_FOUND');
      }

      // Cancel with payment processor if immediate cancellation
      if (!cancelAtPeriodEnd && subscription.paymentProcessorId) {
        await paymentService.cancelSubscription(subscription.paymentProcessorId);
      }

      // Update subscription status
      const updatedSubscription = await databaseService.updateSubscription(subscriptionId, {
        cancelAtPeriodEnd,
        status: cancelAtPeriodEnd ? 'active' : 'canceled',
      });

      logger.info('Subscription cancelled', {
        subscriptionId,
        cancelAtPeriodEnd,
        userId: subscription.userId,
      });

      return updatedSubscription;
    } catch (error) {
      logger.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  /**
   * Reactivate cancelled subscription
   */
  async reactivateSubscription(subscriptionId: string): Promise<Subscription> {
    try {
      const subscription = await databaseService.getSubscriptionById(subscriptionId);
      if (!subscription) {
        throw createError('Subscription not found', 404, 'SUBSCRIPTION_NOT_FOUND');
      }

      if (subscription.status !== 'canceled' && !subscription.cancelAtPeriodEnd) {
        throw createError('Subscription is not cancelled', 400, 'SUBSCRIPTION_NOT_CANCELLED');
      }

      // Reactivate subscription
      const updatedSubscription = await databaseService.updateSubscription(subscriptionId, {
        cancelAtPeriodEnd: false,
        status: 'active',
      });

      logger.info('Subscription reactivated', {
        subscriptionId,
        userId: subscription.userId,
      });

      return updatedSubscription;
    } catch (error) {
      logger.error('Error reactivating subscription:', error);
      throw error;
    }
  }

  // ============================================================================
  // SUBSCRIPTION RENEWAL AND BILLING
  // ============================================================================

  /**
   * Process subscription renewal
   */
  async processSubscriptionRenewal(subscriptionId: string): Promise<void> {
    try {
      const subscription = await databaseService.getSubscriptionById(subscriptionId);
      if (!subscription) {
        throw createError('Subscription not found', 404, 'SUBSCRIPTION_NOT_FOUND');
      }

      const plan = await this.getSubscriptionPlan(subscription.planId);
      if (!plan) {
        throw createError('Subscription plan not found', 404, 'PLAN_NOT_FOUND');
      }

      // Calculate new billing period
      const newPeriodStart = subscription.currentPeriodEnd;
      const newPeriodEnd = new Date(newPeriodStart);
      newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

      // Update subscription for new period
      await databaseService.updateSubscription(subscriptionId, {
        currentPeriodStart: newPeriodStart,
        currentPeriodEnd: newPeriodEnd,
        creditsUsedThisPeriod: 0, // Reset usage counter
        status: 'active',
      });

      // Grant monthly credits
      if (plan.creditsIncluded > 0) {
        await this.grantSubscriptionCredits(
          subscription.userId,
          plan.creditsIncluded,
          subscriptionId
        );
      }

      logger.info('Subscription renewed', {
        subscriptionId,
        userId: subscription.userId,
        planId: subscription.planId,
        creditsGranted: plan.creditsIncluded,
      });
    } catch (error) {
      logger.error('Error processing subscription renewal:', error);
      throw error;
    }
  }

  /**
   * Handle subscription payment failure
   */
  async handlePaymentFailure(subscriptionId: string, reason: string): Promise<void> {
    try {
      const subscription = await databaseService.getSubscriptionById(subscriptionId);
      if (!subscription) {
        throw createError('Subscription not found', 404, 'SUBSCRIPTION_NOT_FOUND');
      }

      // Update subscription status
      await databaseService.updateSubscription(subscriptionId, {
        status: 'past_due',
      });

      // TODO: Send notification to user about payment failure
      // TODO: Implement retry logic for failed payments

      logger.warn('Subscription payment failed', {
        subscriptionId,
        userId: subscription.userId,
        reason,
      });
    } catch (error) {
      logger.error('Error handling payment failure:', error);
      throw error;
    }
  }

  // ============================================================================
  // CREDIT MANAGEMENT FOR SUBSCRIPTIONS
  // ============================================================================

  /**
   * Grant subscription credits to user
   */
  private async grantSubscriptionCredits(
    userId: string,
    amount: number,
    subscriptionId: string
  ): Promise<CreditTransaction> {
    try {
      // Create credit transaction
      const transaction = await databaseService.createCreditTransaction({
        userId,
        type: 'subscription_grant',
        amount,
        description: `Monthly subscription credits - ${amount} credits`,
        metadata: {
          subscriptionId,
          grantType: 'monthly_renewal',
        },
      });

      // Update user's credit balance
      const user = await databaseService.getUserById(userId);
      if (user) {
        await databaseService.updateUser(userId, {
          creditBalance: user.creditBalance + amount,
          totalCreditsEver: user.totalCreditsEver + amount,
        });
      }

      logger.info('Subscription credits granted', {
        userId,
        amount,
        subscriptionId,
        transactionId: transaction.id,
      });

      return transaction;
    } catch (error) {
      logger.error('Error granting subscription credits:', error);
      throw error;
    }
  }

  /**
   * Handle credit adjustments for plan changes
   */
  private async handleCreditAdjustment(
    userId: string,
    adjustment: number,
    description: string,
    subscriptionId: string
  ): Promise<void> {
    try {
      if (adjustment === 0) return;

      const transactionType = adjustment > 0 ? 'subscription_grant' : 'deduction';
      
      // Create credit transaction
      await databaseService.createCreditTransaction({
        userId,
        type: transactionType,
        amount: adjustment,
        description,
        metadata: {
          subscriptionId,
          adjustmentType: 'plan_change',
        },
      });

      // Update user's credit balance
      const user = await databaseService.getUserById(userId);
      if (user) {
        const newBalance = user.creditBalance + adjustment;
        const newLifetimeTotal = adjustment > 0 ? user.totalCreditsEver + adjustment : user.totalCreditsEver;
        
        await databaseService.updateUser(userId, {
          creditBalance: newBalance,
          totalCreditsEver: newLifetimeTotal,
        });
      }

      logger.info('Credit adjustment processed', {
        userId,
        adjustment,
        subscriptionId,
      });
    } catch (error) {
      logger.error('Error handling credit adjustment:', error);
      throw error;
    }
  }

  // ============================================================================
  // BILLING AND ANALYTICS
  // ============================================================================

  /**
   * Get subscription billing history
   */
  async getSubscriptionBillingHistory(
    subscriptionId: string
  ): Promise<any[]> {
    try {
      // This would integrate with LemonSqueezy to get billing history
      // For now, return mock data
      return [];
    } catch (error) {
      logger.error('Error getting billing history:', error);
      throw error;
    }
  }

  /**
   * Get subscription usage analytics
   */
  async getSubscriptionUsage(subscriptionId: string): Promise<{
    creditsIncluded: number;
    creditsUsed: number;
    creditsRemaining: number;
    usagePercentage: number;
    daysRemaining: number;
  }> {
    try {
      const subscription = await databaseService.getSubscriptionById(subscriptionId);
      if (!subscription) {
        throw createError('Subscription not found', 404, 'SUBSCRIPTION_NOT_FOUND');
      }

      const creditsUsed = subscription.creditsUsedThisPeriod;
      const creditsIncluded = subscription.creditsIncluded;
      const creditsRemaining = Math.max(0, creditsIncluded - creditsUsed);
      const usagePercentage = creditsIncluded > 0 ? (creditsUsed / creditsIncluded) * 100 : 0;

      // Calculate days remaining in current period
      const now = new Date();
      const periodEnd = new Date(subscription.currentPeriodEnd);
      const daysRemaining = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

      return {
        creditsIncluded,
        creditsUsed,
        creditsRemaining,
        usagePercentage,
        daysRemaining,
      };
    } catch (error) {
      logger.error('Error getting subscription usage:', error);
      throw error;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Calculate proration for plan changes
   */
  private calculateProration(
    subscription: Subscription,
    oldPlan: SubscriptionPlan,
    newPlan: SubscriptionPlan
  ): {
    creditAdjustment: number;
    proratedAmount: number;
  } {
    try {
      const now = new Date();
      const periodStart = new Date(subscription.currentPeriodStart);
      const periodEnd = new Date(subscription.currentPeriodEnd);
      
      // Calculate remaining days in current period
      const totalDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
      const remainingDays = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      const remainingRatio = remainingDays / totalDays;

      // Calculate credit adjustment
      const oldCreditsRemaining = Math.floor(oldPlan.creditsIncluded * remainingRatio);
      const newCreditsForPeriod = Math.floor(newPlan.creditsIncluded * remainingRatio);
      const creditAdjustment = newCreditsForPeriod - oldCreditsRemaining;

      // Calculate prorated amount (for billing)
      const oldProratedAmount = oldPlan.price * remainingRatio;
      const newProratedAmount = newPlan.price * remainingRatio;
      const proratedAmount = newProratedAmount - oldProratedAmount;

      return {
        creditAdjustment,
        proratedAmount,
      };
    } catch (error) {
      logger.error('Error calculating proration:', error);
      return {
        creditAdjustment: 0,
        proratedAmount: 0,
      };
    }
  }
}

// Export singleton instance
export const subscriptionService = new SubscriptionService();