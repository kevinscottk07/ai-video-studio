/**
 * AI Video Studio Design System Tokens
 * 
 * This file contains all design tokens used throughout the application.
 * These tokens ensure consistency across components and make it easy to
 * maintain and update the design system.
 */

// Color Palette
export const colors = {
  // Primary brand colors - AI Video Studio theme
  primary: {
    50: 'hsl(262, 100%, 97%)',
    100: 'hsl(262, 100%, 94%)',
    200: 'hsl(262, 100%, 87%)',
    300: 'hsl(262, 100%, 78%)',
    400: 'hsl(262, 91%, 69%)',
    500: 'hsl(262, 83%, 58%)', // Default primary
    600: 'hsl(262, 83%, 47%)',
    700: 'hsl(262, 78%, 39%)',
    800: 'hsl(262, 69%, 32%)',
    900: 'hsl(262, 55%, 27%)',
    950: 'hsl(262, 47%, 17%)',
  },

  // Semantic colors
  semantic: {
    success: 'hsl(142, 76%, 36%)',
    warning: 'hsl(38, 92%, 50%)',
    error: 'hsl(0, 84%, 60%)',
    info: 'hsl(199, 89%, 48%)',
  },

  // AI/Video specific colors
  ai: 'hsl(200, 100%, 70%)',
  video: 'hsl(280, 100%, 70%)',
  generation: 'hsl(120, 100%, 70%)',

  // Neutral colors (light theme)
  neutral: {
    50: 'hsl(0, 0%, 98%)',
    100: 'hsl(0, 0%, 96%)',
    200: 'hsl(0, 0%, 90%)',
    300: 'hsl(0, 0%, 83%)',
    400: 'hsl(0, 0%, 64%)',
    500: 'hsl(0, 0%, 45%)',
    600: 'hsl(0, 0%, 32%)',
    700: 'hsl(0, 0%, 25%)',
    800: 'hsl(0, 0%, 15%)',
    900: 'hsl(0, 0%, 9%)',
    950: 'hsl(0, 0%, 4%)',
  },
} as const

// Typography Scale
export const typography = {
  fontFamily: {
    sans: [
      'Inter Variable',
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      'Segoe UI',
      'Roboto',
      'Oxygen',
      'Ubuntu',
      'Cantarell',
      'Fira Sans',
      'Droid Sans',
      'Helvetica Neue',
      'sans-serif',
    ],
    mono: [
      'JetBrains Mono Variable',
      'JetBrains Mono',
      'Fira Code',
      'Monaco',
      'Consolas',
      'Liberation Mono',
      'Courier New',
      'monospace',
    ],
    display: [
      'Cal Sans',
      'Inter Variable',
      'Inter',
      'system-ui',
      'sans-serif',
    ],
  },

  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    base: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
    '5xl': ['3rem', { lineHeight: '1' }],
    '6xl': ['3.75rem', { lineHeight: '1' }],
    '7xl': ['4.5rem', { lineHeight: '1' }],
    '8xl': ['6rem', { lineHeight: '1' }],
    '9xl': ['8rem', { lineHeight: '1' }],

    // Display typography
    'display-xs': ['1.5rem', { lineHeight: '2rem', fontWeight: '600' }],
    'display-sm': ['1.875rem', { lineHeight: '2.25rem', fontWeight: '600' }],
    'display-md': ['2.25rem', { lineHeight: '2.5rem', fontWeight: '600' }],
    'display-lg': ['3rem', { lineHeight: '3.5rem', fontWeight: '600' }],
    'display-xl': ['3.75rem', { lineHeight: '4.25rem', fontWeight: '600' }],
    'display-2xl': ['4.5rem', { lineHeight: '5rem', fontWeight: '700' }],
  },

  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },

  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },

  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const

// Spacing Scale
export const spacing = {
  0: '0px',
  px: '1px',
  0.5: '0.125rem', // 2px
  1: '0.25rem',    // 4px
  1.5: '0.375rem', // 6px
  2: '0.5rem',     // 8px
  2.5: '0.625rem', // 10px
  3: '0.75rem',    // 12px
  3.5: '0.875rem', // 14px
  4: '1rem',       // 16px
  5: '1.25rem',    // 20px
  6: '1.5rem',     // 24px
  7: '1.75rem',    // 28px
  8: '2rem',       // 32px
  9: '2.25rem',    // 36px
  10: '2.5rem',    // 40px
  11: '2.75rem',   // 44px
  12: '3rem',      // 48px
  14: '3.5rem',    // 56px
  16: '4rem',      // 64px
  20: '5rem',      // 80px
  24: '6rem',      // 96px
  28: '7rem',      // 112px
  32: '8rem',      // 128px
  36: '9rem',      // 144px
  40: '10rem',     // 160px
  44: '11rem',     // 176px
  48: '12rem',     // 192px
  52: '13rem',     // 208px
  56: '14rem',     // 224px
  60: '15rem',     // 240px
  64: '16rem',     // 256px
  72: '18rem',     // 288px
  80: '20rem',     // 320px
  96: '24rem',     // 384px
} as const

// Border Radius
export const borderRadius = {
  none: '0px',
  sm: '0.125rem',   // 2px
  base: '0.25rem',  // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  '3xl': '1.5rem',  // 24px
  full: '9999px',
} as const

// Shadows
export const shadows = {
  xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  none: 'none',

  // Custom shadows
  glow: '0 0 20px -5px hsl(var(--primary))',
  'glow-lg': '0 0 40px -10px hsl(var(--primary))',
  glass: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
  card: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px 0 rgb(0 0 0 / 0.06)',
  'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -1px rgb(0 0 0 / 0.06)',
} as const

// Animation Durations
export const animation = {
  duration: {
    75: '75ms',
    100: '100ms',
    150: '150ms',
    200: '200ms',
    300: '300ms',
    500: '500ms',
    700: '700ms',
    1000: '1000ms',
  },

  timing: {
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const

// Breakpoints
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const

// Z-Index Scale
export const zIndex = {
  0: '0',
  10: '10',
  20: '20',
  30: '30',
  40: '40',
  50: '50',
  auto: 'auto',

  // Semantic z-index values
  hide: '-1',
  base: '0',
  docked: '10',
  dropdown: '1000',
  sticky: '1100',
  banner: '1200',
  overlay: '1300',
  modal: '1400',
  popover: '1500',
  skipLink: '1600',
  toast: '1700',
  tooltip: '1800',
} as const

// Component Sizes
export const componentSizes = {
  button: {
    sm: {
      height: '2.25rem', // 36px
      padding: '0 0.75rem',
      fontSize: '0.875rem',
    },
    md: {
      height: '2.5rem', // 40px
      padding: '0 1rem',
      fontSize: '0.875rem',
    },
    lg: {
      height: '2.75rem', // 44px
      padding: '0 2rem',
      fontSize: '1rem',
    },
    xl: {
      height: '3rem', // 48px
      padding: '0 2.5rem',
      fontSize: '1.125rem',
    },
  },

  input: {
    sm: {
      height: '2rem', // 32px
      padding: '0 0.75rem',
      fontSize: '0.875rem',
    },
    md: {
      height: '2.5rem', // 40px
      padding: '0 0.75rem',
      fontSize: '0.875rem',
    },
    lg: {
      height: '3rem', // 48px
      padding: '0 1rem',
      fontSize: '1rem',
    },
  },

  avatar: {
    xs: '1.5rem', // 24px
    sm: '2rem',   // 32px
    md: '2.5rem', // 40px
    lg: '3rem',   // 48px
    xl: '4rem',   // 64px
    '2xl': '5rem', // 80px
  },
} as const

// Layout Constraints
export const layout = {
  container: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  content: {
    xs: '20rem',   // 320px
    sm: '24rem',   // 384px
    md: '28rem',   // 448px
    lg: '32rem',   // 512px
    xl: '36rem',   // 576px
    '2xl': '42rem', // 672px
    '3xl': '48rem', // 768px
    '4xl': '56rem', // 896px
    '5xl': '64rem', // 1024px
    '6xl': '72rem', // 1152px
    '7xl': '80rem', // 1280px
  },

  sidebar: {
    sm: '16rem',  // 256px
    md: '20rem',  // 320px
    lg: '24rem',  // 384px
  },

  header: {
    sm: '3rem',   // 48px
    md: '4rem',   // 64px
    lg: '5rem',   // 80px
  },
} as const

// Export all tokens as a single object
export const designTokens = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  animation,
  breakpoints,
  zIndex,
  componentSizes,
  layout,
} as const

// Type definitions for better TypeScript support
export type ColorToken = keyof typeof colors.primary
export type SpacingToken = keyof typeof spacing
export type BorderRadiusToken = keyof typeof borderRadius
export type ShadowToken = keyof typeof shadows
export type BreakpointToken = keyof typeof breakpoints
export type ZIndexToken = keyof typeof zIndex

// Utility functions for working with design tokens
export const getColor = (color: string) => `hsl(var(--${color}))`
export const getSpacing = (size: SpacingToken) => spacing[size]
export const getBorderRadius = (size: BorderRadiusToken) => borderRadius[size]
export const getShadow = (size: ShadowToken) => shadows[size]

// CSS custom property helpers
export const cssVar = (name: string) => `var(--${name})`
export const hslVar = (name: string) => `hsl(var(--${name}))`

// Responsive utilities
export const mediaQuery = {
  sm: `@media (min-width: ${breakpoints.sm})`,
  md: `@media (min-width: ${breakpoints.md})`,
  lg: `@media (min-width: ${breakpoints.lg})`,
  xl: `@media (min-width: ${breakpoints.xl})`,
  '2xl': `@media (min-width: ${breakpoints['2xl']})`,
} as const