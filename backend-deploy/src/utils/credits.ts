// Copied from @ai-video-studio/utils/credits for standalone deployment

import { VideoResolution, VideoStyle, TransactionType } from '../types/index.js';

// Credit calculation constants
const BASE_CREDITS = {
  [VideoResolution.HD]: 10,
  [VideoResolution.FULL_HD]: 20,
  [VideoResolution.ULTRA_HD]: 40,
};

const STYLE_MULTIPLIERS = {
  [VideoStyle.CINEMATIC]: 1.5,
  [VideoStyle.MODERN]: 1.0,
  [VideoStyle.VINTAGE]: 1.2,
  [VideoStyle.ANIMATED]: 2.0,
};

const DURATION_MULTIPLIER = 1; // Credits per second

/**
 * Calculate credits required for video generation
 */
export function calculateCredits(
  duration: number,
  resolution: VideoResolution,
  style: VideoStyle
): number {
  const baseCredits = BASE_CREDITS[resolution] || BASE_CREDITS[VideoResolution.FULL_HD];
  const styleMultiplier = STYLE_MULTIPLIERS[style] || STYLE_MULTIPLIERS[VideoStyle.MODERN];
  const durationMultiplier = Math.max(1, duration * DURATION_MULTIPLIER);
  
  return Math.ceil(baseCredits * styleMultiplier * durationMultiplier);
}

/**
 * Calculate refund amount for cancelled generation
 */
export function calculateRefund(
  originalCredits: number,
  progress: number
): number {
  // Refund based on remaining progress
  const remainingProgress = Math.max(0, 1 - progress);
  return Math.floor(originalCredits * remainingProgress);
}

/**
 * Calculate cost in USD for credits
 */
export function calculateCost(credits: number): number {
  // $0.10 per credit
  return credits * 0.10;
}

/**
 * Get credit package recommendations
 */
export function getRecommendedPackage(estimatedCredits: number) {
  const packages = [
    { credits: 100, price: 9.99, bonus: 0 },
    { credits: 250, price: 19.99, bonus: 25 },
    { credits: 500, price: 39.99, bonus: 75 },
    { credits: 1000, price: 69.99, bonus: 200 },
  ];

  return packages.find(pkg => pkg.credits + pkg.bonus >= estimatedCredits) || packages[packages.length - 1];
}