/**
 * Community Feed Component
 * 
 * Instagram-like feed with infinite scroll, real-time updates, and optimistic UI.
 * Features smooth animations, skeleton loading, and professional design.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { Search, Filter, TrendingUp, Sparkles } from 'lucide-react';
import { PostCard } from './PostCard';
import { TrendingTags } from './TrendingTags';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem } from '../ui/select';
import { Badge } from '../ui/badge';
import { useCommunityFeed } from '../../hooks/useRealTime';
import { communityApi } from '../../services/api/communityApi';

export interface CommunityPost {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl: string;
  tags: string[];
  createdAt: string;
  user: {
    id: string;
    displayName: string;
    profileImage?: string;
  };
  project: {
    id: string;
    title: string;
  };
  metrics: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
  };
  isLikedByUser?: boolean;
}

interface CommunityFeedProps {
  className?: string;
}

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Latest' },
  { value: 'likes', label: 'Most Liked' },
  { value: 'comments', label: 'Most Discussed' },
  { value: 'views', label: 'Most Viewed' },
];

export const CommunityFeed: React.FC<CommunityFeedProps> = ({ className = '' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'createdAt' | 'likes' | 'comments' | 'views'>('createdAt');
  const [showFilters, setShowFilters] = useState(false);

  // Real-time community updates
  const communityFeed = useCommunityFeed();

  // Infinite scroll setup
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: '100px',
  });

  // Fetch community feed with infinite scroll
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['community-feed', searchQuery, selectedTags, sortBy],
    queryFn: ({ pageParam = 0 }) =>
      communityApi.getFeed({
        search: searchQuery || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        sortBy,
        sortOrder: 'desc',
        limit: 20,
        offset: pageParam,
      }),
    getNextPageParam: (lastPage, allPages) => {
      const totalLoaded = allPages.reduce((sum, page) => sum + page.posts.length, 0);
      return lastPage.hasMore ? totalLoaded : undefined;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Load more when in view
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Handle real-time updates
  useEffect(() => {
    if (communityFeed?.updates) {
      // Refetch when new posts are added
      const hasNewPosts = communityFeed.updates.some(update => update.type === 'new_post');
      if (hasNewPosts) {
        refetch();
      }
    }
  }, [communityFeed?.updates, refetch]);

  // Flatten all posts from pages
  const allPosts = useMemo(() => {
    return data?.pages.flatMap(page => page.posts) || [];
  }, [data]);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Handle tag selection
  const handleTagSelect = useCallback((tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  }, []);

  // Handle tag removal
  const handleTagRemove = useCallback((tag: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tag));
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedTags([]);
    setSortBy('createdAt');
  }, []);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-red-500 mb-4">
          <Sparkles className="w-12 h-12 mx-auto mb-2" />
          <h3 className="text-lg font-semibold">Unable to load community feed</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Please check your connection and try again
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      {/* Header */}
      <div className="mb-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Community Feed
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Discover amazing AI-generated videos from our creative community
          </p>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search posts, creators, or tags..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 pr-4 py-3 text-lg"
            />
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap items-center gap-4">
            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value as typeof sortBy)}
            >
              <SelectTrigger className="w-48">
                <span>Sort by</span>
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
              {(selectedTags.length > 0 || searchQuery) && (
                <Badge variant="secondary" className="ml-1">
                  {selectedTags.length + (searchQuery ? 1 : 0)}
                </Badge>
              )}
            </Button>

            {(selectedTags.length > 0 || searchQuery) && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="text-sm"
              >
                Clear all
              </Button>
            )}
          </div>

          {/* Active Filters */}
          {selectedTags.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap gap-2"
            >
              {selectedTags.map(tag => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="cursor-pointer hover:bg-red-100 hover:text-red-700 transition-colors"
                  onClick={() => handleTagRemove(tag)}
                >
                  #{tag} ×
                </Badge>
              ))}
            </motion.div>
          )}
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Feed */}
        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="space-y-6">
              {[...Array(6)].map((_, i) => (
                <PostCardSkeleton key={i} />
              ))}
            </div>
          ) : allPosts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <TrendingUp className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No posts found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {searchQuery || selectedTags.length > 0
                  ? 'Try adjusting your search or filters'
                  : 'Be the first to share your creation with the community!'}
              </p>
              {(searchQuery || selectedTags.length > 0) && (
                <Button onClick={clearFilters} variant="outline">
                  Clear filters
                </Button>
              )}
            </motion.div>
          ) : (
            <div className="space-y-6">
              <AnimatePresence mode="popLayout">
                {allPosts.map((post, index) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    layout
                  >
                    <PostCard
                      post={post}
                      onLike={(postId, isLiked) => {
                        // Optimistic update handled by PostCard
                      }}
                      onComment={(postId, comment) => {
                        // Optimistic update handled by PostCard
                      }}
                      onShare={(postId, platform) => {
                        // Optimistic update handled by PostCard
                      }}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Load More Trigger */}
              {hasNextPage && (
                <div ref={loadMoreRef} className="flex justify-center py-8">
                  {isFetchingNextPage ? (
                    <LoadingSpinner size="lg" />
                  ) : (
                    <Button
                      onClick={() => fetchNextPage()}
                      variant="outline"
                      className="px-8"
                    >
                      Load More
                    </Button>
                  )}
                </div>
              )}

              {!hasNextPage && allPosts.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8 text-gray-500 dark:text-gray-400"
                >
                  <Sparkles className="w-8 h-8 mx-auto mb-2" />
                  <p>You've reached the end of the feed!</p>
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-6">
            {/* Trending Tags */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <TrendingTags
                onTagSelect={handleTagSelect}
                selectedTags={selectedTags}
              />
            </motion.div>

            {/* Community Stats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                Community Stats
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total Posts</span>
                  <span className="font-medium">{data?.pages[0]?.total || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Active Creators</span>
                  <span className="font-medium">1.2k+</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Videos Generated</span>
                  <span className="font-medium">15.8k+</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Skeleton component for loading state
const PostCardSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
        <div className="flex-1">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-24" />
        </div>
      </div>

      {/* Content */}
      <div className="space-y-3 mb-4">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
      </div>

      {/* Video placeholder */}
      <div className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mb-4" />

      {/* Actions */}
      <div className="flex items-center gap-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16" />
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16" />
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16" />
      </div>
    </div>
  </div>
);