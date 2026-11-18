import { apiClient } from './client';

export interface TranslationRequest {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  context?: 'video_script' | 'ui_text' | 'marketing' | 'technical';
}

export interface TranslationResponse {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
  metadata: {
    wordCount: number;
    characterCount: number;
    detectedSourceLanguage?: string;
  };
}

export interface PromptOptimizationRequest {
  prompt: string;
  targetLanguage: string;
  videoStyle: string;
  culturalContext?: string;
}

export interface PromptOptimizationResponse {
  optimizedPrompt: string;
  culturalAdaptations: string[];
  suggestions: string[];
}

export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export const translationApi = {
  /**
   * Translate text from one language to another
   */
  async translateText(
    token: string,
    request: TranslationRequest
  ): Promise<{ translation: TranslationResponse }> {
    const response = await apiClient.post('/translation/translate', request, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.data;
  },

  /**
   * Optimize video generation prompt for specific language and culture
   */
  async optimizePrompt(
    token: string,
    request: PromptOptimizationRequest
  ): Promise<{ optimization: PromptOptimizationResponse }> {
    const response = await apiClient.post('/translation/optimize-prompt', request, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.data;
  },

  /**
   * Get list of supported languages for translation
   */
  async getSupportedLanguages(): Promise<{ languages: SupportedLanguage[] }> {
    const response = await apiClient.get('/translation/supported-languages');
    return response.data.data;
  },

  /**
   * Check translation service health
   */
  async getServiceHealth(token: string): Promise<{ health: any }> {
    const response = await apiClient.get('/translation/health', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.data;
  },
};