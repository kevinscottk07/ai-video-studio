/**
 * Avatar Component
 * 
 * Flexible avatar component with image fallback and customizable styling.
 * Features smooth loading states and accessibility support.
 */

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AvatarProps {
  className?: string;
  children?: React.ReactNode;
}

interface AvatarImageProps {
  src?: string;
  alt?: string;
  className?: string;
}

interface AvatarFallbackProps {
  className?: string;
  children?: React.ReactNode;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
};

export const Avatar: React.FC<AvatarProps> = ({
  className = '',
  children,
}) => {
  const baseClasses = cn(
    "relative inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden flex-shrink-0 w-10 h-10",
    className
  );

  return (
    <div className={baseClasses}>
      {children}
    </div>
  );
};

export const AvatarImage: React.FC<AvatarImageProps> = ({
  src,
  alt = '',
  className = '',
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

  if (!src || imageError) {
    return null;
  }

  return (
    <>
      <img
        src={src}
        alt={alt}
        className={cn(
          "w-full h-full object-cover transition-opacity",
          imageLoading ? 'opacity-0' : 'opacity-100',
          className
        )}
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
};

export const AvatarFallback: React.FC<AvatarFallbackProps> = ({
  className = '',
  children,
}) => {
  return (
    <div className={cn("flex items-center justify-center w-full h-full", className)}>
      {children || <User className="w-1/2 h-1/2 text-gray-400 dark:text-gray-500" />}
    </div>
  );
};