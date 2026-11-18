import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { getBedrockConfig } from '@ai-video-studio/config';
import { logger } from '../utils/logger.js';

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

class TranslationService {
  private bedrockClient: BedrockRuntimeClient;
  private config: ReturnType<typeof getBedrockConfig>;

  constructor() {
    this.config = getBedrockConfig();
    
    this.bedrockClient = new BedrockRuntimeClient({
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
        sessionToken: this.config.sessionToken,
      },
    });

    logger.info('Translation Service initialized', {
      region: this.config.region,
      model: this.config.models.textGeneration,
    });
  }

  /**
   * Translate text from one language to another with context awareness
   */
  async translateText(request: TranslationRequest): Promise<TranslationResponse> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting text translation', {
        sourceLanguage: request.sourceLanguage,
        targetLanguage: request.targetLanguage,
        context: request.context,
        textLength: request.text.length,
      });

      const systemPrompt = this.buildTranslationPrompt(request);

      const payload = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: Math.min(4000, request.text.length * 2), // Reasonable limit based on input
        temperature: 0.3, // Lower temperature for more consistent translations
        messages: [
          {
            role: "user",
            content: systemPrompt
          }
        ]
      };

      const command = new InvokeModelCommand({
        modelId: this.config.models.textGeneration,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(payload),
      });

      const response = await this.bedrockClient.send(command);
      
      if (!response.body) {
        throw new Error('No response body from Bedrock');
      }

      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const translationResult = responseBody.content[0].text;

      // Parse the structured response
      const parsedResult = this.parseTranslationResponse(translationResult, request);

      const duration = Date.now() - startTime;
      
      logger.info('Text translation completed', {
        duration: `${duration}ms`,
        sourceLanguage: request.sourceLanguage,
        targetLanguage: request.targetLanguage,
        originalLength: request.text.length,
        translatedLength: parsedResult.translatedText.length,
      });

      return parsedResult;

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Text translation failed', {
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : error,
        sourceLanguage: request.sourceLanguage,
        targetLanguage: request.targetLanguage,
      });

      throw new Error('Translation failed. Please try again.');
    }
  }

  /**
   * Optimize prompts for specific languages and cultural contexts
   */
  async optimizePromptForLanguage(request: PromptOptimizationRequest): Promise<PromptOptimizationResponse> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting prompt optimization', {
        targetLanguage: request.targetLanguage,
        videoStyle: request.videoStyle,
        promptLength: request.prompt.length,
      });

      const systemPrompt = this.buildPromptOptimizationPrompt(request);

      const payload = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 2000,
        temperature: 0.4, // Slightly higher for creative optimization
        messages: [
          {
            role: "user",
            content: systemPrompt
          }
        ]
      };

      const command = new InvokeModelCommand({
        modelId: this.config.models.textGeneration,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(payload),
      });

      const response = await this.bedrockClient.send(command);
      
      if (!response.body) {
        throw new Error('No response body from Bedrock');
      }

      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const optimizationResult = responseBody.content[0].text;

      // Parse the structured response
      const parsedResult = this.parseOptimizationResponse(optimizationResult);

      const duration = Date.now() - startTime;
      
      logger.info('Prompt optimization completed', {
        duration: `${duration}ms`,
        targetLanguage: request.targetLanguage,
        adaptationsCount: parsedResult.culturalAdaptations.length,
        suggestionsCount: parsedResult.suggestions.length,
      });

      return parsedResult;

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Prompt optimization failed', {
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : error,
        targetLanguage: request.targetLanguage,
      });

      throw new Error('Prompt optimization failed. Please try again.');
    }
  }

  /**
   * Build translation prompt with context
   */
  private buildTranslationPrompt(request: TranslationRequest): string {
    const { text, sourceLanguage, targetLanguage, context } = request;
    
    let contextInstructions = '';
    switch (context) {
      case 'video_script':
        contextInstructions = `
- Maintain the dramatic timing and flow suitable for video content
- Preserve scene descriptions and visual cues
- Keep speaker notes and direction cues intact
- Ensure the translation works well for voice-over or on-screen text`;
        break;
      case 'ui_text':
        contextInstructions = `
- Keep translations concise and user-friendly
- Maintain consistency with common UI terminology
- Ensure text fits well in interface elements
- Use familiar terms that users expect in software`;
        break;
      case 'marketing':
        contextInstructions = `
- Maintain persuasive tone and emotional impact
- Adapt cultural references appropriately
- Keep calls-to-action compelling and clear
- Ensure brand voice consistency`;
        break;
      case 'technical':
        contextInstructions = `
- Preserve technical accuracy and terminology
- Maintain precise instructions and specifications
- Keep technical terms consistent
- Ensure clarity for technical audiences`;
        break;
      default:
        contextInstructions = `
- Maintain the original tone and style
- Preserve the intended meaning and context
- Keep the text natural and fluent`;
    }

    return `You are a professional translator specializing in ${context || 'general'} content. Translate the following text from ${sourceLanguage} to ${targetLanguage}.

TRANSLATION REQUIREMENTS:
- Provide accurate, natural, and fluent translation
- Maintain the original meaning and intent
- Adapt cultural references appropriately for the target audience
- Preserve formatting and structure${contextInstructions}

SOURCE TEXT (${sourceLanguage}):
"${text}"

RESPONSE FORMAT:
Provide your response in the following JSON format:
{
  "translatedText": "your translation here",
  "confidence": 0.95,
  "detectedSourceLanguage": "${sourceLanguage}",
  "culturalAdaptations": ["list any cultural adaptations made"],
  "notes": "any additional notes about the translation"
}

Translate the text now:`;
  }

  /**
   * Build prompt optimization prompt
   */
  private buildPromptOptimizationPrompt(request: PromptOptimizationRequest): string {
    const { prompt, targetLanguage, videoStyle, culturalContext } = request;
    
    return `You are an expert in cross-cultural content creation and video production. Optimize the following video generation prompt for ${targetLanguage} audience and cultural context.

ORIGINAL PROMPT:
"${prompt}"

TARGET LANGUAGE: ${targetLanguage}
VIDEO STYLE: ${videoStyle}
${culturalContext ? `CULTURAL CONTEXT: ${culturalContext}` : ''}

OPTIMIZATION REQUIREMENTS:
- Adapt cultural references, colors, symbols, and imagery for ${targetLanguage} audience
- Ensure visual elements are culturally appropriate and appealing
- Modify any text, signage, or written elements to be in ${targetLanguage}
- Consider cultural preferences for ${videoStyle} style content
- Maintain the core creative intent while making it culturally relevant
- Suggest improvements for better engagement with ${targetLanguage} audience

RESPONSE FORMAT:
Provide your response in the following JSON format:
{
  "optimizedPrompt": "culturally adapted prompt here",
  "culturalAdaptations": [
    "list of specific cultural adaptations made",
    "explanation of why each adaptation was necessary"
  ],
  "suggestions": [
    "additional suggestions for better cultural fit",
    "recommendations for visual elements",
    "tips for ${targetLanguage} audience engagement"
  ]
}

Optimize the prompt now:`;
  }

  /**
   * Parse translation response from AI
   */
  private parseTranslationResponse(response: string, request: TranslationRequest): TranslationResponse {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // Fallback: treat entire response as translation
        return {
          translatedText: response.trim(),
          sourceLanguage: request.sourceLanguage,
          targetLanguage: request.targetLanguage,
          confidence: 0.8,
          metadata: {
            wordCount: response.trim().split(/\s+/).length,
            characterCount: response.trim().length,
          },
        };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        translatedText: parsed.translatedText || response.trim(),
        sourceLanguage: request.sourceLanguage,
        targetLanguage: request.targetLanguage,
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.8)),
        metadata: {
          wordCount: (parsed.translatedText || response.trim()).split(/\s+/).length,
          characterCount: (parsed.translatedText || response.trim()).length,
          detectedSourceLanguage: parsed.detectedSourceLanguage,
        },
      };
    } catch (error) {
      logger.error('Failed to parse translation response', {
        response: response.substring(0, 500),
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Fallback to simple response
      return {
        translatedText: response.trim(),
        sourceLanguage: request.sourceLanguage,
        targetLanguage: request.targetLanguage,
        confidence: 0.7,
        metadata: {
          wordCount: response.trim().split(/\s+/).length,
          characterCount: response.trim().length,
        },
      };
    }
  }

  /**
   * Parse optimization response from AI
   */
  private parseOptimizationResponse(response: string): PromptOptimizationResponse {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        optimizedPrompt: parsed.optimizedPrompt || response.trim(),
        culturalAdaptations: Array.isArray(parsed.culturalAdaptations) ? parsed.culturalAdaptations : [],
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      };
    } catch (error) {
      logger.error('Failed to parse optimization response', {
        response: response.substring(0, 500),
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Fallback to simple response
      return {
        optimizedPrompt: response.trim(),
        culturalAdaptations: [],
        suggestions: [],
      };
    }
  }

  /**
   * Health check for translation service
   */
  async healthCheck(): Promise<{ status: 'ok' | 'error'; details: any }> {
    try {
      // Simple test translation
      const testResult = await this.translateText({
        text: 'Hello, world!',
        sourceLanguage: 'English',
        targetLanguage: 'Spanish',
        context: 'ui_text',
      });

      return {
        status: 'ok',
        details: {
          region: this.config.region,
          model: this.config.models.textGeneration,
          testTranslation: testResult.translatedText,
        },
      };
    } catch (error) {
      logger.error('Translation service health check failed:', error);
      return {
        status: 'error',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          region: this.config.region,
          model: this.config.models.textGeneration,
        },
      };
    }
  }
}

export const translationService = new TranslationService();