/**
 * Component Variants and Styling Utilities
 * 
 * This file contains reusable component variants and styling utilities
 * that ensure consistency across the AI Video Studio design system.
 */

import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Utility function to merge Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Button Variants
export const buttonVariants = {
  variant: {
    default: 'btn-primary',
    destructive: 'btn-destructive',
    outline: 'btn-outline',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    link: 'underline-offset-4 hover:underline text-primary',
    success: 'btn-success',
    warning: 'btn-warning',
    info: 'btn-info',
    ai: 'bg-ai text-ai-foreground hover:bg-ai/90 shadow-glow hover:shadow-glow-lg transition-all duration-300',
    video: 'bg-video text-video-foreground hover:bg-video/90 shadow-glow hover:shadow-glow-lg transition-all duration-300',
    generation: 'bg-generation text-generation-foreground hover:bg-generation/90 shadow-glow hover:shadow-glow-lg transition-all duration-300',
    gradient: 'bg-gradient-to-r from-primary via-ai to-video text-white hover:shadow-glow-lg transition-all duration-300',
  },
  size: {
    default: 'btn-md',
    sm: 'btn-sm',
    lg: 'btn-lg',
    xl: 'btn-xl',
    icon: 'h-10 w-10 p-0',
  },
} as const

// Badge Variants
export const badgeVariants = {
  variant: {
    default: 'badge-default',
    secondary: 'badge-secondary',
    destructive: 'badge-destructive',
    outline: 'badge-outline',
    success: 'badge-success',
    warning: 'badge-warning',
    info: 'badge-info',
    ai: 'border-transparent bg-ai text-ai-foreground hover:bg-ai/80',
    video: 'border-transparent bg-video text-video-foreground hover:bg-video/80',
    generation: 'border-transparent bg-generation text-generation-foreground hover:bg-generation/80',
  },
  size: {
    default: 'text-xs',
    sm: 'text-xs px-2 py-0.5',
    lg: 'text-sm px-3 py-1',
  },
} as const

// Card Variants
export const cardVariants = {
  variant: {
    default: 'card',
    elevated: 'card shadow-lg hover:shadow-xl transition-shadow duration-300',
    interactive: 'card-hover cursor-pointer',
    glass: 'glass-card',
    gradient: 'card bg-gradient-to-br from-card via-card to-muted/50',
  },
  padding: {
    none: '',
    sm: 'p-4',
    default: 'p-6',
    lg: 'p-8',
  },
} as const

// Input Variants
export const inputVariants = {
  variant: {
    default: 'form-input',
    ghost: 'border-none bg-transparent focus:bg-muted/50',
    filled: 'border-none bg-muted focus:bg-muted/70',
  },
  size: {
    sm: 'h-8 px-2 text-sm',
    default: 'h-10 px-3',
    lg: 'h-12 px-4 text-base',
  },
} as const

// Text Variants
export const textVariants = {
  variant: {
    default: 'text-foreground',
    muted: 'text-muted-foreground',
    subtle: 'text-muted-foreground/70',
    primary: 'text-primary',
    secondary: 'text-secondary-foreground',
    destructive: 'text-destructive',
    success: 'text-success',
    warning: 'text-warning',
    info: 'text-info',
    gradient: 'gradient-text',
    ai: 'text-ai',
    video: 'text-video',
    generation: 'text-generation',
  },
  size: {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
    '3xl': 'text-3xl',
    '4xl': 'text-4xl',
    '5xl': 'text-5xl',
    '6xl': 'text-6xl',
    'display-xs': 'text-display-xs',
    'display-sm': 'text-display-sm',
    'display-md': 'text-display-md',
    'display-lg': 'text-display-lg',
    'display-xl': 'text-display-xl',
    'display-2xl': 'text-display-2xl',
  },
  weight: {
    thin: 'font-thin',
    light: 'font-light',
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
    extrabold: 'font-extrabold',
    black: 'font-black',
  },
} as const

// Avatar Variants
export const avatarVariants = {
  size: {
    xs: 'h-6 w-6',
    sm: 'h-8 w-8',
    default: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
    '2xl': 'h-20 w-20',
  },
  variant: {
    default: 'avatar',
    square: 'avatar rounded-radius-md',
    rounded: 'avatar rounded-radius-lg',
  },
} as const

// Loading Variants
export const loadingVariants = {
  variant: {
    spinner: 'animate-spin',
    pulse: 'animate-pulse',
    bounce: 'animate-bounce',
    ping: 'animate-ping',
    glow: 'animate-glow',
    shimmer: 'animate-shimmer',
  },
  size: {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    default: 'h-5 w-5',
    lg: 'h-6 w-6',
    xl: 'h-8 w-8',
  },
} as const

// Animation Variants
export const animationVariants = {
  entrance: {
    'fade-in': 'animate-fade-in',
    'slide-in': 'animate-slide-in',
    'slide-up': 'animate-slide-up',
    'slide-down': 'animate-slide-down',
    'slide-left': 'animate-slide-left',
    'slide-right': 'animate-slide-right',
    'scale-in': 'animate-scale-in',
    'zoom-in': 'animate-zoom-in',
    'bounce-in': 'animate-bounce-in',
  },
  continuous: {
    float: 'animate-float',
    glow: 'animate-glow',
    pulse: 'animate-pulse-slow',
    gradient: 'animate-gradient-x',
    shimmer: 'animate-shimmer',
    spin: 'animate-spin-slow',
  },
} as const

// Layout Variants
export const layoutVariants = {
  container: {
    default: 'container',
    sm: 'container-sm',
    lg: 'container-lg',
    fluid: 'w-full px-4 sm:px-6 lg:px-8',
  },
  grid: {
    1: 'grid grid-cols-1',
    2: 'grid grid-cols-1 md:grid-cols-2',
    3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    auto: 'grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))]',
    masonry: 'columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6',
  },
  flex: {
    row: 'flex flex-row',
    col: 'flex flex-col',
    center: 'flex items-center justify-center',
    between: 'flex items-center justify-between',
    around: 'flex items-center justify-around',
    evenly: 'flex items-center justify-evenly',
  },
} as const

// Status Variants
export const statusVariants = {
  variant: {
    success: 'text-success bg-success/10 border-success/20',
    warning: 'text-warning bg-warning/10 border-warning/20',
    error: 'text-destructive bg-destructive/10 border-destructive/20',
    info: 'text-info bg-info/10 border-info/20',
    pending: 'text-muted-foreground bg-muted border-border',
    processing: 'text-ai bg-ai/10 border-ai/20',
    completed: 'text-success bg-success/10 border-success/20',
    failed: 'text-destructive bg-destructive/10 border-destructive/20',
  },
  size: {
    sm: 'px-2 py-1 text-xs',
    default: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  },
} as const

// Utility functions for creating variant classes
export function createVariantClasses<T extends Record<string, Record<string, string>>>(
  variants: T,
  defaultVariant?: Partial<{ [K in keyof T]: keyof T[K] }>
) {
  return function getVariantClasses(
    props: Partial<{ [K in keyof T]: keyof T[K] }>
  ): string {
    const classes: string[] = []
    
    for (const [key, value] of Object.entries(variants)) {
      const variantKey = key as keyof T
      const selectedVariant = props[variantKey] || defaultVariant?.[variantKey]
      
      if (selectedVariant && variants[variantKey][selectedVariant]) {
        classes.push(variants[variantKey][selectedVariant])
      }
    }
    
    return classes.join(' ')
  }
}

// Pre-configured variant functions
export const getButtonClasses = createVariantClasses(buttonVariants, {
  variant: 'default',
  size: 'default',
})

export const getBadgeClasses = createVariantClasses(badgeVariants, {
  variant: 'default',
  size: 'default',
})

export const getCardClasses = createVariantClasses(cardVariants, {
  variant: 'default',
  padding: 'default',
})

export const getInputClasses = createVariantClasses(inputVariants, {
  variant: 'default',
  size: 'default',
})

export const getTextClasses = createVariantClasses(textVariants, {
  variant: 'default',
  size: 'base',
  weight: 'normal',
})

export const getAvatarClasses = createVariantClasses(avatarVariants, {
  variant: 'default',
  size: 'default',
})

export const getLoadingClasses = createVariantClasses(loadingVariants, {
  variant: 'spinner',
  size: 'default',
})

export const getStatusClasses = createVariantClasses(statusVariants, {
  variant: 'info',
  size: 'default',
})

// Focus and interaction utilities
export const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
export const hoverScale = 'hover:scale-105 active:scale-95 transition-transform duration-200'
export const hoverGlow = 'hover:shadow-glow transition-shadow duration-300'
export const smoothTransition = 'transition-all duration-200 ease-in-out'

// Responsive utilities
export const responsiveText = {
  xs: 'text-xs sm:text-sm',
  sm: 'text-sm sm:text-base',
  base: 'text-base sm:text-lg',
  lg: 'text-lg sm:text-xl',
  xl: 'text-xl sm:text-2xl',
  '2xl': 'text-2xl sm:text-3xl',
  '3xl': 'text-3xl sm:text-4xl',
  '4xl': 'text-4xl sm:text-5xl',
  '5xl': 'text-5xl sm:text-6xl',
}

export const responsiveSpacing = {
  xs: 'p-2 sm:p-3',
  sm: 'p-3 sm:p-4',
  base: 'p-4 sm:p-6',
  lg: 'p-6 sm:p-8',
  xl: 'p-8 sm:p-12',
}

// Glass morphism utilities
export const glassEffect = 'backdrop-blur-md bg-white/10 border border-white/20 dark:bg-black/10 dark:border-white/10'
export const glassCard = 'backdrop-blur-md bg-card/80 border border-border/50 shadow-glass'

// Gradient utilities
export const gradients = {
  primary: 'bg-gradient-to-r from-primary-500 to-primary-600',
  ai: 'bg-gradient-to-r from-ai via-primary to-video',
  video: 'bg-gradient-to-r from-video to-generation',
  rainbow: 'bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500',
  sunset: 'bg-gradient-to-r from-orange-400 via-red-500 to-pink-500',
  ocean: 'bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600',
  forest: 'bg-gradient-to-r from-green-400 via-green-500 to-green-600',
}