import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add request ID for tracking
    config.headers['X-Request-ID'] = crypto.randomUUID();
    
    // Log request in development
    if (import.meta.env.DEV) {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, {
        data: config.data,
        params: config.params,
      });
    }
    
    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Log response in development
    if (import.meta.env.DEV) {
      console.log(`[API] ${response.status} ${response.config.url}`, {
        data: response.data,
      });
    }
    
    return response;
  },
  (error) => {
    // Log error
    console.error('[API] Response error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      data: error.response?.data,
    });

    // Handle specific error cases
    if (error.response?.status === 401) {
      // Token expired or invalid - let Auth0 handle this
      console.warn('[API] Authentication error - token may be expired');
    } else if (error.response?.status === 403) {
      console.warn('[API] Authorization error - insufficient permissions');
    } else if (error.response?.status >= 500) {
      console.error('[API] Server error - please try again later');
    }

    return Promise.reject(error);
  }
);

export default apiClient;