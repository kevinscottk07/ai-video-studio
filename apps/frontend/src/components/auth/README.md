# Premium Authentication Components

This directory contains world-class authentication components for the AI Video Studio platform, featuring smooth animations, multi-step onboarding, and premium social login integration.

## Components

### PremiumLoginForm

A premium authentication form with smooth animations, social login options, and professional design elements.

**Features:**
- Animated logo and background elements
- Social login buttons (Google, GitHub) with hover animations
- Mode switching between login and signup
- Features showcase with animated icons
- Smooth transitions and micro-interactions
- Loading states and error handling
- Responsive design with mobile-first approach

**Usage:**
```tsx
import { PremiumLoginForm } from '@/components/auth';

<PremiumLoginForm 
  onModeChange={(mode) => console.log('Mode changed to:', mode)}
  returnTo="/dashboard"
/>
```

**Props:**
- `onModeChange?: (mode: 'login' | 'signup') => void` - Callback when mode changes
- `returnTo?: string` - URL to redirect to after authentication (default: '/dashboard')

### OnboardingFlow

A multi-step onboarding experience with progress indicators, form validation, and contextual guidance.

**Features:**
- 4-step onboarding process:
  1. Basic Information (name, language, timezone)
  2. Interests Selection (video creation interests)
  3. Experience Level (skill level assessment)
  4. Goals Selection (what users want to achieve)
- Animated progress bar with step indicators
- Form validation and error handling
- Smooth step transitions with Framer Motion
- Responsive design for all screen sizes
- Contextual icons and guidance

**Usage:**
```tsx
import { OnboardingFlow } from '@/components/auth';

<OnboardingFlow 
  onComplete={() => console.log('Onboarding completed')}
/>
```

**Props:**
- `onComplete: () => void` - Callback when onboarding is completed

### SocialLoginButton

Premium social login buttons with hover animations, loading states, and consistent branding.

**Features:**
- Support for multiple providers (Google, GitHub, Facebook, Twitter, LinkedIn)
- Smooth hover animations and micro-interactions
- Loading states with spinners
- Multiple sizes (sm, md, lg) and variants (default, outline, minimal)
- Consistent branding with provider colors
- Accessibility support with proper focus states
- Customizable icons and text

**Usage:**
```tsx
import { 
  SocialLoginButton, 
  GoogleLoginButton, 
  GitHubLoginButton 
} from '@/components/auth';

// Generic component
<SocialLoginButton 
  provider="google"
  onClick={() => handleLogin('google')}
  loading={isLoading}
  size="lg"
/>

// Preset components
<GoogleLoginButton onClick={() => handleLogin('google')} />
<GitHubLoginButton onClick={() => handleLogin('github')} />
```

**Props:**
- `provider: 'google' | 'github' | 'facebook' | 'twitter' | 'linkedin'` - Social provider
- `onClick: () => void` - Click handler
- `loading?: boolean` - Loading state
- `disabled?: boolean` - Disabled state
- `size?: 'sm' | 'md' | 'lg'` - Button size
- `variant?: 'default' | 'outline' | 'minimal'` - Button variant
- `showIcon?: boolean` - Show provider icon (default: true)
- `showArrow?: boolean` - Show arrow icon (default: true)
- `className?: string` - Additional CSS classes
- `children?: React.ReactNode` - Custom button text

### UserProfileSetup

Enhanced user profile setup component that uses the OnboardingFlow for a premium experience.

**Features:**
- Integrates with OnboardingFlow for multi-step setup
- Handles Auth0 user data integration
- Profile creation with API integration
- Error handling and success feedback

**Usage:**
```tsx
import { UserProfileSetup } from '@/components/auth';

<UserProfileSetup 
  onComplete={() => console.log('Profile setup completed')}
/>
```

## Route Components

### ProtectedRoute

Route wrapper that requires authentication to access protected pages.

**Features:**
- Redirects unauthenticated users to login
- Preserves intended destination for post-login redirect
- Loading states during authentication check

### AdminRoute

Route wrapper that requires admin or moderator privileges.

**Features:**
- Checks user role from Auth0 claims
- Shows access denied message for unauthorized users
- Redirects to dashboard for non-admin users

## Design System Integration

All authentication components are built with the AI Video Studio design system:

- **Colors:** Uses primary, secondary, and semantic color tokens
- **Typography:** Consistent font scales and weights
- **Spacing:** Standardized spacing system
- **Animations:** Framer Motion with consistent timing and easing
- **Accessibility:** WCAG 2.1 AA compliant with proper focus management
- **Responsive:** Mobile-first design with breakpoint consistency

## Animation Details

### Entrance Animations
- **Fade In:** Smooth opacity transitions with staggered delays
- **Slide Up:** Y-axis translations with spring physics
- **Scale In:** Logo and icon animations with bounce effects
- **Stagger:** Sequential animations for list items and features

### Hover Effects
- **Scale:** Subtle scale transforms (1.02x) on hover
- **Glow:** Shadow and ring effects for interactive elements
- **Color Transitions:** Smooth color changes with 200ms duration
- **Icon Rotations:** 360-degree rotations for social login icons

### Loading States
- **Spinners:** Consistent loading spinners across components
- **Skeleton:** Placeholder content during data loading
- **Progressive:** Step-by-step loading for multi-step flows

## Testing

Each component includes comprehensive unit tests:

- **Rendering:** Verifies components render correctly
- **Interactions:** Tests user interactions and callbacks
- **States:** Validates loading, error, and success states
- **Accessibility:** Ensures proper ARIA labels and keyboard navigation
- **Responsive:** Tests behavior across different screen sizes

Run tests with:
```bash
npm run test
```

## Performance Considerations

- **Code Splitting:** Components are lazy-loaded where appropriate
- **Bundle Size:** Optimized imports to minimize bundle impact
- **Animations:** Uses transform and opacity for GPU acceleration
- **Images:** Optimized SVG icons and minimal external dependencies
- **Memoization:** React.memo and useMemo for expensive operations

## Browser Support

- **Modern Browsers:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile:** iOS Safari 14+, Chrome Mobile 90+
- **Features:** CSS Grid, Flexbox, CSS Custom Properties
- **Fallbacks:** Graceful degradation for older browsers

## Accessibility Features

- **Keyboard Navigation:** Full keyboard support with visible focus indicators
- **Screen Readers:** Proper ARIA labels and semantic HTML
- **Color Contrast:** WCAG AA compliant color combinations
- **Motion:** Respects prefers-reduced-motion for accessibility
- **Focus Management:** Proper focus trapping in modals and flows

## Integration with Auth0

The components integrate seamlessly with Auth0:

- **Social Providers:** Google, GitHub, and other OAuth providers
- **Custom Claims:** Role-based access control with custom JWT claims
- **Session Management:** Automatic token refresh and session handling
- **Error Handling:** Comprehensive error states and user feedback
- **Redirect Handling:** Preserves user intent with return URLs

## Customization

Components can be customized through:

- **CSS Classes:** Tailwind CSS classes for styling overrides
- **Theme Tokens:** Design system tokens for consistent theming
- **Props:** Extensive prop APIs for behavior customization
- **Slots:** Render props and children for content customization
- **Variants:** Multiple built-in variants for different use cases

## Future Enhancements

Planned improvements include:

- **Biometric Authentication:** Face ID and Touch ID support
- **Multi-Factor Authentication:** SMS and authenticator app support
- **Social Providers:** Additional providers (Apple, Microsoft, etc.)
- **Internationalization:** Full i18n support for global users
- **Analytics:** User behavior tracking and conversion optimization