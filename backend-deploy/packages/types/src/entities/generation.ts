export enum JobStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELED = 'canceled',
}

export enum OperationType {
  SCRIPT_GENERATION = 'script_generation',
  VIDEO_GENERATION = 'video_generation',
  MUSIC_GENERATION = 'music_generation',
  VOICEOVER_GENERATION = 'voiceover_generation',
  VIDEO_EDITING = 'video_editing',
}

export interface GenerationRequest {
  projectId: string;
  operationType: OperationType;
  parameters: {
    prompt?: string;
    assets?: string[]; // Asset IDs
    duration?: number;
    resolution?: VideoResolution;
    style?: VideoStyle;
    language?: string;
    voiceSettings?: {
      voice: string;
      speed: number;
      pitch: number;
    };
    musicSettings?: {
      genre: string;
      mood: string;
      intensity: number;
    };
  };
}

export interface GenerationJob {
  id: string;
  projectId: string;
  userId: string;
  request: GenerationRequest;
  status: JobStatus;
  progress: number; // 0-100
  creditsRequired: number; // Credits needed for this operation
  creditsDeducted: number; // Credits actually deducted
  estimatedAWSCost: number; // Estimated AWS charges
  actualAWSCost?: number; // Actual AWS charges after completion
  platformProfit: number; // Platform profit from this operation
  resultUrl?: string; // URL in S3 bucket
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface Script {
  id: string;
  content: string;
  language: string;
  estimatedDuration: number; // in seconds
  scenes: ScriptScene[];
  metadata: {
    wordCount: number;
    readingTime: number;
    complexity: 'simple' | 'moderate' | 'complex';
  };
}

export interface ScriptScene {
  id: string;
  sequence: number;
  content: string;
  duration: number;
  visualDescription: string;
  audioDescription?: string;
}

export interface VideoJob {
  id: string;
  status: JobStatus;
  progress: number;
  estimatedCompletion: Date;
  resultUrl?: string;
  thumbnailUrl?: string;
  metadata: {
    duration: number;
    resolution: string;
    fileSize: number;
    format: string;
  };
}

export interface MusicSuggestion {
  id: string;
  title: string;
  genre: string;
  mood: string;
  duration: number;
  previewUrl: string;
  licenseType: 'royalty_free' | 'creative_commons' | 'premium';
  tags: string[];
}

export interface ContentAnalysis {
  sentiment: 'positive' | 'neutral' | 'negative';
  topics: string[];
  complexity: 'simple' | 'moderate' | 'complex';
  suggestedImprovements: string[];
  contentFlags: {
    inappropriate: boolean;
    copyrighted: boolean;
    lowQuality: boolean;
  };
}