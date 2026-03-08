export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  requestId: string;
  timestamp: string;
}

export interface ResponseMeta {
  requestId: string;
  timestamp: string;
  version: string;
  rateLimit?: {
    limit: number;
    remaining: number;
    resetAt: Date;
  };
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    validationErrors?: ValidationError[];
    requestId: string;
    timestamp: string;
  };
}