export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
}

export interface User {
  id: string;
  email: string;
  authProviderId: string; // Auth0 or Firebase ID
  displayName: string;
  profileImage?: string;
  language: string;
  timezone: string;
  creditBalance: number;
  totalCreditsEver: number;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date;
  isActive: boolean;
  role: UserRole;
}

export interface CreateUserRequest {
  email: string;
  authProviderId: string;
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

export interface UserSession {
  userId: string;
  email: string;
  role: UserRole;
  creditBalance: number;
  subscription?: {
    planId: string;
    status: string;
    creditsIncluded: number;
    creditsUsedThisPeriod: number;
  };
}