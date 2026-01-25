/**
 * Skeleton Component
 * 
 * Loading skeleton components that match the structure of the final content
 * for smooth loading states in the premium dashboard.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <motion.div
      className={cn(
        'animate-pulse rounded-md bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800',
        'bg-[length:200%_100%] animate-shimmer',
        className
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      {...props}
    />
  );
};

// Project Card Skeleton for masonry layout
export const ProjectCardSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  // Random heights for masonry effect
  const heights = ['h-64', 'h-72', 'h-80', 'h-60', 'h-68'];
  const randomHeight = heights[Math.floor(Math.random() * heights.length)];

  return (
    <motion.div
      className={cn('rounded-lg border bg-card shadow-sm overflow-hidden', randomHeight, className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Thumbnail skeleton */}
      <Skeleton className="aspect-video w-full" />
      
      {/* Content skeleton */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <Skeleton className="h-5 w-3/4" />
        
        {/* Description */}
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
        
        {/* Metadata */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-8" />
          </div>
          <Skeleton className="h-3 w-16" />
        </div>
        
        {/* Creator info */}
        <div className="flex items-center gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
          <Skeleton className="w-6 h-6 rounded-full" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </motion.div>
  );
};

// Stats skeleton
export const StatsCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-2">
        <Skeleton className="w-4 h-4" />
        <Skeleton className="h-3 w-12" />
      </div>
      <Skeleton className="h-8 w-8" />
    </div>
  );
};

// Search skeleton
export const SearchSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      <div className="flex flex-col sm:flex-row gap-3 flex-1">
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-20 w-20 rounded-lg" />
      </div>
    </div>
  );
};