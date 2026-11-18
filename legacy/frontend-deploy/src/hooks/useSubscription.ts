import { useState, useEffect, useCallback } from 'react';
import { subscriptionApi } from '../services/api/subscriptionApi';
import { useToast } from '../providers/ToastProvider';
import { useAuth } from './useAuth';
import type {
  Subscription,
  SubscriptionPlan,
  SubscriptionUsage,
  BillingHistory
} from '../types';

interface UseSubscriptionReturn {
  // Current subscription state
  subscription: Subscription | null;
  subscriptionPlans: SubscriptionPlan[];
  usage: SubscriptionUsage | null;
  billingHistory: BillingHistory[];
  
  // Loading states
  isLoading: boolean;
  isCreatingSubscription: boolean;
  isUpdatingSubscription: boolean;
  isCancellingSubscription: boolean;
  
  // Actions
  createSubscription: (planId: string) => Promise<void>;
  updateSubscriptionPlan: (newPlanId: string) => Promise<void>;
  cancelSubscription: (cancelAtPeriodEnd?: boolean) => Promise<void>;
  reactivateSubscription: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  refreshUsage: () => Promise<void>;
  refreshBillingHistory: () => Promise<void>;
  
  // Computed properties
  isSubscribed: boolean;
  canUpgrade: boolean;
  canDowngrade: boolean;
  daysUntilRenewal: number;
  usagePercentage: number;
}

export const useSubscription = (): UseSubscriptionReturn => {
  const { user } = useAuth();
  const { success, error: errorToast } = useToast();
  
  // State
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [usage, setUsage] = useState<SubscriptionUsage | null>(null);
  const [billingHistory, setBillingHistory] = useState<BillingHistory[]>([]);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingSubscription, setIsCreatingSubscription] = useState(false);
  const [isUpdatingSubscription, setIsUpdatingSubscription] = useState(false);
  const [isCancellingSubscription, setIsCancellingSubscription] = useState(false);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchSubscriptionPlans = useCallback(async () => {
    try {
      const plans = await subscriptionApi.getSubscriptionPlans();
      setSubscriptionPlans(plans);
    } catch (error) {
      console.error('Error fetching subscription plans:', error);
      errorToast('Failed to load subscription plans');
    }
  }, [errorToast]);

  const fetchCurrentSubscription = useCallback(async () => {
    if (!user) return;
    
    try {
      const currentSubscription = await subscriptionApi.getCurrentSubscription();
      setSubscription(currentSubscription);
    } catch (error) {
      console.error('Error fetching current subscription:', error);
      // Don't show error toast for this as user might not have a subscription
    }
  }, [user]);

  const fetchUsage = useCallback(async () => {
    if (!subscription) return;
    
    try {
      const subscriptionUsage = await subscriptionApi.getSubscriptionUsage(subscription.id);
      setUsage(subscriptionUsage);
    } catch (error) {
      console.error('Error fetching subscription usage:', error);
      errorToast('Failed to load usage data');
    }
  }, [subscription, errorToast]);

  const fetchBillingHistory = useCallback(async () => {
    if (!subscription) return;
    
    try {
      const history = await subscriptionApi.getBillingHistory(subscription.id);
      setBillingHistory(history);
    } catch (error) {
      console.error('Error fetching billing history:', error);
      errorToast('Failed to load billing history');
    }
  }, [subscription, errorToast]);

  // ============================================================================
  // SUBSCRIPTION ACTIONS
  // ============================================================================

  const createSubscription = useCallback(async (planId: string) => {
    if (!user) {
      errorToast('Please log in to subscribe');
      return;
    }

    setIsCreatingSubscription(true);
    try {
      const successUrl = `${window.location.origin}/dashboard?subscription=success`;
      const cancelUrl = `${window.location.origin}/pricing?subscription=cancelled`;
      
      const { checkoutUrl } = await subscriptionApi.createSubscription({
        planId,
        successUrl,
        cancelUrl,
      });

      // Redirect to checkout
      window.location.href = checkoutUrl;
    } catch (error: any) {
      console.error('Error creating subscription:', error);
      errorToast(error.message || 'Failed to create subscription');
    } finally {
      setIsCreatingSubscription(false);
    }
  }, [user, errorToast]);

  const updateSubscriptionPlan = useCallback(async (newPlanId: string) => {
    if (!subscription) {
      errorToast('No active subscription found');
      return;
    }

    setIsUpdatingSubscription(true);
    try {
      const updatedSubscription = await subscriptionApi.updateSubscriptionPlan(
        subscription.id,
        newPlanId
      );
      setSubscription(updatedSubscription);
      success('Subscription plan updated successfully');
      
      // Refresh usage data
      await fetchUsage();
    } catch (error: any) {
      console.error('Error updating subscription plan:', error);
      errorToast(error.message || 'Failed to update subscription plan');
    } finally {
      setIsUpdatingSubscription(false);
    }
  }, [subscription, success, errorToast, fetchUsage]);

  const cancelSubscription = useCallback(async (cancelAtPeriodEnd: boolean = true) => {
    if (!subscription) {
      errorToast('No active subscription found');
      return;
    }

    setIsCancellingSubscription(true);
    try {
      const cancelledSubscription = await subscriptionApi.cancelSubscription(
        subscription.id,
        cancelAtPeriodEnd
      );
      setSubscription(cancelledSubscription);
      
      const message = cancelAtPeriodEnd
        ? 'Subscription will be cancelled at the end of your billing period'
        : 'Subscription cancelled immediately';
      success(message);
    } catch (error: any) {
      console.error('Error cancelling subscription:', error);
      errorToast(error.message || 'Failed to cancel subscription');
    } finally {
      setIsCancellingSubscription(false);
    }
  }, [subscription, success, errorToast]);

  const reactivateSubscription = useCallback(async () => {
    if (!subscription) {
      errorToast('No subscription found');
      return;
    }

    try {
      const reactivatedSubscription = await subscriptionApi.reactivateSubscription(subscription.id);
      setSubscription(reactivatedSubscription);
      success('Subscription reactivated successfully');
    } catch (error: any) {
      console.error('Error reactivating subscription:', error);
      errorToast(error.message || 'Failed to reactivate subscription');
    }
  }, [subscription, success, errorToast]);

  // ============================================================================
  // REFRESH FUNCTIONS
  // ============================================================================

  const refreshSubscription = useCallback(async () => {
    await fetchCurrentSubscription();
  }, [fetchCurrentSubscription]);

  const refreshUsage = useCallback(async () => {
    await fetchUsage();
  }, [fetchUsage]);

  const refreshBillingHistory = useCallback(async () => {
    await fetchBillingHistory();
  }, [fetchBillingHistory]);

  // ============================================================================
  // COMPUTED PROPERTIES
  // ============================================================================

  const isSubscribed = Boolean(subscription && subscription.status === 'active');

  const canUpgrade = Boolean(
    subscription && 
    subscriptionPlans.some(plan => 
      plan.price > subscriptionPlans.find(p => p.id === subscription.planId)?.price
    )
  );

  const canDowngrade = Boolean(
    subscription && 
    subscriptionPlans.some(plan => 
      plan.price < subscriptionPlans.find(p => p.id === subscription.planId)?.price
    )
  );

  const daysUntilRenewal = subscription
    ? Math.max(0, Math.ceil((new Date(subscription.currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const usagePercentage = usage && usage.creditsIncluded > 0
    ? Math.round((usage.creditsUsed / usage.creditsIncluded) * 100)
    : 0;

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Initial data loading
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          fetchSubscriptionPlans(),
          fetchCurrentSubscription(),
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [fetchSubscriptionPlans, fetchCurrentSubscription]);

  // Load usage and billing data when subscription changes
  useEffect(() => {
    if (subscription) {
      fetchUsage();
      fetchBillingHistory();
    } else {
      setUsage(null);
      setBillingHistory([]);
    }
  }, [subscription, fetchUsage, fetchBillingHistory]);

  return {
    // State
    subscription,
    subscriptionPlans,
    usage,
    billingHistory,
    
    // Loading states
    isLoading,
    isCreatingSubscription,
    isUpdatingSubscription,
    isCancellingSubscription,
    
    // Actions
    createSubscription,
    updateSubscriptionPlan,
    cancelSubscription,
    reactivateSubscription,
    refreshSubscription,
    refreshUsage,
    refreshBillingHistory,
    
    // Computed properties
    isSubscribed,
    canUpgrade,
    canDowngrade,
    daysUntilRenewal,
    usagePercentage,
  };
};