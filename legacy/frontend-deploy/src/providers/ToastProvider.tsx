/**
 * Enhanced Toast Provider
 * 
 * Provides toast notifications with real-time integration and improved UX.
 * Supports different notification types, persistence, and auto-dismissal.
 */

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/component-variants';

interface ToastMessage {
  id: string;
  title?: string;
  description: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  data?: any;
}

interface ToastContextType {
  toast: (message: Omit<ToastMessage, 'id'>) => string;
  success: (description: string, title?: string, options?: Partial<ToastMessage>) => string;
  error: (description: string, title?: string, options?: Partial<ToastMessage>) => string;
  warning: (description: string, title?: string, options?: Partial<ToastMessage>) => string;
  info: (description: string, title?: string, options?: Partial<ToastMessage>) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
  update: (id: string, updates: Partial<ToastMessage>) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: ReactNode;
  maxToasts?: number;
}

const toastIcons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const toastStyles = {
  success: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    text: 'text-green-800 dark:text-green-200',
    icon: 'text-green-600 dark:text-green-400',
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-800 dark:text-red-200',
    icon: 'text-red-600 dark:text-red-400',
  },
  warning: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-200 dark:border-yellow-800',
    text: 'text-yellow-800 dark:text-yellow-200',
    icon: 'text-yellow-600 dark:text-yellow-400',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-800 dark:text-blue-200',
    icon: 'text-blue-600 dark:text-blue-400',
  },
};

const ToastComponent = ({ 
  toast, 
  onDismiss 
}: { 
  toast: ToastMessage; 
  onDismiss: (id: string) => void;
}) => {
  const Icon = toastIcons[toast.type];
  const styles = toastStyles[toast.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn(
        'relative flex items-start gap-3 p-4 rounded-lg border shadow-lg backdrop-blur-sm',
        'max-w-md w-full pointer-events-auto',
        styles.bg,
        styles.border
      )}
    >
      <div className="flex-shrink-0">
        <Icon className={cn('h-5 w-5', styles.icon)} />
      </div>
      
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className={cn('text-sm font-semibold', styles.text)}>
            {toast.title}
          </p>
        )}
        <p className={cn('text-sm', styles.text, toast.title && 'mt-1')}>
          {toast.description}
        </p>
        
        {toast.action && (
          <div className="mt-3">
            <button
              onClick={toast.action.onClick}
              className={cn(
                'text-sm font-medium underline hover:no-underline',
                styles.text
              )}
            >
              {toast.action.label}
            </button>
          </div>
        )}
      </div>
      
      <button
        onClick={() => onDismiss(toast.id)}
        className={cn(
          'flex-shrink-0 p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5',
          'transition-colors duration-200',
          styles.text
        )}
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
};

export const ToastProvider = ({ children, maxToasts = 5 }: ToastProviderProps) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const toast = useCallback((message: Omit<ToastMessage, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newToast: ToastMessage = {
      id,
      duration: 5000,
      persistent: false,
      ...message,
    };

    setToasts(prev => {
      // Remove oldest toasts if we exceed maxToasts
      const updatedToasts = [newToast, ...prev];
      return updatedToasts.slice(0, maxToasts);
    });

    // Auto remove after duration (unless persistent)
    if (!newToast.persistent && newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }

    return id;
  }, [maxToasts, removeToast]);

  const success = useCallback((
    description: string, 
    title?: string, 
    options?: Partial<ToastMessage>
  ) => {
    return toast({ type: 'success', description, title, ...options });
  }, [toast]);

  const error = useCallback((
    description: string, 
    title?: string, 
    options?: Partial<ToastMessage>
  ) => {
    return toast({ 
      type: 'error', 
      description, 
      title, 
      duration: 7000, // Longer duration for errors
      ...options 
    });
  }, [toast]);

  const warning = useCallback((
    description: string, 
    title?: string, 
    options?: Partial<ToastMessage>
  ) => {
    return toast({ type: 'warning', description, title, ...options });
  }, [toast]);

  const info = useCallback((
    description: string, 
    title?: string, 
    options?: Partial<ToastMessage>
  ) => {
    return toast({ type: 'info', description, title, ...options });
  }, [toast]);

  const dismiss = useCallback((id: string) => {
    removeToast(id);
  }, [removeToast]);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const update = useCallback((id: string, updates: Partial<ToastMessage>) => {
    setToasts(prev => prev.map(toast => 
      toast.id === id ? { ...toast, ...updates } : toast
    ));
  }, []);

  const value: ToastContextType = {
    toast,
    success,
    error,
    warning,
    info,
    dismiss,
    dismissAll,
    update,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map(toast => (
            <ToastComponent
              key={toast.id}
              toast={toast}
              onDismiss={removeToast}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};