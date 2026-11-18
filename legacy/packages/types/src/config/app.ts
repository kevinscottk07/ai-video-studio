export interface AppConfig {
  name: string;
  version: string;
  environment: 'development' | 'staging' | 'production';
  apiUrl: string;
  websocketUrl: string;
  frontendUrl: string;
  features: {
    realtime: boolean;
    community: boolean;
    analytics: boolean;
    maintenance: boolean;
  };
  limits: {
    maxFileSize: number; // in bytes
    maxProjectAssets: number;
    maxConcurrentJobs: number;
    rateLimit: {
      requests: number;
      window: number; // in seconds
    };
  };
  integrations: {
    auth0: {
      domain: string;
      clientId: string;
      audience: string;
    };
    stripe: {
      publishableKey: string;
    };
    aws: {
      region: string;
      s3Bucket: string;
      cloudFrontDomain: string;
    };
  };
}

export interface DatabaseConfig {
  url: string;
  maxConnections: number;
  connectionTimeout: number;
  queryTimeout: number;
  ssl: boolean;
}

export interface RedisConfig {
  url: string;
  maxConnections: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface EmailConfig {
  provider: 'resend' | 'sendgrid' | 'ses';
  apiKey: string;
  fromEmail: string;
  fromName: string;
  templates: {
    welcome: string;
    passwordReset: string;
    creditPurchase: string;
    subscriptionUpdate: string;
  };
}