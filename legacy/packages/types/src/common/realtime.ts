export enum RealtimeEventType {
  // User events
  USER_UPDATED = 'user:updated',
  USER_CREDIT_CHANGED = 'user:credit_changed',
  
  // Project events
  PROJECT_CREATED = 'project:created',
  PROJECT_UPDATED = 'project:updated',
  PROJECT_DELETED = 'project:deleted',
  PROJECT_SHARED = 'project:shared',
  
  // Generation events
  GENERATION_STARTED = 'generation:started',
  GENERATION_PROGRESS = 'generation:progress',
  GENERATION_COMPLETED = 'generation:completed',
  GENERATION_FAILED = 'generation:failed',
  
  // Community events
  POST_CREATED = 'community:post_created',
  POST_LIKED = 'community:post_liked',
  POST_COMMENTED = 'community:post_commented',
  POST_SHARED = 'community:post_shared',
  
  // System events
  NOTIFICATION = 'system:notification',
  MAINTENANCE = 'system:maintenance',
  RATE_LIMIT = 'system:rate_limit',
}

export interface RealtimeEvent<T = any> {
  type: RealtimeEventType;
  data: T;
  userId?: string;
  roomId?: string;
  timestamp: Date;
  requestId?: string;
}

export interface NotificationEvent {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
  persistent?: boolean;
  expiresAt?: Date;
}

export interface GenerationProgressEvent {
  jobId: string;
  projectId: string;
  progress: number;
  stage: string;
  estimatedCompletion?: Date;
  message?: string;
}

export interface CommunityInteractionEvent {
  postId: string;
  userId: string;
  type: 'like' | 'comment' | 'share';
  data: any;
}

export interface RoomSubscription {
  roomId: string;
  eventTypes: RealtimeEventType[];
  userId: string;
  joinedAt: Date;
}

export interface UserActivity {
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}