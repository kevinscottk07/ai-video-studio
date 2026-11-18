// Local types to replace workspace dependencies
// This file contains essential types needed for the frontend to build independently

// User types
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole = 'user' | 'admin' | 'moderator';

// Credit types
export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;
  type: TransactionType;
  operation: OperationType;
  description: string;
  createdAt: Date;
}

export type TransactionType = 'credit' | 'debit';
export type OperationType = 'video_generation' | 'purchase' | 'refund' | 'bonus';

// Subscription types
export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  credits: number;
  features: string[];
  popular?: boolean;
}

export interface SubscriptionUsage {
  creditsUsed: number;
  creditsRemaining: number;
  videosGenerated: number;
  storageUsed: number;
}

export interface BillingHistory {
  id: string;
  amount: number;
  date: Date;
  status: 'paid' | 'pending' | 'failed';
  description: string;
}

// Video generation types
export interface VideoGenerationResult {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  createdAt: Date;
}

export interface SupportedVideoOptions {
  formats: string[];
  resolutions: string[];
  maxDuration: number;
}

// Admin types
export interface PricingConfig {
  operationType: OperationType;
  creditCost: number;
  description: string;
}

export interface DateRange {
  start: Date;
  end: Date;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Credit estimation
export interface EstimateCreditsRequest {
  operation: OperationType;
  parameters?: Record<string, any>;
}

export interface EstimateCreditsResponse {
  estimatedCredits: number;
  breakdown: {
    operation: OperationType;
    credits: number;
    description: string;
  }[];
}