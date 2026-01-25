import { 
  AWSConfig, 
  S3Config, 
  BedrockConfig, 
  SageMakerConfig,
  CostTrackingConfig 
} from '@ai-video-studio/types';

export const getAWSConfig = (): AWSConfig => {
  return {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    sessionToken: process.env.AWS_SESSION_TOKEN,
  };
};

export const getS3Config = (): S3Config => {
  const baseConfig = getAWSConfig();
  
  return {
    ...baseConfig,
    bucket: process.env.AWS_S3_BUCKET || 'ai-video-studio-assets',
    publicBucket: process.env.AWS_S3_PUBLIC_BUCKET,
    cdnDomain: process.env.AWS_CLOUDFRONT_DOMAIN,
    uploadTimeout: parseInt(process.env.S3_UPLOAD_TIMEOUT || '300000'), // 5 minutes
    maxFileSize: parseInt(process.env.S3_MAX_FILE_SIZE || '524288000'), // 500MB
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'audio/mp3',
      'audio/wav',
      'audio/aac',
    ],
  };
};

export const getBedrockConfig = (): BedrockConfig => {
  const baseConfig = getAWSConfig();
  
  return {
    ...baseConfig,
    models: {
      textGeneration: process.env.BEDROCK_TEXT_MODEL || 'anthropic.claude-3-sonnet-20240229-v1:0',
      imageGeneration: process.env.BEDROCK_IMAGE_MODEL || 'stability.stable-diffusion-xl-v1',
      videoGeneration: process.env.BEDROCK_VIDEO_MODEL || 'stability.stable-video-diffusion-img2vid-v1',
    },
    maxTokens: parseInt(process.env.BEDROCK_MAX_TOKENS || '4096'),
    temperature: parseFloat(process.env.BEDROCK_TEMPERATURE || '0.7'),
    timeout: parseInt(process.env.BEDROCK_TIMEOUT || '60000'), // 1 minute
  };
};

export const getSageMakerConfig = (): SageMakerConfig => {
  const baseConfig = getAWSConfig();
  
  return {
    ...baseConfig,
    endpoints: {
      videoGeneration: process.env.SAGEMAKER_VIDEO_ENDPOINT || '',
      audioGeneration: process.env.SAGEMAKER_AUDIO_ENDPOINT || '',
      imageProcessing: process.env.SAGEMAKER_IMAGE_ENDPOINT || '',
    },
    timeout: parseInt(process.env.SAGEMAKER_TIMEOUT || '300000'), // 5 minutes
    maxConcurrentRequests: parseInt(process.env.SAGEMAKER_MAX_CONCURRENT || '10'),
  };
};

export const getCostTrackingConfig = (): CostTrackingConfig => {
  return {
    enabled: process.env.ENABLE_COST_TRACKING === 'true',
    services: {
      bedrock: {
        inputTokenCost: parseFloat(process.env.BEDROCK_INPUT_TOKEN_COST || '0.00125'), // per 1K tokens
        outputTokenCost: parseFloat(process.env.BEDROCK_OUTPUT_TOKEN_COST || '0.00375'), // per 1K tokens
      },
      sagemaker: {
        inferenceInstanceCost: parseFloat(process.env.SAGEMAKER_INFERENCE_COST || '0.50'), // per hour
        endpointCost: parseFloat(process.env.SAGEMAKER_ENDPOINT_COST || '0.048'), // per hour
      },
      s3: {
        storageCost: parseFloat(process.env.S3_STORAGE_COST || '0.023'), // per GB per month
        requestCost: parseFloat(process.env.S3_REQUEST_COST || '0.0004'), // per 1K requests
      },
      lambda: {
        requestCost: parseFloat(process.env.LAMBDA_REQUEST_COST || '0.20'), // per 1M requests
        durationCost: parseFloat(process.env.LAMBDA_DURATION_COST || '0.0000166667'), // per GB-second
      },
    },
  };
};