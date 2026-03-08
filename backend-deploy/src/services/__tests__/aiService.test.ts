import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { aiService } from '../aiService.js';
import { creditService } from '../creditService.js';

// Mock AWS SDK
vi.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: vi.fn().mockImplementation(() => ({
    send: vi.fn(),
  })),
  InvokeModelCommand: vi.fn(),
}));

// Mock config
vi.mock('@ai-video-studio/config', () => ({
  getBedrockConfig: vi.fn(() => ({
    region: 'us-east-1',
    accessKeyId: 'test-key',
    secretAccessKey: 'test-secret',
    models: {
      textGeneration: 'anthropic.claude-3-sonnet-20240229-v1:0',
      imageGeneration: 'stability.stable-diffusion-xl-v1',
      videoGeneration: 'stability.stable-video-diffusion-img2vid-v1',
    },
    maxTokens: 4096,
    temperature: 0.7,
    timeout: 60000,
  })),
  getCostTrackingConfig: vi.fn(() => ({
    enabled: true,
    services: {
      bedrock: {
        inputTokenCost: 0.00125,
        outputTokenCost: 0.00375,
      },
    },
  })),
}));

// Mock credit service
vi.mock('../creditService.js', () => ({
  creditService: {
    calculateCreditsFromCost: vi.fn(),
  },
}));

// Mock logger
vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('AIService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('estimateScriptGenerationCost', () => {
    it('should estimate cost correctly for basic request', async () => {
      // Mock credit calculation
      vi.mocked(creditService.calculateCreditsFromCost).mockReturnValue(10);

      const request = {
        prompt: 'Create a video script about renewable energy',
        language: 'en',
        style: 'professional' as const,
        duration: 60,
      };

      const estimate = await aiService.estimateScriptGenerationCost(request);

      expect(estimate).toEqual({
        awsCost: expect.any(Number),
        creditsRequired: 10,
        breakdown: {
          inputTokens: expect.any(Number),
          outputTokens: expect.any(Number),
          estimatedInputCost: expect.any(Number),
          estimatedOutputCost: expect.any(Number),
        },
      });

      expect(estimate.awsCost).toBeGreaterThan(0);
      expect(estimate.breakdown.inputTokens).toBeGreaterThan(0);
      expect(estimate.breakdown.outputTokens).toBeGreaterThan(0);
    });

    it('should handle different durations correctly', async () => {
      vi.mocked(creditService.calculateCreditsFromCost).mockReturnValue(20);

      const shortRequest = {
        prompt: 'Short video script',
        language: 'en',
        duration: 30,
      };

      const longRequest = {
        prompt: 'Long video script',
        language: 'en',
        duration: 120,
      };

      const shortEstimate = await aiService.estimateScriptGenerationCost(shortRequest);
      const longEstimate = await aiService.estimateScriptGenerationCost(longRequest);

      expect(longEstimate.breakdown.outputTokens).toBeGreaterThan(shortEstimate.breakdown.outputTokens);
      expect(longEstimate.awsCost).toBeGreaterThan(shortEstimate.awsCost);
    });

    it('should use default duration when not provided', async () => {
      vi.mocked(creditService.calculateCreditsFromCost).mockReturnValue(15);

      const request = {
        prompt: 'Test script',
        language: 'en',
      };

      const estimate = await aiService.estimateScriptGenerationCost(request);

      expect(estimate.breakdown.outputTokens).toBeGreaterThan(0);
      expect(estimate.awsCost).toBeGreaterThan(0);
    });

    it('should handle estimation errors gracefully', async () => {
      vi.mocked(creditService.calculateCreditsFromCost).mockImplementation(() => {
        throw new Error('Credit calculation failed');
      });

      const request = {
        prompt: 'Test script',
        language: 'en',
      };

      await expect(aiService.estimateScriptGenerationCost(request)).rejects.toThrow('Failed to estimate cost');
    });
  });

  describe('generateScript', () => {
    it('should generate script successfully', async () => {
      // Mock successful Bedrock response
      const mockResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{ text: 'Generated script content here...' }],
          usage: {
            input_tokens: 50,
            output_tokens: 200,
          },
        })),
      };

      const mockSend = vi.fn().mockResolvedValue(mockResponse);
      const { BedrockRuntimeClient } = await import('@aws-sdk/client-bedrock-runtime');
      vi.mocked(BedrockRuntimeClient).mockImplementation(() => ({
        send: mockSend,
      }) as any);

      vi.mocked(creditService.calculateCreditsFromCost).mockReturnValue(8);

      const request = {
        prompt: 'Create a professional video script about AI technology',
        language: 'en',
        style: 'professional' as const,
        duration: 60,
        targetAudience: 'tech professionals',
      };

      const result = await aiService.generateScript(request);

      expect(result).toEqual({
        script: 'Generated script content here...',
        metadata: {
          wordCount: expect.any(Number),
          estimatedDuration: expect.any(Number),
          language: 'en',
          style: 'professional',
        },
        usage: {
          inputTokens: 50,
          outputTokens: 200,
          totalTokens: 250,
        },
        cost: {
          awsCost: expect.any(Number),
          creditsRequired: 8,
        },
      });

      expect(mockSend).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should handle different languages correctly', async () => {
      const mockResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{ text: 'Script en español...' }],
          usage: {
            input_tokens: 60,
            output_tokens: 180,
          },
        })),
      };

      const mockSend = vi.fn().mockResolvedValue(mockResponse);
      const { BedrockRuntimeClient } = await import('@aws-sdk/client-bedrock-runtime');
      vi.mocked(BedrockRuntimeClient).mockImplementation(() => ({
        send: mockSend,
      }) as any);

      vi.mocked(creditService.calculateCreditsFromCost).mockReturnValue(7);

      const request = {
        prompt: 'Crear un guión sobre tecnología',
        language: 'es',
        style: 'casual' as const,
      };

      const result = await aiService.generateScript(request);

      expect(result.script).toBe('Script en español...');
      expect(result.metadata.language).toBe('es');
      expect(result.metadata.style).toBe('casual');
    });

    it('should handle Bedrock API errors appropriately', async () => {
      const mockSend = vi.fn().mockRejectedValue(new Error('ThrottlingException: Rate exceeded'));
      const { BedrockRuntimeClient } = await import('@aws-sdk/client-bedrock-runtime');
      vi.mocked(BedrockRuntimeClient).mockImplementation(() => ({
        send: mockSend,
      }) as any);

      const request = {
        prompt: 'Test script',
        language: 'en',
      };

      await expect(aiService.generateScript(request)).rejects.toThrow(
        'Service temporarily unavailable due to high demand. Please try again in a moment.'
      );
    });

    it('should handle validation errors', async () => {
      const mockSend = vi.fn().mockRejectedValue(new Error('ValidationException: Invalid input'));
      const { BedrockRuntimeClient } = await import('@aws-sdk/client-bedrock-runtime');
      vi.mocked(BedrockRuntimeClient).mockImplementation(() => ({
        send: mockSend,
      }) as any);

      const request = {
        prompt: 'Test script',
        language: 'en',
      };

      await expect(aiService.generateScript(request)).rejects.toThrow(
        'Invalid request parameters. Please check your input and try again.'
      );
    });

    it('should handle authentication errors', async () => {
      const mockSend = vi.fn().mockRejectedValue(new Error('UnauthorizedException: Invalid credentials'));
      const { BedrockRuntimeClient } = await import('@aws-sdk/client-bedrock-runtime');
      vi.mocked(BedrockRuntimeClient).mockImplementation(() => ({
        send: mockSend,
      }) as any);

      const request = {
        prompt: 'Test script',
        language: 'en',
      };

      await expect(aiService.generateScript(request)).rejects.toThrow(
        'Authentication failed. Please contact support.'
      );
    });

    it('should handle missing response body', async () => {
      const mockResponse = { body: null };
      const mockSend = vi.fn().mockResolvedValue(mockResponse);
      const { BedrockRuntimeClient } = await import('@aws-sdk/client-bedrock-runtime');
      vi.mocked(BedrockRuntimeClient).mockImplementation(() => ({
        send: mockSend,
      }) as any);

      const request = {
        prompt: 'Test script',
        language: 'en',
      };

      await expect(aiService.generateScript(request)).rejects.toThrow('No response body from Bedrock');
    });
  });

  describe('healthCheck', () => {
    it('should return ok status when service is healthy', async () => {
      const mockResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{ text: 'OK' }],
          usage: { input_tokens: 5, output_tokens: 1 },
        })),
      };

      const mockSend = vi.fn().mockResolvedValue(mockResponse);
      const { BedrockRuntimeClient } = await import('@aws-sdk/client-bedrock-runtime');
      vi.mocked(BedrockRuntimeClient).mockImplementation(() => ({
        send: mockSend,
      }) as any);

      const health = await aiService.healthCheck();

      expect(health).toEqual({
        status: 'ok',
        details: {
          region: 'us-east-1',
          model: 'anthropic.claude-3-sonnet-20240229-v1:0',
          responseReceived: true,
        },
      });
    });

    it('should return error status when service is unhealthy', async () => {
      const mockSend = vi.fn().mockRejectedValue(new Error('Service unavailable'));
      const { BedrockRuntimeClient } = await import('@aws-sdk/client-bedrock-runtime');
      vi.mocked(BedrockRuntimeClient).mockImplementation(() => ({
        send: mockSend,
      }) as any);

      const health = await aiService.healthCheck();

      expect(health).toEqual({
        status: 'error',
        details: {
          error: 'Service unavailable',
          region: 'us-east-1',
          model: 'anthropic.claude-3-sonnet-20240229-v1:0',
        },
      });
    });
  });

  describe('buildSystemPrompt', () => {
    it('should build comprehensive system prompt', () => {
      const request = {
        prompt: 'Test prompt',
        language: 'en',
        style: 'professional' as const,
        duration: 90,
        targetAudience: 'business professionals',
      };

      // Access private method through any cast for testing
      const systemPrompt = (aiService as any).buildSystemPrompt(request);

      expect(systemPrompt).toContain('professional');
      expect(systemPrompt).toContain('90 seconds');
      expect(systemPrompt).toContain('business professionals');
      expect(systemPrompt).toContain('en');
      expect(systemPrompt).toContain('225 words'); // 90 * 2.5
    });

    it('should handle optional parameters', () => {
      const request = {
        prompt: 'Test prompt',
        language: 'fr',
      };

      const systemPrompt = (aiService as any).buildSystemPrompt(request);

      expect(systemPrompt).toContain('fr');
      expect(systemPrompt).toContain('professional'); // default style
      expect(systemPrompt).toContain('60 seconds'); // default duration
      expect(systemPrompt).not.toContain('TARGET AUDIENCE');
    });
  });

  describe('extractScriptMetadata', () => {
    it('should extract metadata correctly', () => {
      const script = 'This is a test script with multiple words for testing purposes.';
      const request = {
        prompt: 'Test',
        language: 'en',
        style: 'creative' as const,
      };

      const metadata = (aiService as any).extractScriptMetadata(script, request);

      expect(metadata).toEqual({
        wordCount: 11,
        estimatedDuration: 5, // Math.ceil(11 / 2.5)
        language: 'en',
        style: 'creative',
      });
    });

    it('should handle empty script', () => {
      const script = '';
      const request = {
        prompt: 'Test',
        language: 'en',
      };

      const metadata = (aiService as any).extractScriptMetadata(script, request);

      expect(metadata.wordCount).toBe(0);
      expect(metadata.estimatedDuration).toBe(0);
    });
  });

  describe('calculateActualCost', () => {
    it('should calculate cost correctly', () => {
      const usage = {
        inputTokens: 1000,
        outputTokens: 2000,
      };

      const cost = (aiService as any).calculateActualCost(usage);

      expect(cost.awsCost).toBe(8.75); // (1000/1000 * 0.00125) + (2000/1000 * 0.00375)
    });

    it('should handle zero tokens', () => {
      const usage = {
        inputTokens: 0,
        outputTokens: 0,
      };

      const cost = (aiService as any).calculateActualCost(usage);

      expect(cost.awsCost).toBe(0);
    });
  });
});