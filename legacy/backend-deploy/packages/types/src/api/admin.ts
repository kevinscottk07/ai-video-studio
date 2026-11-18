export interface AdminDashboardMetrics {
  users: {
    total: number;
    active: number;
    new: number;
    growth: number; // percentage
  };
  revenue: {
    total: number; // In cents
    monthly: number;
    growth: number; // percentage
    breakdown: {
      subscriptions: number;
      credits: number;
    };
  };
  usage: {
    totalGenerations: number;
    creditsConsumed: number;
    awsCosts: number;
    profit: number;
  };
  system: {
    uptime: number; // percentage
    avgResponseTime: number; // milliseconds
    errorRate: number; // percentage
    activeJobs: number;
  };
}

export interface GetUsersRequest {
  filters?: UserFilters;
  pagination?: PaginationParams;
}

export interface GetUsersResponse extends PaginatedResponse<User> {}

export interface UpdateUserRequest {
  userId: string;
  updates: {
    role?: UserRole;
    isActive?: boolean;
    creditBalance?: number;
    displayName?: string;
  };
}

export interface UpdateUserResponse {
  user: User;
}

export interface GetSystemMetricsRequest {
  dateRange?: DateRange;
  granularity?: 'hour' | 'day' | 'week' | 'month';
}

export interface SystemMetric {
  timestamp: Date;
  value: number;
  metadata?: Record<string, any>;
}

export interface GetSystemMetricsResponse {
  metrics: {
    [key: string]: SystemMetric[];
  };
}

export interface PricingConfig {
  creditPrice: number; // Price per credit in cents
  operationCosts: {
    [key in OperationType]: {
      baseCredits: number;
      multipliers: {
        duration?: number;
        resolution?: number;
        complexity?: number;
      };
    };
  };
  subscriptionPlans: SubscriptionPlanDetails[];
}

export interface UpdatePricingConfigRequest {
  config: Partial<PricingConfig>;
}

export interface UpdatePricingConfigResponse {
  config: PricingConfig;
}

export interface GetAuditLogsRequest {
  filters?: {
    userId?: string;
    action?: string;
    resource?: string;
    dateRange?: DateRange;
  };
  pagination?: PaginationParams;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  resourceId: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
}

export interface GetAuditLogsResponse extends PaginatedResponse<AuditLogEntry> {}