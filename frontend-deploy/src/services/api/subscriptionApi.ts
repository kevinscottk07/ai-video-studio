import { apiClient } from './client';
import type {
  Subscription,
  SubscriptionPlan,
  SubscriptionUsage,
  BillingHistory,
  ApiResponse
} from '../types';

/**
 * Subscription API Service
 * Handles all subscription-related API calls
 */
export class SubscriptionApi {
  
  // ============================================================================
  // SUBSCRIPTION PLAN OPERATIONS
  // ============================================================================

  /**
   * Get all available subscription plans
   */
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    const response = await apiClient.get<ApiResponse<SubscriptionPlan[]>>('/subscriptions/plans');
    return response.data.data;
  }

  /**
   * Get specific subscription plan
   */
  async getSubscriptionPlan(planId: string): Promise<SubscriptionPlan> {
    const response = await apiClient.get<ApiResponse<SubscriptionPlan>>(`/subscriptions/plans/${planId}`);
    return response.data.data;
  }

  // ============================================================================
  // USER SUBSCRIPTION OPERATIONS
  // ============================================================================

  /**
   * Get user's current subscription
   */
  async getCurrentSubscription(): Promise<Subscription | null> {
    const response = await apiClient.get<ApiResponse<Subscription | null>>('/subscriptions/current');
    return response.data.data;
  }

  /**
   * Create new subscription
   */
  async createSubscription(params: {
    planId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ checkoutUrl: string; subscriptionId: string }> {
    const response = await apiClient.post<ApiResponse<{ checkoutUrl: string; subscriptionId: string }>>(
      '/subscriptions/create',
      params
    );
    return response.data.data;
  }

  /**
   * Update subscription plan (upgrade/downgrade)
   */
  async updateSubscriptionPlan(subscriptionId: string, newPlanId: string): Promise<Subscription> {
    const response = await apiClient.put<ApiResponse<Subscription>>(
      `/subscriptions/${subscriptionId}/plan`,
      { newPlanId }
    );
    return response.data.data;
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd: boolean = true): Promise<Subscription> {
    const response = await apiClient.post<ApiResponse<Subscription>>(
      `/subscriptions/${subscriptionId}/cancel`,
      { cancelAtPeriodEnd }
    );
    return response.data.data;
  }

  /**
   * Reactivate cancelled subscription
   */
  async reactivateSubscription(subscriptionId: string): Promise<Subscription> {
    const response = await apiClient.post<ApiResponse<Subscription>>(
      `/subscriptions/${subscriptionId}/reactivate`
    );
    return response.data.data;
  }

  // ============================================================================
  // SUBSCRIPTION ANALYTICS AND BILLING
  // ============================================================================

  /**
   * Get subscription usage analytics
   */
  async getSubscriptionUsage(subscriptionId: string): Promise<SubscriptionUsage> {
    const response = await apiClient.get<ApiResponse<SubscriptionUsage>>(
      `/subscriptions/${subscriptionId}/usage`
    );
    return response.data.data;
  }

  /**
   * Get subscription billing history
   */
  async getBillingHistory(subscriptionId: string): Promise<BillingHistory[]> {
    const response = await apiClient.get<ApiResponse<BillingHistory[]>>(
      `/subscriptions/${subscriptionId}/billing-history`
    );
    return response.data.data;
  }
}

// Export singleton instance
export const subscriptionApi = new SubscriptionApi();