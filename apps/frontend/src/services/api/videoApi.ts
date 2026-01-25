import { apiClient } from './client';
import type {
  VideoGenerationRequest,
  VideoGenerationEstimate,
  GenerationJob,
  VideoGenerationResult,
  SupportedVideoOptions,
} from '../types';

export interface VideoGenerationParams {
  prompt: string;
  assets?: string[]; // Asset IDs from MediaAsset table
  duration: number; // in seconds
  resolution: 'standard' | 'hd' | 'ultra';
  style: 'cinematic' | 'advertisement' | 'social_media' | 'educational' | 'vr';
  language?: string;
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3';
  fps?: 24 | 30 | 60;
  quality?: 'draft' | 'standard' | 'high' | 'ultra';
}

export interface VideoGenerationRequestData {
  projectId: string;
  parameters: VideoGenerationParams;
}

export interface VideoEstimateResponse {
  estimate: VideoGenerationEstimate;
}

export interface VideoGenerationResponse {
  job: {
    id: string;
    status: string;
    progress: number;
    creditsRequired: number;
    estimatedCompletion: string;
  };
}

export interface VideoJobStatusResponse {
  job: GenerationJob & {
    metadata?: {
      result?: VideoGenerationResult;
    };
  };
}

export interface VideoCancelResponse {
  cancelled: boolean;
  refundedCredits?: number;
}

export interface VideoHealthResponse {
  status: 'ok' | 'error';
  details: any;
}

export const videoApi = {
  /**
   * Estimate cost for video generation
   */
  async estimateVideoGeneration(
    token: string,
    request: VideoGenerationRequestData
  ): Promise<VideoEstimateResponse> {
    const response = await apiClient.post('/video/estimate', request, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.data;
  },

  /**
   * Queue video generation job
   */
  async generateVideo(
    token: string,
    request: VideoGenerationRequestData
  ): Promise<VideoGenerationResponse> {
    const response = await apiClient.post('/video/generate', request, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.data;
  },

  /**
   * Get video generation job status
   */
  async getJobStatus(
    token: string,
    jobId: string
  ): Promise<VideoJobStatusResponse> {
    const response = await apiClient.get(`/video/job/${jobId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.data;
  },

  /**
   * Cancel video generation job
   */
  async cancelJob(
    token: string,
    jobId: string
  ): Promise<VideoCancelResponse> {
    const response = await apiClient.delete(`/video/job/${jobId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.data;
  },

  /**
   * Get video generation service health
   */
  async getServiceHealth(token: string): Promise<VideoHealthResponse> {
    const response = await apiClient.get('/video/health', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.data;
  },

  /**
   * Get supported video generation options
   */
  async getSupportedOptions(): Promise<SupportedVideoOptions> {
    const response = await apiClient.get('/video/supported-options');
    return response.data.data;
  },
};