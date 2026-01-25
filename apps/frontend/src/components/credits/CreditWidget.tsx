/**
 * Credit Widget Component
 * 
 * A compact credit display widget for headers, sidebars, or dashboards.
 * Shows current balance with quick purchase access.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Plus, TrendingDown, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';
import { CreditPurchaseModal } from './';
import { useCredits } from '../../hooks/useCredits';
import { cn } from '../../lib/utils';
import { LoadingSpinner } from '../ui/LoadingSpinner';

export interface CreditWidgetProps {
  className?: string;
  size?: 'sm' | 'md';
  showPurchaseButton?: boolean;
  onClick?: () => void;
}

const CreditWidget: React.FC<CreditWidgetProps> = ({
  className,
  size = 'md',
  showPurchaseButton = true,
  onClick,
}) => {
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const { balance, isLoadingBalance, formatCredits } = useCredits();

  const sizeClasses = {
    sm: 'text-sm px-3 py-2',
    md: 'text-base px-4 py-3',
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
  };

  if (isLoadingBalance) {
    return (
      <div className={cn(
        'flex items-center space-x-2 bg-card border border-border rounded-lg',
        sizeClasses[size],
        className
      )}>
        <LoadingSpinner size="sm" />
        <span className="text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (!balance) {
    return (
      <div className={cn(
        'flex items-center space-x-2 bg-card border border-border rounded-lg text-muted-foreground',
        sizeClasses[size],
        className
      )}>
        <Coins className={iconSizes[size]} />
        <span>--</span>
      </div>
    );
  }

  const availableCredits = balance.current - balance.reserved;
  const isLowBalance = availableCredits < 10;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      // Default behavior - could navigate to credits page
    }
  };

  return (
    <>
      <motion.div
        className={cn(
          'flex items-center space-x-2 bg-card border border-border rounded-lg cursor-pointer transition-all duration-200',
          'hover:shadow-md hover:border-primary/50',
          isLowBalance && 'border-warning/50 bg-warning/5',
          sizeClasses[size],
          className
        )}
        onClick={handleClick}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Icon with status indicator */}
        <div className="relative">
          <motion.div
            animate={isLowBalance ? { rotate: [0, 5, -5, 0] } : {}}
            transition={{ duration: 0.5, repeat: isLowBalance ? Infinity : 0, repeatDelay: 3 }}
          >
            {isLowBalance ? (
              <AlertTriangle className={cn(iconSizes[size], 'text-warning')} />
            ) : (
              <Coins className={cn(iconSizes[size], 'text-primary')} />
            )}
          </motion.div>
          
          {/* Pending credits indicator */}
          {balance.pending > 0 && (
            <motion.div
              className="absolute -top-1 -right-1 h-2 w-2 bg-success rounded-full"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            />
          )}
        </div>

        {/* Balance display */}
        <div className="flex items-center space-x-1">
          <AnimatePresence mode="wait">
            <motion.span
              key={availableCredits}
              className={cn(
                'font-semibold',
                isLowBalance ? 'text-warning' : 'text-foreground'
              )}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {formatCredits(availableCredits)}
            </motion.span>
          </AnimatePresence>
          
          {size === 'md' && (
            <span className="text-muted-foreground text-sm">credits</span>
          )}
        </div>

        {/* Quick purchase button */}
        {showPurchaseButton && (
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                setShowPurchaseModal(true);
              }}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </motion.div>
        )}
      </motion.div>

      {/* Low balance warning tooltip */}
      <AnimatePresence>
        {isLowBalance && (
          <motion.div
            className="fixed top-20 right-4 bg-warning text-warning-foreground px-3 py-2 rounded-lg shadow-lg text-sm z-50"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center space-x-2">
              <TrendingDown className="h-4 w-4" />
              <span>Low credit balance!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Purchase Modal */}
      <CreditPurchaseModal
        open={showPurchaseModal}
        onOpenChange={setShowPurchaseModal}
      />
    </>
  );
};

export default CreditWidget;