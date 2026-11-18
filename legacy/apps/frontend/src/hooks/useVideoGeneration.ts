/**
 * Video Generation React Hooks
 * 
 * Comprehensive hooks for video generation functionality including
 * cost estimation, job management, and real-time progress tracking.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { videoApi, type VideoGenerationRequestData, type VideoGenerationParams } from '../services/api/videoApi';
import { useGenerationProgress } from './useRealTime';
import { useToast } from '../providers/ToastProvider';

export interface VideoGenerationState {
  isEstimating: boolean;
  isGenerating: boolean;
  currentJob: string | null;
  estimate: any | null;
  error: string | null;
}

/**
 * Main video generation hook
 */
export const useVideoGeneration = (projectId: string) => {
  const { getAccessTokenSilently } = useAuth0();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [state, setState] = useState<VideoGenerationState>({
    isEstimating: false,
    isGenerating: false,
    currentJob: null,
    estimate: null,
    error: null,
  });

  // Get real-time progress for current job
  const progress = useGenerationProgress(state.currentJob);

  // Estimate video generation cost
  const estimateMutation = useMutation({
    mutationFn: async (params: VideoGenerationParams) => {
      const token = await getAccessTokenSilently();
      return videoApi.estimateVideoGeneration(token, {
        projectId,
        parameters: params,
      });
    },
    onMutate: () => {
      setState(prev => ({ ...prev, isEstimating: true, error: null }));
    },
    onSuccess: (data) => {
      setState(prev => ({ 
        ...prev, 
        isEstimating: false, 
        estimate: data.estimate 
      }));
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error?.message || 'Failed to estimate video generation cost';
      setState(prev => ({ 
        ...prev, 
        isEstimating: false, 
        error: errorMessage 
      }));
      toast.error('Estimation Failed', errorMessage);
    },
  });

  // Generate video
  const generateMutation = useMutation({
    mutationFn: async (params: VideoGenerationParams) => {
      const token = await getAccessTokenSilently();
      return videoApi.generateVideo(token, {
        projectId,
        parameters: params,
      });
    },
    onMutate: () => {
      setState(prev => ({ ...prev, isGenerating: true, error: null }));
    },
    onSuccess: (data) => {
      setState(prev => ({ 
        ...prev, 
        isGenerating: false, 
        currentJob: data.job.id 
      }));
      toast.success('Generation Started', 'Your video is being generated...');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error?.message || 'Failed to start video generation';
      setState(prev => ({ 
        ...prev, 
        isGenerating: false, 
        error: errorMessage 
      }));
      toast.error('Generation Failed', errorMessage);
    },
  });

  // Cancel job
  const cancelMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const token = await getAccessTokenSilently();
      return videoApi.cancelJob(token, jobId);
    },
    onSuccess: (data) => {
      setState(prev => ({ ...prev, currentJob: null }));
      if (data.refundedCredits) {
        toast.success('Job Cancelled', `${data.refundedCredits} credits have been refunded.`);
      } else {
        toast.info('Job Cancelled', 'Your video generation has been cancelled.');
      }
      // Refresh credit balance
      queryClient.invalidateQueries({ queryKey: ['credits', 'balance'] });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error?.message || 'Failed to cancel job';
      toast.error('Cancel Failed', errorMessage);
    },
  });

  // Get job status
  const { data: jobStatus, isLoading: isLoadingJob } = useQuery({
    queryKey: ['video', 'job', state.currentJob],
    queryFn: async () => {
      if (!state.currentJob) return null;
      const token = await getAccessTokenSilently();
      return videoApi.getJobStatus(token, state.currentJob);
    },
    enabled: !!state.currentJob,
    refetchInterval: (data) => {
      // Stop polling if job is complete or failed
      if (data?.job.status === 'completed' || data?.job.status === 'failed') {
        return false;
      }
      return 5000; // Poll every 5 seconds
    },
  });

  // Handle job completion
  useEffect(() => {
    if (jobStatus?.job.status === 'completed') {
      toast.success('Video Ready!', 'Your video has been generated successfully.');
      setState(prev => ({ ...prev, currentJob: null }));
      // Refresh project data
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
    } else if (jobStatus?.job.status === 'failed') {
      toast.error('Generation Failed', jobStatus.job.errorMessage || 'Video generation failed.');
      setState(prev => ({ ...prev, currentJob: null }));
    }
  }, [jobStatus?.job.status, jobStatus?.job.errorMessage, toast, queryClient, projectId]);

  const estimateGeneration = useCallback((params: VideoGenerationParams) => {
    estimateMutation.mutate(params);
  }, [estimateMutation]);

  const startGeneration = useCallback((params: VideoGenerationParams) => {
    generateMutation.mutate(params);
  }, [generateMutation]);

  const cancelGeneration = useCallback(() => {
    if (state.currentJob) {
      cancelMutation.mutate(state.currentJob);
    }
  }, [state.currentJob, cancelMutation]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const clearEstimate = useCallback(() => {
    setState(prev => ({ ...prev, estimate: null }));
  }, []);

  return {
    // State
    ...state,
    isLoading: state.isEstimating || state.isGenerating || isLoadingJob,
    
    // Progress tracking
    progress: progress.progress,
    progressPercentage: progress.percentage,
    progressStage: progress.stage,
    progressMessage: progress.message,
    isComplete: progress.isComplete,
    
    // Job status
    jobStatus: jobStatus?.job,
    
    // Actions
    estimateGeneration,
    startGeneration,
    cancelGeneration,
    clearError,
    clearEstimate,
    
    // Mutation states
    isEstimating: estimateMutation.isPending,
    isGenerating: generateMutation.isPending,
    isCancelling: cancelMutation.isPending,
  };
};

/**
 * Hook for supported video options
 */
export const useSupportedVideoOptions = () => {
  return useQuery({
    queryKey: ['video', 'supported-options'],
    queryFn: () => videoApi.getSupportedOptions(),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};

/**
 * Hook for video service health
 */
export const useVideoServiceHealth = () => {
  const { getAccessTokenSilently } = useAuth0();
  
  return useQuery({
    queryKey: ['video', 'health'],
    queryFn: async () => {
      const token = await getAccessTokenSilently();
      return videoApi.getServiceHealth(token);
    },
    refetchInterval: 30000, // Check every 30 seconds
  });
};

/**
 * Hook for managing video generation parameters with validation
 */
export const useVideoGenerationParams = (initialParams?: Partial<VideoGenerationParams>) => {
  const [params, setParams] = useState<VideoGenerationParams>({
    prompt: '',
    duration: 30,
    resolution: 'standard',
    style: 'social_media',
    aspectRatio: '16:9',
    fps: 30,
    quality: 'standard',
    language: 'en', // Default to English
    ...initialParams,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateParam = useCallback(<K extends keyof VideoGenerationParams>(
    key: K,
    value: VideoGenerationParams[K]
  ) => {
    setParams(prev => ({ ...prev, [key]: value }));
    // Clear error for this field
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: '' }));
    }
  }, [errors]);

  const validateParams = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!params.prompt.trim()) {
      newErrors.prompt = 'Prompt is required';
    } else if (params.prompt.length < 10) {
      newErrors.prompt = 'Prompt must be at least 10 characters';
    } else if (params.prompt.length > 2000) {
      newErrors.prompt = 'Prompt must be less than 2000 characters';
    }

    if (params.duration < 15) {
      newErrors.duration = 'Duration must be at least 15 seconds';
    } else if (params.duration > 7200) {
      newErrors.duration = 'Duration cannot exceed 2 hours';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [params]);

  const resetParams = useCallback(() => {
    setParams({
      prompt: '',
      duration: 30,
      resolution: 'standard',
      style: 'social_media',
      aspectRatio: '16:9',
      fps: 30,
      quality: 'standard',
      language: 'en', // Default to English
      ...initialParams,
    });
    setErrors({});
  }, [initialParams]);

  const isValid = useMemo(() => {
    return params.prompt.trim().length >= 10 && 
           params.duration >= 15 && 
           params.duration <= 7200 &&
           Object.keys(errors).length === 0;
  }, [params, errors]);

  return {
    params,
    errors,
    isValid,
    updateParam,
    validateParams,
    resetParams,
  };
};