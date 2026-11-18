export enum TransactionType {
  PURCHASE = 'purchase',
  DEDUCTION = 'deduction',
  REFUND = 'refund',
  SUBSCRIPTION_GRANT = 'subscription_grant',
}

export interface CreditTransaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  description: string;
  operationId?: string; // Link to generation job if applicable
  awsCostCovered?: number; // AWS cost this transaction covered
  platformProfit?: number; // Platform profit from this transaction
  createdAt: Date;
}

export interface CreditPurchase {
  id: string;
  userId: string;
  amount: number;
  totalCost: number; // in cents
  paymentProcessorId: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
}

export interface CreditEstimate {
  operation: string;
  estimatedCredits: number;
  estimatedAWSCost: number;
  platformProfit: number;
  breakdown: {
    baseCredits: number;
    complexityMultiplier: number;
    durationMultiplier: number;
    resolutionMultiplier: number;
  };
}

export interface CreditBalance {
  current: number;
  pending: number; // Credits from pending purchases
  reserved: number; // Credits reserved for ongoing operations
  lifetime: number; // Total credits ever purchased/earned
}