import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { getBedrockConfig, getCostTrackingConfig } from '@ai-video-studio/config';
import { logger } from '../utils/logger.js';
import { creditService } from './creditService.js';

export interface ScriptGenerationRequest {
  prompt: string;
  language: string;
  style?: 'casual' | 'professional' | 'creative' | 'educational';
  duration?: number; // in seconds
  targetAudience?: string;
}

export interface ScriptGenerationResponse {
  script: string;
  metadata: {
    wordCount: number;
    estimatedDuration: number;
    language: string;
    style: string;
  };
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  cost: {
    awsCost: number;
    creditsRequired: number;
  };
}

export interface CostEstimate {
  awsCost: number;
  creditsRequired: number;
  breakdown: {
    inputTokens: number;
    outputTokens: number;
    estimatedInputCost: number;
    estimatedOutputCost: number;
  };
}

export interface ContentModerationRequest {
  text?: string;
  imageUrls?: string[];
  videoUrl?: string;
  metadata?: any;
}

export interface ContentModerationResponse {
  isAppropriate: boolean;
  confidence: number;
  flags: {
    inappropriate?: boolean;
    spam?: boolean;
    harassment?: boolean;
    violence?: boolean;
    hateSpeech?: boolean;
    nudity?: boolean;
    misinformation?: boolean;
  };
  suggestedAction: string;
  reasoning?: string;
  categories: {
    category: string;
    confidence: number;
  }[];
}

class AIService {
  private bedrockClient: BedrockRuntimeClient;
  private config: ReturnType<typeof getBedrockConfig>;
  private costConfig: ReturnType<typeof getCostTrackingConfig>;

  constructor() {
    this.config = getBedrockConfig();
    this.costConfig = getCostTrackingConfig();
    
    this.bedrockClient = new BedrockRuntimeClient({
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
        sessionToken: this.config.sessionToken,
      },
    });

    logger.info('AI Service initialized', {
      region: this.config.region,
      textModel: this.config.models.textGeneration,
      costTrackingEnabled: this.costConfig.enabled,
    });
  }

  /**
   * Estimate the cost of script generation before execution
   */
  async estimateScriptGenerationCost(request: ScriptGenerationRequest): Promise<CostEstimate> {
    try {
      // Estimate input tokens based on prompt length
      const estimatedInputTokens = Math.ceil(request.prompt.length / 4); // Rough approximation: 4 chars per token
      
      // Estimate output tokens based on duration or default
      const targetDuration = request.duration || 60; // Default 60 seconds
      const wordsPerSecond = 2.5; // Average speaking rate
      const tokensPerWord = 1.3; // Average tokens per word
      const estimatedOutputTokens = Math.ceil(targetDuration * wordsPerSecond * tokensPerWord);

      const inputCost = (estimatedInputTokens / 1000) * this.costConfig.services.bedrock.inputTokenCost;
      const outputCost = (estimatedOutputTokens / 1000) * this.costConfig.services.bedrock.outputTokenCost;
      const awsCost = inputCost + outputCost;

      // Calculate credits required (AWS cost + platform profit margin)
      const creditsRequired = creditService.calculateCreditsFromCost(awsCost);

      return {
        awsCost,
        creditsRequired,
        breakdown: {
          inputTokens: estimatedInputTokens,
          outputTokens: estimatedOutputTokens,
          estimatedInputCost: inputCost,
          estimatedOutputCost: outputCost,
        },
      };
    } catch (error) {
      logger.error('Error estimating script generation cost:', error);
      throw new Error('Failed to estimate cost');
    }
  }

  /**
   * Generate a script using AWS Bedrock
   */
  async generateScript(request: ScriptGenerationRequest): Promise<ScriptGenerationResponse> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting script generation', {
        language: request.language,
        style: request.style,
        duration: request.duration,
        promptLength: request.prompt.length,
      });

      // Build the prompt with context and instructions
      const systemPrompt = this.buildSystemPrompt(request);
      const userPrompt = this.buildUserPrompt(request);

      // Prepare the request payload for Claude
      const payload = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        messages: [
          {
            role: "user",
            content: `${systemPrompt}\n\n${userPrompt}`
          }
        ]
      };

      // Invoke Bedrock model
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

      // Parse the response
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const generatedScript = responseBody.content[0].text;

      // Calculate actual usage and cost
      const usage = {
        inputTokens: responseBody.usage?.input_tokens || 0,
        outputTokens: responseBody.usage?.output_tokens || 0,
        totalTokens: (responseBody.usage?.input_tokens || 0) + (responseBody.usage?.output_tokens || 0),
      };

      const actualCost = this.calculateActualCost(usage);
      const creditsRequired = creditService.calculateCreditsFromCost(actualCost.awsCost);

      // Extract metadata from the generated script
      const metadata = this.extractScriptMetadata(generatedScript, request);

      const duration = Date.now() - startTime;
      
      logger.info('Script generation completed', {
        duration: `${duration}ms`,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        awsCost: actualCost.awsCost,
        creditsRequired,
        wordCount: metadata.wordCount,
      });

      return {
        script: generatedScript,
        metadata,
        usage,
        cost: {
          awsCost: actualCost.awsCost,
          creditsRequired,
        },
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Script generation failed', {
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : error,
        language: request.language,
        style: request.style,
      });

      if (error instanceof Error) {
        if (error.message.includes('throttling')) {
          throw new Error('Service temporarily unavailable due to high demand. Please try again in a moment.');
        }
        if (error.message.includes('validation')) {
          throw new Error('Invalid request parameters. Please check your input and try again.');
        }
        if (error.message.includes('credentials')) {
          throw new Error('Authentication failed. Please contact support.');
        }
      }

      throw new Error('Script generation failed. Please try again.');
    }
  }

  /**
   * Build system prompt with context and instructions
   */
  private buildSystemPrompt(request: ScriptGenerationRequest): string {
    const { language, style = 'professional', duration = 60, targetAudience } = request;
    
    let systemPrompt = `You are an expert scriptwriter creating video scripts. Generate a high-quality script in ${language} with the following requirements:

STYLE: ${style}
DURATION: Approximately ${duration} seconds (aim for ${Math.ceil(duration * 2.5)} words)
LANGUAGE: ${language}`;

    if (targetAudience) {
      systemPrompt += `\nTARGET AUDIENCE: ${targetAudience}`;
    }

    systemPrompt += `

REQUIREMENTS:
- Write in natural, conversational ${language}
- Include clear scene descriptions and visual cues
- Structure with proper pacing for video content
- Make it engaging and suitable for the ${style} style
- Include speaker notes or direction cues where appropriate
- Ensure the content is appropriate and professional

FORMAT:
Return the script in a clear, structured format with:
- Scene descriptions in [brackets]
- Speaker dialogue clearly marked
- Visual cues and directions included
- Natural flow and pacing`;

    return systemPrompt;
  }

  /**
   * Build user prompt with the specific request
   */
  private buildUserPrompt(request: ScriptGenerationRequest): string {
    return `Create a video script based on this prompt: "${request.prompt}"

Please generate a complete, ready-to-use script that follows all the requirements specified above.`;
  }

  /**
   * Calculate actual cost based on token usage
   */
  private calculateActualCost(usage: { inputTokens: number; outputTokens: number }): { awsCost: number } {
    const inputCost = (usage.inputTokens / 1000) * this.costConfig.services.bedrock.inputTokenCost;
    const outputCost = (usage.outputTokens / 1000) * this.costConfig.services.bedrock.outputTokenCost;
    
    return {
      awsCost: inputCost + outputCost,
    };
  }

  /**
   * Extract metadata from generated script
   */
  private extractScriptMetadata(script: string, request: ScriptGenerationRequest) {
    const wordCount = script.split(/\s+/).filter(word => word.length > 0).length;
    const estimatedDuration = Math.ceil(wordCount / 2.5); // 2.5 words per second average speaking rate
    
    return {
      wordCount,
      estimatedDuration,
      language: request.language,
      style: request.style || 'professional',
    };
  }

  /**
   * Analyze content for moderation using AWS Bedrock
   */
  async analyzeContentForModeration(request: ContentModerationRequest): Promise<ContentModerationResponse> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting content moderation analysis', {
        hasText: !!request.text,
        hasImages: !!(request.imageUrls && request.imageUrls.length > 0),
        hasVideo: !!request.videoUrl,
      });

      // Build moderation prompt
      const moderationPrompt = this.buildModerationPrompt(request);

      // Prepare the request payload for Claude
      const payload = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 1000,
        temperature: 0.1, // Low temperature for consistent moderation
        messages: [
          {
            role: "user",
            content: moderationPrompt
          }
        ]
      };

      // Invoke Bedrock model
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

      // Parse the response
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const analysisResult = responseBody.content[0].text;

      // Parse the structured response
      const moderationResult = this.parseModerationResponse(analysisResult);

      const duration = Date.now() - startTime;
      
      logger.info('Content moderation analysis completed', {
        duration: `${duration}ms`,
        isAppropriate: moderationResult.isAppropriate,
        confidence: moderationResult.confidence,
        flagsDetected: Object.keys(moderationResult.flags).filter(key => moderationResult.flags[key]).length,
      });

      return moderationResult;

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Content moderation analysis failed', {
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : error,
      });

      // Return safe default on error
      return {
        isAppropriate: true,
        confidence: 0,
        flags: {},
        suggestedAction: 'no_action',
        reasoning: 'Analysis failed - defaulting to safe',
        categories: [],
      };
    }
  }

  /**
   * Build moderation prompt for content analysis
   */
  private buildModerationPrompt(request: ContentModerationRequest): string {
    let prompt = `You are a content moderation AI assistant. Analyze the following content for policy violations and inappropriate material.

CONTENT TO ANALYZE:`;

    if (request.text) {
      prompt += `\n\nTEXT CONTENT:\n"${request.text}"`;
    }

    if (request.imageUrls && request.imageUrls.length > 0) {
      prompt += `\n\nIMAGE URLS:\n${request.imageUrls.join('\n')}`;
    }

    if (request.videoUrl) {
      prompt += `\n\nVIDEO URL:\n${request.videoUrl}`;
    }

    if (request.metadata) {
      prompt += `\n\nMETADATA:\n${JSON.stringify(request.metadata, null, 2)}`;
    }

    prompt += `

ANALYSIS CRITERIA:
- Inappropriate content (sexual, violent, disturbing)
- Spam or promotional content
- Harassment or bullying
- Violence or threats
- Hate speech or discrimination
- Nudity or sexual content
- Misinformation or false claims

RESPONSE FORMAT:
Provide your analysis in the following JSON format:
{
  "isAppropriate": boolean,
  "confidence": number (0.0 to 1.0),
  "flags": {
    "inappropriate": boolean,
    "spam": boolean,
    "harassment": boolean,
    "violence": boolean,
    "hateSpeech": boolean,
    "nudity": boolean,
    "misinformation": boolean
  },
  "suggestedAction": "no_action" | "warning" | "remove" | "suspend" | "ban",
  "reasoning": "Brief explanation of the decision",
  "categories": [
    {
      "category": "category name",
      "confidence": number (0.0 to 1.0)
    }
  ]
}

Analyze the content carefully and provide a thorough assessment. Be conservative in your analysis - when in doubt, flag for human review.`;

    return prompt;
  }

  /**
   * Parse the moderation response from AI
   */
  private parseModerationResponse(response: string): ContentModerationResponse {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate and normalize the response
      return {
        isAppropriate: parsed.isAppropriate !== false, // Default to true if not specified
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0)),
        flags: {
          inappropriate: parsed.flags?.inappropriate || false,
          spam: parsed.flags?.spam || false,
          harassment: parsed.flags?.harassment || false,
          violence: parsed.flags?.violence || false,
          hateSpeech: parsed.flags?.hateSpeech || false,
          nudity: parsed.flags?.nudity || false,
          misinformation: parsed.flags?.misinformation || false,
        },
        suggestedAction: parsed.suggestedAction || 'no_action',
        reasoning: parsed.reasoning || 'No specific reasoning provided',
        categories: Array.isArray(parsed.categories) ? parsed.categories : [],
      };
    } catch (error) {
      logger.error('Failed to parse moderation response', {
        response: response.substring(0, 500),
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Return safe default
      return {
        isAppropriate: true,
        confidence: 0,
        flags: {},
        suggestedAction: 'no_action',
        reasoning: 'Failed to parse AI response - defaulting to safe',
        categories: [],
      };
    }
  }
  async healthCheck(): Promise<{ status: 'ok' | 'error'; details: any }> {
    try {
      // Simple test to verify Bedrock connectivity
      const testPayload = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 10,
        temperature: 0.1,
        messages: [
          {
            role: "user",
            content: "Say 'OK' if you can hear me."
          }
        ]
      };

      const command = new InvokeModelCommand({
        modelId: this.config.models.textGeneration,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(testPayload),
      });

      const response = await this.bedrockClient.send(command);
      
      return {
        status: 'ok',
        details: {
          region: this.config.region,
          model: this.config.models.textGeneration,
          responseReceived: !!response.body,
        },
      };
    } catch (error) {
      logger.error('AI service health check failed:', error);
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

export const aiService = new AIService();