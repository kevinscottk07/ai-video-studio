export interface AuthConfig {
  provider: 'auth0' | 'firebase';
  auth0?: {
    domain: string;
    clientId: string;
    clientSecret: string;
    audience: string;
    scope: string;
  };
  firebase?: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
    algorithm: string;
  };
  session: {
    secret: string;
    maxAge: number;
    secure: boolean;
    httpOnly: boolean;
    sameSite: 'strict' | 'lax' | 'none';
  };
}

export const getAuthConfig = (): AuthConfig => {
  const provider = (process.env.AUTH_PROVIDER as 'auth0' | 'firebase') || 'auth0';
  
  return {
    provider,
    auth0: provider === 'auth0' ? {
      domain: process.env.AUTH0_DOMAIN || '',
      clientId: process.env.AUTH0_CLIENT_ID || '',
      clientSecret: process.env.AUTH0_CLIENT_SECRET || '',
      audience: process.env.AUTH0_AUDIENCE || '',
      scope: process.env.AUTH0_SCOPE || 'openid profile email',
    } : undefined,
    firebase: provider === 'firebase' ? {
      apiKey: process.env.FIREBASE_API_KEY || '',
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
      projectId: process.env.FIREBASE_PROJECT_ID || '',
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
      appId: process.env.FIREBASE_APP_ID || '',
    } : undefined,
    jwt: {
      secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      algorithm: process.env.JWT_ALGORITHM || 'HS256',
    },
    session: {
      secret: process.env.SESSION_SECRET || 'your-super-secret-session-key',
      maxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000'), // 24 hours
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: (process.env.SESSION_SAME_SITE as 'strict' | 'lax' | 'none') || 'lax',
    },
  };
};