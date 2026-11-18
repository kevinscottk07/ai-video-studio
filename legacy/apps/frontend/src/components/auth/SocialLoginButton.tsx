/**
 * Social Login Button Component
 * 
 * Premium social login buttons with smooth hover animations, loading states,
 * and consistent branding. Features micro-interactions and accessibility support.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';

interface SocialLoginButtonProps {
  provider: 'google' | 'github' | 'facebook' | 'twitter' | 'linkedin';
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'minimal';
  showIcon?: boolean;
  showArrow?: boolean;
  className?: string;
  children?: React.ReactNode;
}

interface ProviderConfig {
  name: string;
  icon: React.ReactNode;
  colors: {
    bg: string;
    hover: string;
    text: string;
    border?: string;
  };
  brandColor: string;
}

const providerConfigs: Record<string, ProviderConfig> = {
  google: {
    name: 'Google',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
    ),
    colors: {
      bg: 'bg-white dark:bg-gray-700',
      hover: 'hover:bg-gray-50 dark:hover:bg-gray-600',
      text: 'text-gray-900 dark:text-white',
      border: 'border-gray-200 dark:border-gray-600'
    },
    brandColor: '#4285F4'
  },
  github: {
    name: 'GitHub',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
      </svg>
    ),
    colors: {
      bg: 'bg-gray-900 dark:bg-gray-800',
      hover: 'hover:bg-gray-800 dark:hover:bg-gray-700',
      text: 'text-white',
    },
    brandColor: '#333'
  },
  facebook: {
    name: 'Facebook',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    colors: {
      bg: 'bg-blue-600',
      hover: 'hover:bg-blue-700',
      text: 'text-white',
    },
    brandColor: '#1877F2'
  },
  twitter: {
    name: 'Twitter',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
      </svg>
    ),
    colors: {
      bg: 'bg-sky-500',
      hover: 'hover:bg-sky-600',
      text: 'text-white',
    },
    brandColor: '#1DA1F2'
  },
  linkedin: {
    name: 'LinkedIn',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    colors: {
      bg: 'bg-blue-700',
      hover: 'hover:bg-blue-800',
      text: 'text-white',
    },
    brandColor: '#0077B5'
  }
};

export const SocialLoginButton: React.FC<SocialLoginButtonProps> = ({
  provider,
  onClick,
  loading = false,
  disabled = false,
  size = 'md',
  variant = 'default',
  showIcon = true,
  showArrow = true,
  className = '',
  children
}) => {
  const [isHovering, setIsHovering] = useState(false);
  const config = providerConfigs[provider];

  if (!config) {
    console.warn(`Unknown social provider: ${provider}`);
    return null;
  }

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-6 py-4 text-lg'
  };

  const getButtonClasses = () => {
    const baseClasses = 'w-full font-medium rounded-xl transition-all duration-200 flex items-center justify-center space-x-3 border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-opacity-50';
    
    switch (variant) {
      case 'outline':
        return `${baseClasses} bg-transparent border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-gray-500`;
      case 'minimal':
        return `${baseClasses} bg-transparent border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-gray-500`;
      default:
        return `${baseClasses} ${config.colors.bg} ${config.colors.hover} ${config.colors.text} ${config.colors.border ? `border-${config.colors.border}` : 'border-transparent'} focus:ring-opacity-50`;
    }
  };

  const buttonText = children || `Continue with ${config.name}`;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onHoverStart={() => setIsHovering(true)}
      onHoverEnd={() => setIsHovering(false)}
    >
      <button
        onClick={onClick}
        disabled={disabled || loading}
        className={`${getButtonClasses()} ${sizeClasses[size]} ${className} ${
          disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
        style={{
          focusRingColor: config.brandColor
        }}
      >
        {/* Loading state */}
        {loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center space-x-2"
          >
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Connecting...</span>
          </motion.div>
        ) : (
          <>
            {/* Icon */}
            {showIcon && (
              <motion.div
                animate={{ 
                  rotate: isHovering ? 360 : 0,
                  scale: isHovering ? 1.1 : 1
                }}
                transition={{ 
                  duration: 0.5,
                  ease: 'easeInOut'
                }}
                className="flex-shrink-0"
              >
                {config.icon}
              </motion.div>
            )}

            {/* Text */}
            <span className="flex-1 text-center font-medium">
              {buttonText}
            </span>

            {/* Arrow */}
            {showArrow && (
              <motion.div
                animate={{ 
                  x: isHovering ? 5 : 0,
                  opacity: isHovering ? 1 : 0.7
                }}
                transition={{ duration: 0.2 }}
                className="flex-shrink-0"
              >
                <ArrowRight className="h-4 w-4" />
              </motion.div>
            )}
          </>
        )}

        {/* Hover effect overlay */}
        <motion.div
          className="absolute inset-0 rounded-xl bg-white/10 opacity-0 pointer-events-none"
          animate={{ opacity: isHovering ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        />

        {/* Focus ring */}
        <motion.div
          className="absolute inset-0 rounded-xl ring-2 ring-transparent"
          style={{ ringColor: config.brandColor }}
          animate={{ 
            ringOpacity: isHovering ? 0.3 : 0,
            scale: isHovering ? 1.02 : 1
          }}
          transition={{ duration: 0.2 }}
        />
      </button>
    </motion.div>
  );
};

// Preset social login button components
export const GoogleLoginButton: React.FC<Omit<SocialLoginButtonProps, 'provider'>> = (props) => (
  <SocialLoginButton provider="google" {...props} />
);

export const GitHubLoginButton: React.FC<Omit<SocialLoginButtonProps, 'provider'>> = (props) => (
  <SocialLoginButton provider="github" {...props} />
);

export const FacebookLoginButton: React.FC<Omit<SocialLoginButtonProps, 'provider'>> = (props) => (
  <SocialLoginButton provider="facebook" {...props} />
);

export const TwitterLoginButton: React.FC<Omit<SocialLoginButtonProps, 'provider'>> = (props) => (
  <SocialLoginButton provider="twitter" {...props} />
);

export const LinkedInLoginButton: React.FC<Omit<SocialLoginButtonProps, 'provider'>> = (props) => (
  <SocialLoginButton provider="linkedin" {...props} />
);