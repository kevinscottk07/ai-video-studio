/**
 * AI Video Studio Design System
 * 
 * This file serves as the main entry point for the design system,
 * exporting all components, utilities, and tokens.
 */

// Design tokens
export * from './design-tokens'

// Component variants and utilities
export * from './component-variants'

// Theme provider and utilities
export { ThemeProvider, useTheme, ThemeToggle, ThemeSelector } from '../components/theme/theme-provider'

// Media query hooks
export * from '../hooks/use-media-query'

// UI Components
export * from '../components/ui'

// Design system showcase
export { DesignSystemShowcase } from '../components/design-system/design-system-showcase'
export { UIShowcase } from '../components/ui/ui-showcase'

// Common component props types
export interface BaseComponentProps {
  className?: string
  children?: React.ReactNode
}

export interface VariantProps<T extends Record<string, any>> {
  variant?: keyof T
  size?: keyof T extends 'size' ? T['size'] : never
}

// Animation utilities
export const animations = {
  // Entrance animations
  fadeIn: 'animate-fade-in',
  slideIn: 'animate-slide-in',
  slideUp: 'animate-slide-up',
  slideDown: 'animate-slide-down',
  slideLeft: 'animate-slide-left',
  slideRight: 'animate-slide-right',
  scaleIn: 'animate-scale-in',
  zoomIn: 'animate-zoom-in',
  bounceIn: 'animate-bounce-in',

  // Continuous animations
  float: 'animate-float',
  glow: 'animate-glow',
  pulse: 'animate-pulse-slow',
  gradient: 'animate-gradient-x',
  shimmer: 'animate-shimmer',
  spin: 'animate-spin-slow',

  // Loading animations
  spinner: 'animate-spin',
  ping: 'animate-ping',
  bounce: 'animate-bounce',
} as const

// Layout utilities
export const layouts = {
  container: 'container',
  containerSm: 'container-sm',
  containerLg: 'container-lg',
  containerFluid: 'w-full px-4 sm:px-6 lg:px-8',
  
  flexCenter: 'flex items-center justify-center',
  flexBetween: 'flex items-center justify-between',
  flexCol: 'flex flex-col',
  flexRow: 'flex flex-row',
  
  gridAuto: 'grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))]',
  gridResponsive: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  masonry: 'columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6',
} as const

// Interaction utilities
export const interactions = {
  focusRing: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  hoverScale: 'hover:scale-105 active:scale-95 transition-transform duration-200',
  hoverGlow: 'hover:shadow-glow transition-shadow duration-300',
  smoothTransition: 'transition-all duration-200 ease-in-out',
  clickable: 'cursor-pointer select-none',
  disabled: 'opacity-50 cursor-not-allowed pointer-events-none',
} as const

// Status utilities
export const status = {
  success: 'text-success bg-success/10 border-success/20',
  warning: 'text-warning bg-warning/10 border-warning/20',
  error: 'text-destructive bg-destructive/10 border-destructive/20',
  info: 'text-info bg-info/10 border-info/20',
  pending: 'text-muted-foreground bg-muted border-border',
  processing: 'text-ai bg-ai/10 border-ai/20',
  completed: 'text-success bg-success/10 border-success/20',
  failed: 'text-destructive bg-destructive/10 border-destructive/20',
} as const

// Glass morphism utilities
export const glass = {
  default: 'backdrop-blur-md bg-white/10 border border-white/20 dark:bg-black/10 dark:border-white/10',
  card: 'backdrop-blur-md bg-card/80 border border-border/50 shadow-glass',
  strong: 'backdrop-blur-lg bg-white/20 border border-white/30 dark:bg-black/20 dark:border-white/20',
  subtle: 'backdrop-blur-sm bg-white/5 border border-white/10 dark:bg-black/5 dark:border-white/5',
} as const

// Gradient utilities
export const gradients = {
  primary: 'bg-gradient-to-r from-primary-500 to-primary-600',
  ai: 'bg-gradient-to-r from-ai via-primary to-video',
  video: 'bg-gradient-to-r from-video to-generation',
  rainbow: 'bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500',
  sunset: 'bg-gradient-to-r from-orange-400 via-red-500 to-pink-500',
  ocean: 'bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600',
  forest: 'bg-gradient-to-r from-green-400 via-green-500 to-green-600',
  text: 'bg-gradient-to-r from-primary via-ai to-video bg-clip-text text-transparent',
} as const

// Accessibility utilities
export const a11y = {
  srOnly: 'sr-only',
  notSrOnly: 'not-sr-only',
  focusVisible: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  skipLink: 'absolute left-[-10000px] top-auto w-1 h-1 overflow-hidden focus:left-6 focus:top-7 focus:w-auto focus:h-auto focus:overflow-visible',
  highContrast: 'contrast-more:border-2 contrast-more:border-current',
  reducedMotion: 'motion-reduce:animate-none motion-reduce:transition-none',
} as const

// Print utilities
export const print = {
  hidden: 'print:hidden',
  visible: 'print:block',
  pageBreak: 'print:break-after-page',
  noPageBreak: 'print:break-inside-avoid',
} as const

// Design system configuration
export const designSystemConfig = {
  name: 'AI Video Studio Design System',
  version: '1.0.0',
  description: 'A comprehensive design system for AI Video Studio platform',
  
  // Feature flags
  features: {
    darkMode: true,
    systemPreference: true,
    animations: true,
    glassMorphism: true,
    gradients: true,
    accessibility: true,
  },
  
  // Default theme
  defaultTheme: 'system' as const,
  
  // Supported themes
  themes: ['light', 'dark', 'system'] as const,
  
  // Breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  
  // Animation preferences
  animations: {
    duration: {
      fast: '150ms',
      normal: '200ms',
      slow: '300ms',
    },
    easing: {
      linear: 'linear',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
} as const

// Type exports
export type Theme = typeof designSystemConfig.themes[number]
export type Breakpoint = keyof typeof designSystemConfig.breakpoints
export type AnimationDuration = keyof typeof designSystemConfig.animations.duration
export type AnimationEasing = keyof typeof designSystemConfig.animations.easing