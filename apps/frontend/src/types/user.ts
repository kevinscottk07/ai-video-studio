export interface User {
  id: string;
  email: string;
  displayName: string;
  profileImage?: string;
  language: string;
  timezone: string;
  creditBalance: number;
  totalCreditsEver?: number;
  role: 'user' | 'admin' | 'moderator';
  createdAt: string;
  lastLoginAt?: string;
}

export interface CreateUserRequest {
  email: string;
  displayName: string;
  profileImage?: string;
  language?: string;
  timezone?: string;
}

export interface UpdateUserRequest {
  displayName?: string;
  profileImage?: string;
  language?: string;
  timezone?: string;
}

export interface AuthStatus {
  authenticated: boolean;
  user?: {
    id: string;
    email: string;
    role: string;
  } | null;
}