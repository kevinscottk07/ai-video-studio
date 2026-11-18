# AWS Bedrock Integration for AI Video Studio

## Overview

This document describes the AWS Bedrock integration implemented for the AI Video Studio platform. The integration provides AI-powered script generation with multi-language support, cost tracking, and credit-based billing.

## Features Implemented

### 1. Script Generation Service (`aiService.ts`)

- **Multi-language Support**: Supports 12 languages (English, Spanish, French, German, Italian, Portuguese, Japanese, Korean, Chinese, Arabic, Hindi, Russian)
- **Style Variations**: Professional, casual, creative, and educational styles
- **Duration-based Generation**: Customizable script length based on target video duration
- **Cost Estimation**: Pre-generation cost estimation for user transparency
- **Usage Tracking**: Detailed token usage and cost tracking for billing

### 2. Cost Management Integration

- **Real-time Cost Calculation**: Calculates AWS costs based on actual token usage
- **Credit System Integration**: Converts AWS costs to platform credits with configurable profit margins
- **Cost Estimation**: Provides accurate cost estimates before generation
- **Refund Handling**: Automatic credit refunds for failed operations

### 3. API Endpoints (`/api/v1/ai/`)

#### `POST /script/estimate`
Estimates the cost of script generation before execution.

**Request Body:**
```json
{
  "prompt": "Create a video script about renewable energy",
  "language": "en",
  "style": "professional",
  "duration": 60,
  "targetAudience": "tech professionals"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "estimate": {
      "creditsRequired": 10,
      "awsCost": 0.025,
      "breakdown": {
        "inputTokens": 50,
        "outputTokens": 200,
        "estimatedInputCost": 0.0625,
        "estimatedOutputCost": 0.75
      }
    },
    "userBalance": {
      "current": 100,
      "pending": 0,
      "reserved": 5,
      "lifetime": 500
    },
    "canProceed": true
  }
}
```

#### `POST /script/generate`
Generates a script using AWS Bedrock with automatic credit management.

**Request Body:** Same as estimate endpoint

**Response:**
```json
{
  "success": true,
  "data": {
    "script": "[Scene: Modern office setting]\n\nNarrator: In today's rapidly evolving world...",
    "metadata": {
      "wordCount": 150,
      "estimatedDuration": 60,
      "language": "en",
      "style": "professional"
    },
    "usage": {
      "creditsUsed": 8,
      "awsCost": 0.02,
      "tokens": {
        "inputTokens": 45,
        "outputTokens": 180,
        "totalTokens": 225
      }
    },
    "operationId": "script_1703123456789_abc123def"
  }
}
```

#### `GET /health`
Health check for AI services.

#### `GET /supported-languages`
Returns list of supported languages for script generation.

## Configuration

### Environment Variables

Add the following to your `.env` file:

```bash
# AWS Configuration
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"

# AWS Bedrock Configuration
BEDROCK_TEXT_MODEL="anthropic.claude-3-sonnet-20240229-v1:0"
BEDROCK_IMAGE_MODEL="stability.stable-diffusion-xl-v1"
BEDROCK_VIDEO_MODEL="stability.stable-video-diffusion-img2vid-v1"
BEDROCK_MAX_TOKENS=4096
BEDROCK_TEMPERATURE=0.7
BEDROCK_TIMEOUT=60000

# AWS Cost Tracking
ENABLE_COST_TRACKING=true
BEDROCK_INPUT_TOKEN_COST=0.00125
BEDROCK_OUTPUT_TOKEN_COST=0.00375
PLATFORM_PROFIT_MARGIN=2.0
```

### AWS Setup Requirements

1. **AWS Account**: Ensure you have an AWS account with Bedrock access
2. **IAM Permissions**: Create an IAM user with the following permissions:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "bedrock:InvokeModel",
           "bedrock:ListFoundationModels"
         ],
         "Resource": "*"
       }
     ]
   }
   ```
3. **Model Access**: Request access to Claude 3 Sonnet in AWS Bedrock console
4. **Region**: Ensure Bedrock is available in your selected region

## Security Features

### 1. Credential Management
- Uses AWS SDK with secure credential handling
- Supports IAM roles, environment variables, and AWS credential files
- Session tokens supported for temporary credentials

### 2. Input Validation
- Comprehensive request validation using express-validator
- Prompt length limits (10-2000 characters)
- Language code validation
- Duration limits (15-600 seconds)

### 3. Error Handling
- Graceful error handling with user-friendly messages
- Automatic retry logic for transient failures
- Circuit breaker pattern for service availability

### 4. Rate Limiting
- Built-in rate limiting to prevent abuse
- Cost-based throttling to control expenses
- User-specific quotas based on subscription tier

## Cost Management

### 1. Pricing Model
- **Input Tokens**: $0.00125 per 1K tokens
- **Output Tokens**: $0.00375 per 1K tokens
- **Platform Markup**: Configurable (default 200%)
- **Credit Value**: $0.05 per credit

### 2. Cost Optimization
- Accurate token estimation before generation
- Real-time cost tracking and adjustment
- Automatic refunds for failed operations
- Usage analytics for cost monitoring

### 3. Credit System Integration
- Upfront credit deduction with refund on failure
- Cost adjustments based on actual vs estimated usage
- Detailed transaction history
- Balance checks before operations

## Testing

### Unit Tests
- Comprehensive test coverage for all service methods
- Mock AWS SDK for isolated testing
- Error scenario testing
- Cost calculation validation

### Property-Based Tests
- **Property 5: AI Content Generation Consistency**
- Validates universal correctness properties
- Tests with 100+ iterations per property
- Covers edge cases and boundary conditions

### Integration Tests
- End-to-end API testing
- AWS service integration validation
- Credit system integration testing
- Error handling verification

## Monitoring and Logging

### 1. Structured Logging
- Request/response logging with correlation IDs
- Performance metrics (response times, token usage)
- Error tracking with stack traces
- Cost tracking and billing events

### 2. Health Monitoring
- Service health checks with AWS connectivity tests
- Performance monitoring with response time tracking
- Error rate monitoring and alerting
- Cost threshold monitoring

### 3. Analytics
- Usage patterns and popular languages
- Cost trends and optimization opportunities
- User behavior analytics
- Performance bottleneck identification

## Usage Examples

### Basic Script Generation
```typescript
import { aiService } from './services/aiService';

const request = {
  prompt: 'Create a video script about sustainable technology',
  language: 'en',
  style: 'professional',
  duration: 90
};

// Estimate cost first
const estimate = await aiService.estimateScriptGenerationCost(request);
console.log(`Estimated cost: ${estimate.creditsRequired} credits`);

// Generate script
const result = await aiService.generateScript(request);
console.log(`Generated script: ${result.script}`);
console.log(`Actual cost: ${result.cost.creditsRequired} credits`);
```

### Multi-language Support
```typescript
const languages = ['en', 'es', 'fr', 'de'];
const prompt = 'Create a marketing video script for our new product';

for (const language of languages) {
  const result = await aiService.generateScript({
    prompt,
    language,
    style: 'creative',
    duration: 60
  });
  
  console.log(`${language}: ${result.script.substring(0, 100)}...`);
}
```

## Future Enhancements

### 1. Additional AI Services
- Image generation integration
- Video generation pipeline
- Music and audio generation
- Content moderation

### 2. Advanced Features
- Script templates and presets
- Collaborative editing
- Version control for scripts
- A/B testing for different styles

### 3. Performance Optimizations
- Response caching for similar requests
- Batch processing for multiple scripts
- Streaming responses for long content
- Edge computing for reduced latency

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify AWS credentials are correctly configured
   - Check IAM permissions for Bedrock access
   - Ensure region supports Bedrock services

2. **Model Access Errors**
   - Request access to Claude 3 models in AWS console
   - Verify model IDs are correct for your region
   - Check service quotas and limits

3. **Cost Calculation Issues**
   - Verify cost tracking configuration
   - Check token counting accuracy
   - Monitor for pricing changes

4. **Performance Issues**
   - Monitor response times and optimize prompts
   - Implement caching for repeated requests
   - Consider regional deployment for better latency

### Support

For technical support or questions about the AWS Bedrock integration:

1. Check the logs for detailed error messages
2. Verify AWS service status and quotas
3. Review configuration and environment variables
4. Contact the development team with specific error details

## Compliance and Privacy

- **Data Privacy**: User prompts and generated content are processed securely
- **GDPR Compliance**: Data retention and deletion policies implemented
- **Content Moderation**: Built-in content filtering and safety measures
- **Audit Trail**: Complete logging of all AI operations for compliance