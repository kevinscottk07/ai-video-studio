export interface EstimateCreditsRequest {
  operationType: OperationType;
  parameters?: {
    duration?: number;
    resolution?: VideoResolution;
    style?: VideoStyle;
    complexity?: 'simple' | 'moderate' | 'complex';
  };
}

export interface EstimateCreditsResponse {
  estimate: CreditEstimate;
}

export interface GenerateVideoRequest extends GenerationRequest {}

export interface GenerateVideoResponse {
  job: GenerationJob;
}

export interface GetJobStatusRequest {
  jobId: string;
}

export interface GetJobStatusResponse {
  job: GenerationJob;
}

export interface CancelJobRequest {
  jobId: string;
}

export interface CancelJobResponse {
  success: boolean;
  refundedCredits?: number;
}

export interface GenerateScriptRequest {
  prompt: string;
  language: string;
  duration?: number;
  style?: VideoStyle;
  tone?: 'professional' | 'casual' | 'humorous' | 'dramatic';
}

export interface GenerateScriptResponse {
  script: Script;
  creditsUsed: number;
}

export interface GetMusicSuggestionsRequest {
  projectId: string;
  genre?: string;
  mood?: string;
  duration?: number;
}

export interface GetMusicSuggestionsResponse {
  suggestions: MusicSuggestion[];
}

export interface AnalyzeContentRequest {
  content: string | File;
  type: 'text' | 'image' | 'video' | 'audio';
}

export interface AnalyzeContentResponse {
  analysis: ContentAnalysis;
  creditsUsed: number;
}