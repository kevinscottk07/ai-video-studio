export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SocialLoginRequest {
  provider: 'google' | 'github' | 'facebook';
  token: string;
}

export interface AuthResult {
  success: boolean;
  user?: UserSession;
  tokens?: TokenPair;
  error?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken?: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}