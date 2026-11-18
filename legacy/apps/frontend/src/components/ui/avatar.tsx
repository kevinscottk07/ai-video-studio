/**
 * Avatar Component
 * 
 * Flexible avatar component with image fallback and customizable styling.
 * Features smooth loading states and accessibility support.
 */

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { User } from 'lucide-react';

interface AvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = '',
  fallback,
  size = 'md',
  className = '',
  onClick,
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(!!src);

  const handleImageError = useCallback(() => {
    setImageError(true);
    setImageLoading(false);
  }, []);

  const handleImageLoad = useCallback(() => {
    setImageLoading(false);
  }, []);

  const baseClasses = `
    relative inline-flex items-center justify-center rounded-full 
    bg-gray-100 dark:bg-gray-700 overflow-hidden flex-shrink-0
    ${sizeClasses[size]}
    ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
    ${className}
  `;

  const content = () => {
    // Show image if available and not errored
    if (src && !imageError) {
      return (
        <>
          <img
            src={src}
            alt={alt}
            className={`w-full h-full object-cover ${imageLoading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
            onError={handleImageError}
            onLoad={handleImageLoad}
          />
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </>
      );
    }

    // Show fallback text if provided
    if (fallback) {
      return (
        <span className="font-medium text-gray-600 dark:text-gray-300 select-none">
          {fallback}
        </span>
      );
    }

    // Show default user icon
    return (
      <User className="w-1/2 h-1/2 text-gray-400 dark:text-gray-500" />
    );
  };

  if (onClick) {
    return (
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className={baseClasses}
        type="button"
      >
        {content()}
      </motion.button>
    );
  }

  return (
    <div className={baseClasses}>
      {content()}
    </div>
  );
};