// Copied from @ai-video-studio/config for standalone deployment

export interface S3Config {
  region: string;
  bucket: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export interface BedrockConfig {
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  models: {
    textGeneration: string;
    imageGeneration: string;
    videoGeneration: string;
  };
}

export interface SageMakerConfig {
  region: string;
  endpoints: {
    videoGeneration: string;
    imageGeneration: string;
  };
}

export interface CostTrackingConfig {
  enabled: boolean;
  creditCostPerToken: number;
  creditCostPerSecond: number;
}

export function getS3Config(): S3Config {
  return {
    region: process.env.AWS_REGION || 'us-east-1',
    bucket: process.env.S3_BUCKET_NAME || 'ai-video-studio-assets',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
}

export function getBedrockConfig(): BedrockConfig {
  return {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    models: {
      textGeneration: process.env.BEDROCK_TEXT_MODEL || 'anthropic.claude-3-sonnet-20240229-v1:0',
      imageGeneration: process.env.BEDROCK_IMAGE_MODEL || 'stability.stable-diffusion-xl-v1',
      videoGeneration: process.env.BEDROCK_VIDEO_MODEL || 'stability.stable-video-diffusion-img2vid-v1',
    },
  };
}

export function getSageMakerConfig(): SageMakerConfig {
  return {
    region: process.env.AWS_REGION || 'us-east-1',
    endpoints: {
      videoGeneration: process.env.SAGEMAKER_VIDEO_ENDPOINT || '',
      imageGeneration: process.env.SAGEMAKER_IMAGE_ENDPOINT || '',
    },
  };
}

export function getCostTrackingConfig(): CostTrackingConfig {
  return {
    enabled: process.env.COST_TRACKING_ENABLED === 'true',
    creditCostPerToken: parseFloat(process.env.CREDIT_COST_PER_TOKEN || '0.001'),
    creditCostPerSecond: parseFloat(process.env.CREDIT_COST_PER_SECOND || '0.1'),
  };
}