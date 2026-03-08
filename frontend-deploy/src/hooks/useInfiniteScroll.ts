/**
 * Infinite Scroll Hook
 * 
 * A premium infinite scroll implementation with intersection observer,
 * smooth loading states, and error handling for the project dashboard.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseInfiniteScrollOptions {
  threshold?: number;
  rootMargin?: string;
  enabled?: boolean;
  hasMore?: boolean;
  loading?: boolean;
}

export interface UseInfiniteScrollReturn {
  loadMoreRef: React.RefObject<HTMLDivElement>;
  isIntersecting: boolean;
}

export const useInfiniteScroll = (
  onLoadMore: () => void | Promise<void>,
  options: UseInfiniteScrollOptions = {}
): UseInfiniteScrollReturn => {
  const {
    threshold = 0.1,
    rootMargin = '100px',
    enabled = true,
    hasMore = true,
    loading = false,
  } = options;

  const [isIntersecting, setIsIntersecting] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const handleIntersection = useCallback(
    async (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      setIsIntersecting(entry.isIntersecting);

      if (
        entry.isIntersecting &&
        enabled &&
        hasMore &&
        !loading
      ) {
        try {
          await onLoadMore();
        } catch (error) {
          console.error('Error loading more items:', error);
        }
      }
    },
    [onLoadMore, enabled, hasMore, loading]
  );

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element || !enabled) return;

    // Disconnect previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Create new observer
    observerRef.current = new IntersectionObserver(handleIntersection, {
      threshold,
      rootMargin,
    });

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleIntersection, threshold, rootMargin, enabled]);

  return {
    loadMoreRef,
    isIntersecting,
  };
};

// Enhanced hook with virtual scrolling capabilities
export interface UseVirtualInfiniteScrollOptions extends UseInfiniteScrollOptions {
  itemHeight?: number;
  containerHeight?: number;
  overscan?: number;
}

export const useVirtualInfiniteScroll = (
  items: any[],
  onLoadMore: () => void | Promise<void>,
  options: UseVirtualInfiniteScrollOptions = {}
) => {
  const {
    itemHeight = 300,
    containerHeight = 600,
    overscan = 5,
    ...infiniteScrollOptions
  } = options;

  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Infinite scroll
  const { loadMoreRef, isIntersecting } = useInfiniteScroll(
    onLoadMore,
    infiniteScrollOptions
  );

  // Check if we need to load more when near the end
  useEffect(() => {
    const shouldLoadMore = endIndex >= items.length - overscan;
    if (shouldLoadMore && infiniteScrollOptions.hasMore && !infiniteScrollOptions.loading) {
      onLoadMore();
    }
  }, [endIndex, items.length, overscan, onLoadMore, infiniteScrollOptions.hasMore, infiniteScrollOptions.loading]);

  return {
    containerRef,
    visibleItems,
    startIndex,
    endIndex,
    totalHeight: items.length * itemHeight,
    handleScroll,
    loadMoreRef,
    isIntersecting,
  };
};