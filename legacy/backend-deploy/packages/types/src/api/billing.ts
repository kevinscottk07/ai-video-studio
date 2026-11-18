export interface GetSubscriptionRequest {
  userId?: string; // Optional for admin access
}

export interface GetSubscriptionResponse {
  subscription?: Subscription;
  availablePlans: SubscriptionPlanDetails[];
}

export interface CreateSubscriptionRequest {
  planId: SubscriptionPlan;
  paymentMethodId?: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CreateSubscriptionResponse {
  subscription?: Subscription;
  checkoutUrl?: string; // For redirect to payment processor
  clientSecret?: string; // For embedded checkout
}

export interface UpdateSubscriptionRequest {
  subscriptionId: string;
  planId?: SubscriptionPlan;
  cancelAtPeriodEnd?: boolean;
}

export interface UpdateSubscriptionResponse {
  subscription: Subscription;
  prorationAmount?: number; // In cents
}

export interface CancelSubscriptionRequest {
  subscriptionId: string;
  cancelAtPeriodEnd?: boolean;
  reason?: string;
}

export interface CancelSubscriptionResponse {
  subscription: Subscription;
  refundAmount?: number; // In cents
}

export interface PurchaseCreditsRequest {
  amount: number;
  paymentMethodId?: string;
  successUrl: string;
  cancelUrl: string;
}

export interface PurchaseCreditsResponse {
  purchase?: CreditPurchase;
  checkoutUrl?: string;
  clientSecret?: string;
}

export interface GetCreditHistoryRequest {
  filters?: TransactionFilters;
  pagination?: PaginationParams;
}

export interface GetCreditHistoryResponse extends PaginatedResponse<CreditTransaction> {}

export interface GetBillingHistoryRequest {
  dateRange?: DateRange;
  pagination?: PaginationParams;
}

export interface BillingHistoryItem {
  id: string;
  type: 'subscription' | 'credit_purchase' | 'refund';
  amount: number; // In cents
  description: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  invoiceUrl?: string;
  createdAt: Date;
}

export interface GetBillingHistoryResponse extends PaginatedResponse<BillingHistoryItem> {}