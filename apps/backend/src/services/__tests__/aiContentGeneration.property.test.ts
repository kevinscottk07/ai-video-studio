import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { aiService } from '../aiService.js';

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
    calculateCreditsFromCost: vi.fn((cost: number) => Math.ceil(cost * 20)), // Mock 20x markup
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

describe('AI Content Generation Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * **Property 5: AI Content Generation Consistency**
   * **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
   * 
   * For any content generation request (script, video, music, editing suggestions), 
   * the output should be contextually appropriate to the input specifications and 
   * maintain consistency with user preferences
   */
  describe('Property 5: AI Content Generation Consistency', () => {
    // Custom generators for domain-specific data
    const scriptGenerationRequestArb = fc.record({
      prompt: fc.string({ minLength: 10, maxLength: 500 }),
      language: fc.constantFrom('en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh'),
      style: fc.option(fc.constantFrom('casual', 'professional', 'creative', 'educational'), { nil: undefined }),
      duration: fc.option(fc.integer({ min: 15, max: 600 }), { nil: undefined }),
      targetAudience: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
    });

    const mockSuccessfulResponse = (inputTokens: number, outputTokens: number, scriptContent: string) => ({
      body: new TextEncoder().encode(JSON.stringify({
        content: [{ text: scriptContent }],
        usage: {
          input_tokens: inputTokens,
          output_tokens: outputTokens,
        },
      })),
    });

    it('should maintain consistent cost estimation properties', async () => {
      await fc.assert(
        fc.asyncProperty(scriptGenerationRequestArb, async (request) => {
          // Property: Cost estimation should be deterministic and positive
          const estimate1 = await aiService.estimateScriptGenerationCost(request);
          const estimate2 = await aiService.estimateScriptGenerationCost(request);

          // Cost estimates should be identical for same input
          expect(estimate1.awsCost).toBe(estimate2.awsCost);
          expect(estimate1.creditsRequired).toBe(estimate2.creditsRequired);

          // Cost should always be positive
          expect(estimate1.awsCost).toBeGreaterThan(0);
          expect(estimate1.creditsRequired).toBeGreaterThan(0);

          // Breakdown should sum correctly
          const expectedCost = estimate1.breakdown.estimatedInputCost + estimate1.breakdown.estimatedOutputCost;
          expect(Math.abs(estimate1.awsCost - expectedCost)).toBeLessThan(0.001); // Allow for floating point precision

          // Token estimates should be reasonable
          expect(estimate1.breakdown.inputTokens).toBeGreaterThan(0);
          expect(estimate1.breakdown.outputTokens).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });

    it('should scale cost appropriately with duration', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 200 }),
          fc.constantFrom('en', 'es', 'fr'),
          fc.integer({ min: 30, max: 300 }),
          fc.integer({ min: 30, max: 300 }),
          async (prompt, language, duration1, duration2) => {
            fc.pre(duration1 !== duration2); // Ensure different durations

            const request1 = { prompt, language, duration: Math.min(duration1, duration2) };
            const request2 = { prompt, language, duration: Math.max(duration1, duration2) };

            const estimate1 = await aiService.estimateScriptGenerationCost(request1);
            const estimate2 = await aiService.estimateScriptGenerationCost(request2);

            // Longer duration should require more output tokens and higher cost
            expect(estimate2.breakdown.outputTokens).toBeGreaterThanOrEqual(estimate1.breakdown.outputTokens);
            expect(estimate2.awsCost).toBeGreaterThanOrEqual(estimate1.awsCost);
            expect(estimate2.creditsRequired).toBeGreaterThanOrEqual(estimate1.creditsRequired);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate contextually appropriate scripts', async () => {
      await fc.assert(
        fc.asyncProperty(scriptGenerationRequestArb, async (request) => {
          // Mock successful response
          const mockInputTokens = Math.ceil(request.prompt.length / 4);
          const mockOutputTokens = Math.ceil((request.duration || 60) * 2.5 * 1.3);
          const mockScript = `[Scene: Professional setting]\n\nNarrator: ${request.prompt.substring(0, 50)}...\n\n[End scene]`;

          const mockSend = vi.fn().mockResolvedValue(
            mockSuccessfulResponse(mockInputTokens, mockOutputTokens, mockScript)
          );

          const { BedrockRuntimeClient } = await import('@aws-sdk/client-bedrock-runtime');
          vi.mocked(BedrockRuntimeClient).mockImplementation(() => ({
            send: mockSend,
          }) as any);

          const result = await aiService.generateScript(request);

          // Property: Generated content should maintain consistency with input specifications
          expect(result.script).toBeTruthy();
          expect(typeof result.script).toBe('string');
          expect(result.script.length).toBeGreaterThan(0);

          // Metadata should reflect input parameters
          expect(result.metadata.language).toBe(request.language);
          expect(result.metadata.style).toBe(request.style || 'professional');

          // Usage tracking should be consistent
          expect(result.usage.inputTokens).toBe(mockInputTokens);
          expect(result.usage.outputTokens).toBe(mockOutputTokens);
          expect(result.usage.totalTokens).toBe(mockInputTokens + mockOutputTokens);

          // Cost calculation should be consistent
          expect(result.cost.awsCost).toBeGreaterThan(0);
          expect(result.cost.creditsRequired).toBeGreaterThan(0);

          // Word count should be reasonable for the generated content
          expect(result.metadata.wordCount).toBeGreaterThan(0);
          expect(result.metadata.estimatedDuration).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle language consistency across requests', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 20, maxLength: 100 }),
          fc.constantFrom('en', 'es', 'fr', 'de', 'it'),
          async (prompt, language) => {
            const request = { prompt, language };

            // Mock response with language-appropriate content
            const mockScript = language === 'es' ? 'Guión en español' : 
                              language === 'fr' ? 'Script en français' :
                              language === 'de' ? 'Skript auf Deutsch' :
                              language === 'it' ? 'Sceneggiatura in italiano' :
                              'Script in English';

            const mockSend = vi.fn().mockResolvedValue(
              mockSuccessfulResponse(50, 100, mockScript)
            );

            const { BedrockRuntimeClient } = await import('@aws-sdk/client-bedrock-runtime');
            vi.mocked(BedrockRuntimeClient).mockImplementation(() => ({
              send: mockSend,
            }) as any);

            const result = await aiService.generateScript(request);

            // Property: Language specification should be preserved throughout the process
            expect(result.metadata.language).toBe(language);
            
            // The system prompt should contain the specified language
            const callArgs = mockSend.mock.calls[0][0];
            expect(callArgs.body).toContain(language);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain cost calculation consistency', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 10, max: 1000 }),
          fc.integer({ min: 50, max: 2000 }),
          async (inputTokens, outputTokens) => {
            // Property: Cost calculation should be mathematically consistent
            const usage = { inputTokens, outputTokens };
            const cost = (aiService as any).calculateActualCost(usage);

            // Expected cost calculation
            const expectedInputCost = (inputTokens / 1000) * 0.00125;
            const expectedOutputCost = (outputTokens / 1000) * 0.00375;
            const expectedTotalCost = expectedInputCost + expectedOutputCost;

            expect(Math.abs(cost.awsCost - expectedTotalCost)).toBeLessThan(0.000001);
            expect(cost.awsCost).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should extract metadata consistently', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 1000 }),
          fc.constantFrom('en', 'es', 'fr'),
          fc.option(fc.constantFrom('casual', 'professional', 'creative', 'educational'), { nil: undefined }),
          async (script, language, style) => {
            const request = { prompt: 'test', language, style };
            
            // Property: Metadata extraction should be deterministic and accurate
            const metadata1 = (aiService as any).extractScriptMetadata(script, request);
            const metadata2 = (aiService as any).extractScriptMetadata(script, request);

            // Should be identical
            expect(metadata1).toEqual(metadata2);

            // Word count should match actual words
            const actualWordCount = script.split(/\s+/).filter(word => word.length > 0).length;
            expect(metadata1.wordCount).toBe(actualWordCount);

            // Duration should be reasonable (2.5 words per second average)
            const expectedDuration = Math.ceil(actualWordCount / 2.5);
            expect(metadata1.estimatedDuration).toBe(expectedDuration);

            // Language and style should match input
            expect(metadata1.language).toBe(language);
            expect(metadata1.style).toBe(style || 'professional');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle error conditions consistently', async () => {
      await fc.assert(
        fc.asyncProperty(
          scriptGenerationRequestArb,
          fc.constantFrom('throttling', 'validation', 'credentials', 'unknown'),
          async (request, errorType) => {
            // Mock different types of errors
            const errorMessages = {
              throttling: 'ThrottlingException: Rate exceeded',
              validation: 'ValidationException: Invalid input',
              credentials: 'UnauthorizedException: Invalid credentials',
              unknown: 'InternalServerError: Something went wrong',
            };

            const mockSend = vi.fn().mockRejectedValue(new Error(errorMessages[errorType]));
            const { BedrockRuntimeClient } = await import('@aws-sdk/client-bedrock-runtime');
            vi.mocked(BedrockRuntimeClient).mockImplementation(() => ({
              send: mockSend,
            }) as any);

            // Property: Error handling should be consistent and user-friendly
            try {
              await aiService.generateScript(request);
              expect.fail('Should have thrown an error');
            } catch (error) {
              expect(error).toBeInstanceOf(Error);
              
              const errorMessage = (error as Error).message;
              
              // Should provide user-friendly error messages
              if (errorType === 'throttling') {
                expect(errorMessage).toContain('Service temporarily unavailable');
              } else if (errorType === 'validation') {
                expect(errorMessage).toContain('Invalid request parameters');
              } else if (errorType === 'credentials') {
                expect(errorMessage).toContain('Authentication failed');
              } else {
                expect(errorMessage).toContain('Script generation failed');
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});