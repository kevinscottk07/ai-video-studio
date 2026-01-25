import { AppConfig } from '@ai-video-studio/types';

export const getAppConfig = (): AppConfig => {
  const env = process.env.NODE_ENV || 'development';
  
  return {
    name: 'AI Video Studio',
    version: process.env.APP_VERSION || '1.0.0',
    environment: env as 'development' | 'staging' | 'production',
    apiUrl: process.env.API_URL || 'http://localhost:3001',
    websocketUrl: process.env.WEBSOCKET_URL || 'ws://localhost:3001',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    features: {
      realtime: process.env.ENABLE_REALTIME === 'true',
      community: process.env.ENABLE_COMMUNITY === 'true',
      analytics: process.env.ENABLE_ANALYTICS === 'true',
      maintenance: process.env.MAINTENANCE_MODE === 'true',
    },
    limits: {
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600'), // 100MB
      maxProjectAssets: parseInt(process.env.MAX_PROJECT_ASSETS || '50'),
      maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS || '5'),
      rateLimit: {
        requests: parseInt(process.env.RATE_LIMIT_REQUESTS || '100'),
        window: parseInt(process.env.RATE_LIMIT_WINDOW || '3600'),
      },
    },
    integrations: {
      auth0: {
        domain: process.env.AUTH0_DOMAIN || '',
        clientId: process.env.AUTH0_CLIENT_ID || '',
        audience: process.env.AUTH0_AUDIENCE || '',
      },
      stripe: {
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
      },
      aws: {
        region: process.env.AWS_REGION || 'us-east-1',
        s3Bucket: process.env.AWS_S3_BUCKET || '',
        cloudFrontDomain: process.env.AWS_CLOUDFRONT_DOMAIN || '',
      },
    },
  };
};

export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development';
};

export const isProduction = (): boolean => {
  return process.env.NODE_ENV === 'production';
};

export const isStaging = (): boolean => {
  return process.env.NODE_ENV === 'staging';
};