import { 
  VideoResolution, 
  VideoStyle, 
  OperationType, 
  CreditEstimate 
} from '@ai-video-studio/types';

// Base credit costs for different operations
const BASE_OPERATION_COSTS: Record<OperationType, number> = {
  [OperationType.SCRIPT_GENERATION]: 5,
  [OperationType.VIDEO_GENERATION]: 50,
  [OperationType.MUSIC_GENERATION]: 10,
  [OperationType.VOICEOVER_GENERATION]: 15,
  [OperationType.VIDEO_EDITING]: 25,
};

// Resolution multipliers
const RESOLUTION_MULTIPLIERS: Record<VideoResolution, number> = {
  [VideoResolution.STANDARD]: 1.0,
  [VideoResolution.HD]: 2.0,
  [VideoResolution.ULTRA]: 4.0,
};

// Style complexity multipliers
const STYLE_MULTIPLIERS: Record<VideoStyle, number> = {
  [VideoStyle.SOCIAL_MEDIA]: 1.0,
  [VideoStyle.ADVERTISEMENT]: 1.5,
  [VideoStyle.EDUCATIONAL]: 1.2,
  [VideoStyle.CINEMATIC]: 2.0,
  [VideoStyle.VR]: 3.0,
};

export const calculateCredits = (
  operationType: OperationType,
  parameters: {
    duration?: number; // in seconds
    resolution?: VideoResolution;
    style?: VideoStyle;
    complexity?: 'simple' | 'moderate' | 'complex';
  }
): CreditEstimate => {
  const baseCredits = BASE_OPERATION_COSTS[operationType];
  
  // Duration multiplier (for video operations)
  let durationMultiplier = 1.0;
  if (parameters.duration && operationType === OperationType.VIDEO_GENERATION) {
    // Base is 60 seconds, scale linearly
    durationMultiplier = Math.max(0.5, parameters.duration / 60);
  }
  
  // Resolution multiplier
  const resolutionMultiplier = parameters.resolution 
    ? RESOLUTION_MULTIPLIERS[parameters.resolution] 
    : 1.0;
  
  // Style complexity multiplier
  const styleMultiplier = parameters.style 
    ? STYLE_MULTIPLIERS[parameters.style] 
    : 1.0;
  
  // General complexity multiplier
  const complexityMultipliers = {
    simple: 0.8,
    moderate: 1.0,
    complex: 1.5,
  };
  const complexityMultiplier = parameters.complexity 
    ? complexityMultipliers[parameters.complexity] 
    : 1.0;
  
  // Calculate total credits
  const totalMultiplier = durationMultiplier * resolutionMultiplier * styleMultiplier * complexityMultiplier;
  const estimatedCredits = Math.ceil(baseCredits * totalMultiplier);
  
  // Estimate AWS cost (roughly 60% of credit value)
  const estimatedAWSCost = estimatedCredits * 0.6 * 0.05; // $0.05 per credit
  
  // Platform profit (roughly 40% of credit value)
  const platformProfit = estimatedCredits * 0.4 * 0.05;
  
  return {
    operation: operationType,
    estimatedCredits,
    estimatedAWSCost,
    platformProfit,
    breakdown: {
      baseCredits,
      complexityMultiplier,
      durationMultiplier,
      resolutionMultiplier: resolutionMultiplier * styleMultiplier,
    },
  };
};

export const formatCredits = (credits: number): string => {
  if (credits < 1000) {
    return credits.toString();
  }
  
  if (credits < 1000000) {
    return `${(credits / 1000).toFixed(1)}K`;
  }
  
  return `${(credits / 1000000).toFixed(1)}M`;
};

export const calculateCreditValue = (credits: number, pricePerCredit = 0.05): number => {
  return credits * pricePerCredit;
};

export const formatCreditValue = (credits: number, pricePerCredit = 0.05): string => {
  const value = calculateCreditValue(credits, pricePerCredit);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
};

export const getSubscriptionCreditAllocation = (planId: string): number => {
  const allocations: Record<string, number> = {
    free: 0,
    starter: 100,
    pro: 500,
    ultra: 2000,
  };
  
  return allocations[planId] || 0;
};

export const calculateRefund = (
  originalCredits: number,
  progressPercentage: number
): number => {
  // Refund unused portion, minimum 10% processing fee
  const usedPercentage = Math.max(0.1, progressPercentage / 100);
  const refundPercentage = 1 - usedPercentage;
  return Math.floor(originalCredits * refundPercentage);
};