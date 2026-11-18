/**
 * Connection Status Component
 * 
 * Displays the current real-time connection status with visual indicators.
 */

import { motion } from 'framer-motion';
import { Wifi, WifiOff, RotateCw, AlertTriangle } from 'lucide-react';
import { useRealtime } from '../../providers/RealtimeProvider';
import { ConnectionState } from '../../services/realTimeClient';
import { cn } from '../../lib/component-variants';

interface ConnectionStatusProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig = {
  [ConnectionState.CONNECTED]: {
    icon: Wifi,
    text: 'Connected',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
  },
  [ConnectionState.CONNECTING]: {
    icon: RotateCw,
    text: 'Connecting...',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    animate: true,
  },
  [ConnectionState.RECONNECTING]: {
    icon: RotateCw,
    text: 'Reconnecting...',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    animate: true,
  },
  [ConnectionState.DISCONNECTED]: {
    icon: WifiOff,
    text: 'Disconnected',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-900/20',
    borderColor: 'border-gray-200 dark:border-gray-800',
  },
  [ConnectionState.ERROR]: {
    icon: AlertTriangle,
    text: 'Connection Error',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
  },
};

const sizeConfig = {
  sm: {
    icon: 'h-3 w-3',
    text: 'text-xs',
    padding: 'px-2 py-1',
  },
  md: {
    icon: 'h-4 w-4',
    text: 'text-sm',
    padding: 'px-3 py-1.5',
  },
  lg: {
    icon: 'h-5 w-5',
    text: 'text-base',
    padding: 'px-4 py-2',
  },
};

export const ConnectionStatus = ({ 
  className, 
  showText = true, 
  size = 'md' 
}: ConnectionStatusProps) => {
  const { connectionState, error } = useRealtime();
  const config = statusConfig[connectionState];
  const sizeStyles = sizeConfig[size];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border',
        config.bgColor,
        config.borderColor,
        sizeStyles.padding,
        className
      )}
      title={error ? `${config.text}: ${error.message}` : config.text}
    >
      <motion.div
        animate={config.animate ? { rotate: 360 } : {}}
        transition={config.animate ? { 
          duration: 1, 
          repeat: Infinity, 
          ease: 'linear' 
        } : {}}
      >
        <Icon className={cn(sizeStyles.icon, config.color)} />
      </motion.div>
      
      {showText && (
        <span className={cn(sizeStyles.text, config.color, 'font-medium')}>
          {config.text}
        </span>
      )}
    </div>
  );
};

export default ConnectionStatus;