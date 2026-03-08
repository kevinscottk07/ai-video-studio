/**
 * Masonry Layout Component
 * 
 * A responsive masonry layout component that automatically arranges items
 * in columns with optimal spacing. Perfect for project galleries with
 * varying content heights.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface MasonryProps {
  children: React.ReactNode[];
  columns?: {
    default: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  };
  gap?: number;
  className?: string;
}

export const Masonry: React.FC<MasonryProps> = ({
  children,
  columns = { default: 1, sm: 2, md: 3, lg: 4, xl: 5, '2xl': 6 },
  gap = 24,
  className,
}) => {
  const [columnCount, setColumnCount] = useState(columns.default);
  const [columnHeights, setColumnHeights] = useState<number[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update column count based on screen size
  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth;
      let newColumnCount = columns.default;

      if (width >= 1536 && columns['2xl']) newColumnCount = columns['2xl'];
      else if (width >= 1280 && columns.xl) newColumnCount = columns.xl;
      else if (width >= 1024 && columns.lg) newColumnCount = columns.lg;
      else if (width >= 768 && columns.md) newColumnCount = columns.md;
      else if (width >= 640 && columns.sm) newColumnCount = columns.sm;

      setColumnCount(newColumnCount);
      setColumnHeights(new Array(newColumnCount).fill(0));
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, [columns]);

  // Calculate item positions
  const getItemPosition = useCallback((index: number) => {
    if (columnHeights.length === 0) return { column: 0, top: 0 };

    // Find the shortest column
    const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));
    const top = columnHeights[shortestColumnIndex];

    return {
      column: shortestColumnIndex,
      top,
    };
  }, [columnHeights]);

  // Update column height after item is positioned
  const updateColumnHeight = useCallback((column: number, itemHeight: number) => {
    setColumnHeights(prev => {
      const newHeights = [...prev];
      newHeights[column] += itemHeight + gap;
      return newHeights;
    });
  }, [gap]);

  // Calculate container height
  const containerHeight = Math.max(...columnHeights);

  return (
    <div
      ref={containerRef}
      className={cn('relative', className)}
      style={{ height: containerHeight }}
    >
      <AnimatePresence>
        {children.map((child, index) => (
          <MasonryItem
            key={index}
            index={index}
            columnCount={columnCount}
            gap={gap}
            getItemPosition={getItemPosition}
            updateColumnHeight={updateColumnHeight}
          >
            {child}
          </MasonryItem>
        ))}
      </AnimatePresence>
    </div>
  );
};

interface MasonryItemProps {
  children: React.ReactNode;
  index: number;
  columnCount: number;
  gap: number;
  getItemPosition: (index: number) => { column: number; top: number };
  updateColumnHeight: (column: number, itemHeight: number) => void;
}

const MasonryItem: React.FC<MasonryItemProps> = ({
  children,
  index,
  columnCount,
  gap,
  getItemPosition,
  updateColumnHeight,
}) => {
  const itemRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ column: 0, top: 0 });
  const [isPositioned, setIsPositioned] = useState(false);

  useEffect(() => {
    if (itemRef.current && columnCount > 0) {
      const itemPosition = getItemPosition(index);
      setPosition(itemPosition);

      // Update column height after positioning
      const itemHeight = itemRef.current.offsetHeight;
      updateColumnHeight(itemPosition.column, itemHeight);
      setIsPositioned(true);
    }
  }, [index, columnCount, getItemPosition, updateColumnHeight]);

  const columnWidth = `calc((100% - ${(columnCount - 1) * gap}px) / ${columnCount})`;
  const left = `calc(${position.column} * (${columnWidth} + ${gap}px))`;

  return (
    <motion.div
      ref={itemRef}
      className="absolute"
      style={{
        width: columnWidth,
        left,
        top: position.top,
      }}
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ 
        opacity: isPositioned ? 1 : 0, 
        y: isPositioned ? 0 : 20,
        scale: isPositioned ? 1 : 0.9,
      }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      transition={{ 
        duration: 0.4,
        delay: index * 0.05,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      whileHover={{ y: -4 }}
    >
      {children}
    </motion.div>
  );
};

// Responsive masonry grid using CSS Grid as fallback
export const MasonryGrid: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  return (
    <div
      className={cn(
        'grid gap-6',
        'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6',
        // CSS Grid masonry (when supported)
        'supports-[grid-template-rows:masonry]:grid-rows-[masonry]',
        className
      )}
    >
      {children}
    </div>
  );
};