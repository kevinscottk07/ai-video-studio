// Copied from @ai-video-studio/types for standalone deployment

export interface User {
  id: string;
  email: string;
  displayName: string;
  profileImage?: string;
  language: string;
  timezone: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator'
}

export interface Project {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  userId: string;
  settings: ProjectSettings;
}

export enum ProjectStatus {
  DRAFT = 'draft',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface ProjectSettings {
  duration: number;
  resolution: VideoResolution;
  style: VideoStyle;
}

export enum VideoResolution {
  HD = '720p',
  FULL_HD = '1080p',
  ULTRA_HD = '4K'
}

export enum VideoStyle {
  CINEMATIC = 'cinematic',
  MODERN = 'modern',
  VINTAGE = 'vintage',
  ANIMATED = 'animated'
}

export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;
  type: TransactionType;
  description: string;
  createdAt: string;
}

export enum TransactionType {
  PURCHASE = 'purchase',
  USAGE = 'usage',
  REFUND = 'refund',
  BONUS = 'bonus'
}

export interface CreditBalance {
  balance: number;
  used: number;
  total: number;
}

export interface CreditPurchase {
  id: string;
  userId: string;
  amount: number;
  price: number;
  stripePaymentIntentId: string;
  status: string;
  createdAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELED = 'canceled',
  PAST_DUE = 'past_due',
  UNPAID = 'unpaid'
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  credits: number;
  features: string[];
}

export interface GenerationRequest {
  prompt: string;
  duration: number;
  resolution: VideoResolution;
  style: VideoStyle;
}

export interface GenerationJob {
  id: string;
  userId: string;
  projectId: string;
  status: JobStatus;
  progress: number;
  request: GenerationRequest;
  result?: GenerationResult;
  createdAt: string;
  updatedAt: string;
}

export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface GenerationResult {
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  metadata: Record<string, any>;
}

export interface ProgressData {
  stage: string;
  progress: number;
  message: string;
}

// API Request/Response types
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

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Community types
export interface CommunityPost {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  author: User;
  likes: number;
  comments: number;
  createdAt: string;
}

export interface Comment {
  id: string;
  content: string;
  author: User;
  createdAt: string;
}

export interface Like {
  id: string;
  userId: string;
  postId: string;
  createdAt: string;
}

export interface Share {
  id: string;
  userId: string;
  postId: string;
  platform: string;
  createdAt: string;
}

export enum ModerationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export enum ReportReason {
  SPAM = 'spam',
  INAPPROPRIATE = 'inappropriate',
  COPYRIGHT = 'copyright',
  OTHER = 'other'
}

// Admin types
export interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  resource: string;
  details: Record<string, any>;
  createdAt: string;
}

export interface SystemConfig {
  key: string;
  value: any;
  updatedAt: string;
  updatedBy: string;
}

export interface PricingConfig {
  creditPackages: CreditPackage[];
  subscriptionPlans: SubscriptionPlan[];
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  bonus?: number;
}

export interface SubscriptionPlanDetails extends SubscriptionPlan {
  description: string;
  popular?: boolean;
}

// Request types
export interface GetUsersRequest extends PaginationParams {
  role?: UserRole;
  search?: string;
}

export interface GetProjectsRequest extends PaginationParams {
  status?: ProjectStatus;
  userId?: string;
}

export interface GetTransactionsRequest extends PaginationParams {
  userId?: string;
  type?: TransactionType;
  dateRange?: DateRange;
}

export interface GetAuditLogsRequest extends PaginationParams {
  userId?: string;
  action?: string;
  dateRange?: DateRange;
}

export interface DateRange {
  start: string;
  end: string;
}

export interface EstimateCreditsRequest {
  duration: number;
  resolution: VideoResolution;
  style: VideoStyle;
}

export interface EstimateCreditsResponse {
  credits: number;
  cost: number;
}

export interface CreditEstimate {
  credits: number;
  cost: number;
}

// Storage types
export interface SecureUploadOptions {
  maxSize?: number;
  allowedTypes?: string[];
  encryption?: boolean;
}

export interface SecureDownloadOptions {
  expiresIn?: number;
  ipRestriction?: string[];
}

export interface StorageMetrics {
  totalSize: number;
  fileCount: number;
  bandwidth: number;
}

// Privacy types
export interface UserDataExport {
  user: User;
  projects: Project[];
  transactions: CreditTransaction[];
  subscriptions: Subscription[];
  auditLogs: AuditLogEntry[];
}

export enum OperationType {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete'
}