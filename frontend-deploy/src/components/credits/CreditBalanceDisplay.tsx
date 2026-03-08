/**
 * Credit Balance Display Component
 * 
 * An animated credit balance display with live updates, showing current balance,
 * pending credits, and reserved credits with smooth animations.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, TrendingUp, Clock, Lock, Sparkles } from 'lucide-react';
import { useCredits } from '../../hooks/useCredits';
import { cn } from '../../lib/utils';
import { LoadingSpinner } from '../ui/LoadingSpinner';

export interface CreditBalanceDisplayProps {
  className?: string;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'card' | 'minimal';
}

const CreditBalanceDisplay: React.FC<CreditBalanceDisplayProps> = ({
  className,
  showDetails = true,
  size = 'md',
  variant = 'default',
}) => {
  const { balance, isLoadingBalance, formatCredits, formatCreditValue } = useCredits();

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const containerClasses = {
    default: 'bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-6',
    card: 'bg-card border border-border rounded-lg p-4 shadow-sm',
    minimal: 'bg-transparent',
  };

  if (isLoadingBalance) {
    return (
      <div className={cn(containerClasses[variant], sizeClasses[size], className)}>
        <div className="flex items-center justify-center space-x-2">
          <LoadingSpinner size="sm" />
          <span className="text-muted-foreground">Loading balance...</span>
        </div>
      </div>
    );
  }

  if (!balance) {
    return (
      <div className={cn(containerClasses[variant], sizeClasses[size], className)}>
        <div className="text-center text-muted-foreground">
          Unable to load credit balance
        </div>
      </div>
    );
  }

  const availableCredits = balance.current - balance.reserved;

  return (
    <div className={cn(containerClasses[variant], sizeClasses[size], className)}>
      {/* Main Balance */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <motion.div
            className="relative"
            whileHover={{ scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <div className="p-2 bg-primary/10 rounded-lg">
              <Coins className="h-6 w-6 text-primary" />
            </div>
            {balance.pending > 0 && (
              <motion.div
                className="absolute -top-1 -right-1 h-3 w-3 bg-success rounded-full"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              />
            )}
          </motion.div>
          
          <div>
            <div className="text-sm text-muted-foreground">Available Credits</div>
            <AnimatePresence mode="wait">
              <motion.div
                key={availableCredits}
                className="text-2xl font-bold text-foreground"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {formatCredits(availableCredits)}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="text-right">
          <div className="text-sm text-muted-foreground">Value</div>
          <AnimatePresence mode="wait">
            <motion.div
              key={availableCredits}
              className="text-lg font-semibold text-success"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {formatCreditValue(availableCredits)}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Details */}
      {showDetails && (
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.3 }}
        >
          {/* Current Balance Breakdown */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 text-muted-foreground mb-1">
                <Sparkles className="h-3 w-3" />
                <span>Total</span>
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={balance.current}
                  className="font-semibold"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                >
                  {formatCredits(balance.current)}
                </motion.div>
              </AnimatePresence>
            </div>

            {balance.reserved > 0 && (
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 text-muted-foreground mb-1">
                  <Lock className="h-3 w-3" />
                  <span>Reserved</span>
                </div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={balance.reserved}
                    className="font-semibold text-warning"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                  >
                    {formatCredits(balance.reserved)}
                  </motion.div>
                </AnimatePresence>
              </div>
            )}

            {balance.pending > 0 && (
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 text-muted-foreground mb-1">
                  <Clock className="h-3 w-3" />
                  <span>Pending</span>
                </div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={balance.pending}
                    className="font-semibold text-info"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                  >
                    {formatCredits(balance.pending)}
                  </motion.div>
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Lifetime Credits */}
          <div className="pt-3 border-t border-border/50">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2 text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span>Lifetime Credits</span>
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={balance.lifetime}
                  className="font-semibold"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {formatCredits(balance.lifetime)}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}

      {/* Low Balance Warning */}
      <AnimatePresence>
        {availableCredits < 10 && (
          <motion.div
            className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded-lg"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center space-x-2 text-warning text-sm">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
              >
                ⚠️
              </motion.div>
              <span>Low credit balance. Consider purchasing more credits.</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CreditBalanceDisplay;