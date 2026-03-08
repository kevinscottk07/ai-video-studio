import { useState, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { translationApi, type TranslationRequest, type PromptOptimizationRequest } from '../services/api/translationApi';
import { useToast } from '../providers/ToastProvider';

/**
 * Hook for text translation functionality
 */
export const useTextTranslation = () => {
  const { getAccessTokenSilently } = useAuth0();
  const { toast } = useToast();

  const translateMutation = useMutation({
    mutationFn: async (request: TranslationRequest) => {
      const token = await getAccessTokenSilently();
      return translationApi.translateText(token, request);
    },
    onSuccess: (data) => {
      toast.success('Translation Complete', 'Text has been translated successfully.');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error?.message || 'Translation failed';
      toast.error('Translation Failed', errorMessage);
    },
  });

  const translateText = useCallback((request: TranslationRequest) => {
    translateMutation.mutate(request);
  }, [translateMutation]);

  return {
    translateText,
    translation: translateMutation.data?.translation,
    isTranslating: translateMutation.isPending,
    error: translateMutation.error,
    reset: translateMutation.reset,
  };
};

/**
 * Hook for prompt optimization functionality
 */
export const usePromptOptimization = () => {
  const { getAccessTokenSilently } = useAuth0();
  const { toast } = useToast();

  const optimizeMutation = useMutation({
    mutationFn: async (request: PromptOptimizationRequest) => {
      const token = await getAccessTokenSilently();
      return translationApi.optimizePrompt(token, request);
    },
    onSuccess: (data) => {
      toast.success('Prompt Optimized', 'Your prompt has been optimized for the target language and culture.');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error?.message || 'Prompt optimization failed';
      toast.error('Optimization Failed', errorMessage);
    },
  });

  const optimizePrompt = useCallback((request: PromptOptimizationRequest) => {
    optimizeMutation.mutate(request);
  }, [optimizeMutation]);

  return {
    optimizePrompt,
    optimization: optimizeMutation.data?.optimization,
    isOptimizing: optimizeMutation.isPending,
    error: optimizeMutation.error,
    reset: optimizeMutation.reset,
  };
};

/**
 * Hook for getting supported languages
 */
export const useSupportedLanguages = () => {
  return useQuery({
    queryKey: ['translation', 'supported-languages'],
    queryFn: () => translationApi.getSupportedLanguages(),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};

/**
 * Hook for translation service health
 */
export const useTranslationServiceHealth = () => {
  const { getAccessTokenSilently } = useAuth0();
  
  return useQuery({
    queryKey: ['translation', 'health'],
    queryFn: async () => {
      const token = await getAccessTokenSilently();
      return translationApi.getServiceHealth(token);
    },
    refetchInterval: 30000, // Check every 30 seconds
  });
};