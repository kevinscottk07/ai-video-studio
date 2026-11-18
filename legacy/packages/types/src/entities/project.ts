export enum ProjectStatus {
  DRAFT = 'draft',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum VideoResolution {
  STANDARD = 'standard', // 1080p
  HD = 'hd', // 4K
  ULTRA = 'ultra', // 8K
}

export enum VideoStyle {
  CINEMATIC = 'cinematic',
  ADVERTISEMENT = 'advertisement',
  SOCIAL_MEDIA = 'social_media',
  EDUCATIONAL = 'educational',
  VR = 'vr',
}

export interface MediaAsset {
  id: string;
  projectId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  uploadedAt: Date;
}

export interface ProjectSettings {
  resolution: VideoResolution;
  duration: number; // in seconds
  language: string;
  style: VideoStyle;
  musicEnabled: boolean;
  voiceoverEnabled: boolean;
}

export interface CommunityMetrics {
  likes: number;
  comments: number;
  shares: number;
  views: number;
}

export interface Project {
  id: string;
  userId: string;
  title: string;
  description?: string;
  settings: ProjectSettings;
  assets: MediaAsset[];
  status: ProjectStatus;
  isPublic: boolean;
  communityMetrics?: CommunityMetrics;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectRequest {
  title: string;
  description?: string;
  settings: ProjectSettings;
}

export interface UpdateProjectRequest {
  title?: string;
  description?: string;
  settings?: Partial<ProjectSettings>;
  isPublic?: boolean;
}

export interface ShareSettings {
  isPublic: boolean;
  allowComments: boolean;
  allowDownloads: boolean;
}