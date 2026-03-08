/**
 * Trending Tags Component
 * 
 * Displays trending hashtags with selection functionality and smooth animations.
 * Features real-time updates and professional design.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Hash, Sparkles } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { communityApi } from '../../services/api/communityApi';

interface TrendingTagsProps {
  onTagSelect?: (tag: string) => void;
  selectedTags?: string[];
  className?: string;
}

export const TrendingTags: React.FC<TrendingTagsProps> = ({
  onTagSelect,
  selectedTags = [],
  className = '',
}) => {
  const [showAll, setShowAll] = useState(false);

  // Fetch trending tags
  const {
    data: tags,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['trending-tags'],
    queryFn: () => communityApi.getTrendingTags(20),
    staleTime: 1000 * 60 * 10, // 10 minutes
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  });

  const displayTags = showAll ? tags : tags?.slice(0, 8);

  if (isError) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="text-center">
          <TrendingUp className="w-8 h-8 mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Unable to load trending tags
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="text-xs"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-blue-500" />
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Trending Tags
        </h3>
        {isLoading && <LoadingSpinner size="xs" />}
      </div>

      {/* Tags */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
              style={{ width: `${60 + Math.random() * 40}%` }}
            />
          ))}
        </div>
      ) : !tags || tags.length === 0 ? (
        <div className="text-center py-4">
          <Hash className="w-8 h-8 mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No trending tags yet
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Tags Grid */}
          <div className="flex flex-wrap gap-2">
            <AnimatePresence mode="popLayout">
              {displayTags?.map((tag, index) => {
                const isSelected = selectedTags.includes(tag);
                
                return (
                  <motion.div
                    key={tag}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ delay: index * 0.05 }}
                    layout
                  >
                    <Badge
                      variant={isSelected ? "default" : "secondary"}
                      className={`
                        cursor-pointer transition-all duration-200 hover:scale-105
                        ${isSelected 
                          ? 'bg-blue-500 text-white hover:bg-blue-600' 
                          : 'hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20'
                        }
                      `}
                      onClick={() => onTagSelect?.(tag)}
                    >
                      <Hash className="w-3 h-3 mr-1" />
                      {tag}
                    </Badge>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Show More/Less Button */}
          {tags && tags.length > 8 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAll(!showAll)}
                className="text-xs text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                {showAll ? (
                  <>Show Less</>
                ) : (
                  <>
                    Show {tags.length - 8} More
                    <Sparkles className="w-3 h-3 ml-1" />
                  </>
                )}
              </Button>
            </motion.div>
          )}

          {/* Tag Stats */}
          {tags && tags.length > 0 && (
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Updated 5 min ago</span>
                <span>{tags.length} trending</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selected Tags Summary */}
      {selectedTags.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center gap-2 mb-2">
            <Hash className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Active Filters ({selectedTags.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {selectedTags.map(tag => (
              <Badge
                key={tag}
                variant="default"
                className="text-xs bg-blue-500 text-white"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};