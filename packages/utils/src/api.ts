import { ApiResponse, ApiError } from '@ai-video-studio/types';

export const createApiResponse = <T>(
  data?: T,
  error?: ApiError,
  meta?: any
): ApiResponse<T> => {
  return {
    success: !error,
    data,
    error,
    meta: {
      ...meta,
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
    },
  };
};

export const createApiError = (
  code: string,
  message: string,
  details?: Record<string, any>
): ApiError => {
  return {
    code,
    message,
    details,
    requestId: generateRequestId(),
    timestamp: new Date().toISOString(),
  };
};

export const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const parseApiError = (error: any): ApiError => {
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  
  return createApiError(
    'UNKNOWN_ERROR',
    error.message || 'An unknown error occurred',
    { originalError: error }
  );
};

export const isApiError = (obj: any): obj is ApiError => {
  return obj && typeof obj.code === 'string' && typeof obj.message === 'string';
};

export const handleApiResponse = async <T>(
  promise: Promise<any>
): Promise<ApiResponse<T>> => {
  try {
    const response = await promise;
    return response.data || response;
  } catch (error) {
    return createApiResponse<T>(undefined, parseApiError(error));
  }
};

export const buildQueryString = (params: Record<string, any>): string => {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        value.forEach(item => searchParams.append(key, item.toString()));
      } else if (typeof value === 'object') {
        searchParams.append(key, JSON.stringify(value));
      } else {
        searchParams.append(key, value.toString());
      }
    }
  });
  
  return searchParams.toString();
};

export const parseQueryString = (queryString: string): Record<string, any> => {
  const params = new URLSearchParams(queryString);
  const result: Record<string, any> = {};
  
  for (const [key, value] of params.entries()) {
    if (result[key]) {
      // Handle multiple values for the same key
      if (Array.isArray(result[key])) {
        result[key].push(value);
      } else {
        result[key] = [result[key], value];
      }
    } else {
      // Try to parse JSON values
      try {
        result[key] = JSON.parse(value);
      } catch {
        result[key] = value;
      }
    }
  }
  
  return result;
};

export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
};