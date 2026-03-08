// File size limits
export const MAX_FILE_SIZES = {
  IMAGE: 10 * 1024 * 1024, // 10MB
  VIDEO: 500 * 1024 * 1024, // 500MB
  AUDIO: 50 * 1024 * 1024, // 50MB
  DOCUMENT: 25 * 1024 * 1024, // 25MB
} as const;

// Supported file types
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export const SUPPORTED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/avi',
] as const;

export const SUPPORTED_AUDIO_TYPES = [
  'audio/mp3',
  'audio/wav',
  'audio/aac',
  'audio/ogg',
] as const;

// Video generation limits by tier
export const TIER_LIMITS = {
  FREE: {
    maxDuration: 60, // seconds
    maxResolution: 'standard',
    maxProjects: 3,
    maxAssetsPerProject: 5,
    creditsPerMonth: 0,
  },
  STARTER: {
    maxDuration: 300, // 5 minutes
    maxResolution: 'standard',
    maxProjects: 10,
    maxAssetsPerProject: 20,
    creditsPerMonth: 100,
  },
  PRO: {
    maxDuration: 7200, // 2 hours
    maxResolution: 'hd',
    maxProjects: 50,
    maxAssetsPerProject: 100,
    creditsPerMonth: 500,
  },
  ULTRA: {
    maxDuration: 7200, // 2 hours
    maxResolution: 'ultra',
    maxProjects: -1, // unlimited
    maxAssetsPerProject: -1, // unlimited
    creditsPerMonth: 2000,
  },
} as const;

// API rate limits
export const RATE_LIMITS = {
  DEFAULT: {
    requests: 100,
    window: 3600, // 1 hour
  },
  GENERATION: {
    requests: 10,
    window: 3600, // 1 hour
  },
  UPLOAD: {
    requests: 50,
    window: 3600, // 1 hour
  },
} as const;

// Cache TTL values (in seconds)
export const CACHE_TTL = {
  USER_SESSION: 3600, // 1 hour
  PROJECT_LIST: 300, // 5 minutes
  COMMUNITY_FEED: 60, // 1 minute
  SYSTEM_METRICS: 30, // 30 seconds
  CREDIT_BALANCE: 60, // 1 minute
} as const;

// WebSocket event types
export const WS_EVENTS = {
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  PROJECT_UPDATE: 'project_update',
  GENERATION_PROGRESS: 'generation_progress',
  NOTIFICATION: 'notification',
  CREDIT_UPDATE: 'credit_update',
} as const;

// Error codes
export const ERROR_CODES = {
  // Authentication
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  
  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  
  // Limits
  INSUFFICIENT_CREDITS: 'INSUFFICIENT_CREDITS',
  TIER_LIMIT_EXCEEDED: 'TIER_LIMIT_EXCEEDED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // System
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  MAINTENANCE_MODE: 'MAINTENANCE_MODE',
} as const;

// Default pagination
export const DEFAULT_PAGINATION = {
  page: 1,
  limit: 20,
  maxLimit: 100,
} as const;

// Supported languages
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
] as const;

// Video generation presets
export const VIDEO_PRESETS = {
  SOCIAL_MEDIA: {
    duration: 30,
    resolution: 'standard',
    aspectRatio: '9:16',
    style: 'social_media',
  },
  ADVERTISEMENT: {
    duration: 60,
    resolution: 'hd',
    aspectRatio: '16:9',
    style: 'advertisement',
  },
  CINEMATIC: {
    duration: 120,
    resolution: 'hd',
    aspectRatio: '21:9',
    style: 'cinematic',
  },
} as const;