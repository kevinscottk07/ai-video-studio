import { VideoResolution, VideoStyle, SubscriptionPlan } from '@ai-video-studio/types';

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPassword = (password: string): boolean => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const isValidVideoResolution = (resolution: string): resolution is VideoResolution => {
  return Object.values(VideoResolution).includes(resolution as VideoResolution);
};

export const isValidVideoStyle = (style: string): style is VideoStyle => {
  return Object.values(VideoStyle).includes(style as VideoStyle);
};

export const isValidSubscriptionPlan = (plan: string): plan is SubscriptionPlan => {
  return Object.values(SubscriptionPlan).includes(plan as SubscriptionPlan);
};

export const validateDuration = (duration: number, maxDuration: number): boolean => {
  return duration > 0 && duration <= maxDuration;
};

export const validateFileSize = (size: number, maxSize: number): boolean => {
  return size > 0 && size <= maxSize;
};

export const validateMimeType = (mimeType: string, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(mimeType);
};

export const sanitizeString = (input: string): string => {
  return input.trim().replace(/[<>\"']/g, '');
};

export const validateCreditAmount = (amount: number): boolean => {
  return Number.isInteger(amount) && amount > 0 && amount <= 10000;
};

export const validateLanguageCode = (code: string): boolean => {
  // ISO 639-1 language codes
  const languageRegex = /^[a-z]{2}(-[A-Z]{2})?$/;
  return languageRegex.test(code);
};