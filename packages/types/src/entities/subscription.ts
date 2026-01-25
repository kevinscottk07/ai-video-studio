export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELED = 'canceled',
  PAST_DUE = 'past_due',
  UNPAID = 'unpaid',
}

export enum SubscriptionPlan {
  FREE = 'free',
  STARTER = 'starter',
  PRO = 'pro',
  ULTRA = 'ultra',
}

export interface SubscriptionPlanDetails {
  id: SubscriptionPlan;
  name: string;
  price: number; // in cents
  interval: 'month' | 'year';
  creditsIncluded: number;
  features: {
    maxDuration: number; // in seconds
    maxResolution: VideoResolution;
    vrSupport: boolean;
    prioritySupport: boolean;
    customBranding: boolean;
  };
}

export interface Subscription {
  id: string;
  userId: string;
  planId: SubscriptionPlan;
  paymentProcessorId: string; // LemonSqueezy/Paddle subscription ID
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  creditsIncluded: number; // Monthly credit allocation
  creditsUsedThisPeriod: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionUsage {
  creditsIncluded: number;
  creditsUsed: number;
  creditsRemaining: number;
  usagePercentage: number;
  daysRemaining: number;
}

export interface BillingHistory {
  id: string;
  date: Date;
  description: string;
  amount: number; // in cents
  status: 'paid' | 'pending' | 'failed';
  invoiceUrl?: string;
  type: 'subscription' | 'credit_purchase' | 'refund';
}

export interface CreateSubscriptionRequest {
  planId: SubscriptionPlan;
  paymentMethodId: string;
}

export interface UpdateSubscriptionRequest {
  planId?: SubscriptionPlan;
  cancelAtPeriodEnd?: boolean;
}