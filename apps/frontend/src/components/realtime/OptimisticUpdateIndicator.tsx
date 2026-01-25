/**
 * Optimistic Update Indicator Component
 * 
 * Shows pending optimistic updates with visual feedback.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useOptimisticUpdates } from '../../hooks/useRealTime';
import { cn } from '../../lib/component-variants';

interface OptimisticUpdateIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export const OptimisticUpdateIndicator = ({
  className,
  showDetails = false,
}: OptimisticUpdateIndicatorProps) => {
  const { pendingUpdates, hasPendingUpdates } = useOptimisticUpdates();

  if (!hasPendingUpdates) {
    return null;
  }

  const formatUpdateType = (type: string) => {
    return type.replace(/[_:]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatTime = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.floor(seconds / 60)}m ago`;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className={cn(
          'fixed bottom-4 left-4 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 max-w-sm z-40',
          className
        )}
      >
        <div className="flex items-center gap-2 mb-2">
          <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {pendingUpdates.length} pending update{pendingUpdates.length !== 1 ? 's' : ''}
          </span>
        </div>

        {showDetails && (
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {pendingUpdates.map((update) => (
              <div
                key={update.id}
                className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400"
              >
                <span className="truncate flex-1">
                  {formatUpdateType(update.type)}
                </span>
                <span className="ml-2 flex-shrink-0">
                  {formatTime(update.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Syncing with server...
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OptimisticUpdateIndicator;