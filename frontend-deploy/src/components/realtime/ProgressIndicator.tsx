/**
 * Progress Indicator Component
 * 
 * Real-time progress indicator for video generation and other long-running tasks.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useGenerationProgress } from '../../hooks/useRealTime';
import { cn } from '../../lib/component-variants';

interface ProgressIndicatorProps {
  jobId: string | null;
  className?: string;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onComplete?: () => void;
}

const sizeConfig = {
  sm: {
    container: 'h-2',
    text: 'text-xs',
    icon: 'h-4 w-4',
  },
  md: {
    container: 'h-3',
    text: 'text-sm',
    icon: 'h-5 w-5',
  },
  lg: {
    container: 'h-4',
    text: 'text-base',
    icon: 'h-6 w-6',
  },
};

export const ProgressIndicator = ({
  jobId,
  className,
  showDetails = true,
  size = 'md',
  onComplete,
}: ProgressIndicatorProps) => {
  const { progress, isComplete, percentage, stage, message, isSubscribed } = useGenerationProgress(jobId);
  const sizeStyles = sizeConfig[size];

  // Call onComplete when progress is complete
  React.useEffect(() => {
    if (isComplete && onComplete) {
      onComplete();
    }
  }, [isComplete, onComplete]);

  if (!jobId || !isSubscribed) {
    return null;
  }

  const getStatusIcon = () => {
    if (isComplete) {
      return <CheckCircle className={cn(sizeStyles.icon, 'text-green-600')} />;
    }
    if (progress && percentage > 0) {
      return <Loader2 className={cn(sizeStyles.icon, 'text-blue-600 animate-spin')} />;
    }
    return <Clock className={cn(sizeStyles.icon, 'text-gray-600')} />;
  };

  const getStatusColor = () => {
    if (isComplete) return 'bg-green-600';
    if (percentage > 0) return 'bg-blue-600';
    return 'bg-gray-400';
  };

  return (
    <div className={cn('space-y-2', className)}>
      {showDetails && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className={cn('font-medium', sizeStyles.text)}>
              {isComplete ? 'Complete' : stage}
            </span>
          </div>
          <span className={cn('font-mono', sizeStyles.text)}>
            {Math.round(percentage)}%
          </span>
        </div>
      )}

      {/* Progress bar */}
      <div className={cn(
        'w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden',
        sizeStyles.container
      )}>
        <motion.div
          className={cn('h-full rounded-full', getStatusColor())}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ 
            type: 'spring', 
            stiffness: 100, 
            damping: 15,
            duration: 0.5 
          }}
        />
      </div>

      {showDetails && message && (
        <p className={cn('text-gray-600 dark:text-gray-400', sizeStyles.text)}>
          {message}
        </p>
      )}
    </div>
  );
};

export default ProgressIndicator;