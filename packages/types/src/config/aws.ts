export interface AWSConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

export interface S3Config extends AWSConfig {
  bucket: string;
  publicBucket?: string;
  cdnDomain?: string;
  uploadTimeout: number;
  maxFileSize: number;
  allowedMimeTypes: string[];
}

export interface BedrockConfig extends AWSConfig {
  models: {
    textGeneration: string;
    imageGeneration: string;
    videoGeneration: string;
  };
  maxTokens: number;
  temperature: number;
  timeout: number;
}

export interface SageMakerConfig extends AWSConfig {
  endpoints: {
    videoGeneration: string;
    audioGeneration: string;
    imageProcessing: string;
  };
  timeout: number;
  maxConcurrentRequests: number;
}

export interface LambdaConfig extends AWSConfig {
  functions: {
    videoProcessor: string;
    imageProcessor: string;
    audioProcessor: string;
    contentModerator: string;
  };
  timeout: number;
  memorySize: number;
}

export interface CloudFrontConfig {
  distributionId: string;
  domain: string;
  cacheTtl: number;
  signedUrlExpiration: number;
}

export interface CostTrackingConfig {
  enabled: boolean;
  services: {
    bedrock: {
      inputTokenCost: number; // per 1K tokens
      outputTokenCost: number; // per 1K tokens
    };
    sagemaker: {
      inferenceInstanceCost: number; // per hour
      endpointCost: number; // per hour
    };
    s3: {
      storageCost: number; // per GB per month
      requestCost: number; // per 1K requests
    };
    lambda: {
      requestCost: number; // per 1M requests
      durationCost: number; // per GB-second
    };
  };
}