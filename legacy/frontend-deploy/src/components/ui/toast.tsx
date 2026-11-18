/**
 * Toast Component
 * 
 * A toast notification component built with Radix UI Toast primitive.
 * Features smooth animations, auto-dismiss, and accessibility.
 */

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as Toast from '@radix-ui/react-toast'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { cn } from '../../lib/component-variants'

// Toast Provider
export interface ToastProviderProps {
  children: React.ReactNode
  swipeDirection?: 'right' | 'left' | 'up' | 'down'
  duration?: number
}

const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  swipeDirection = 'right',
  duration = 5000,
}) => {
  return (
    <Toast.Provider swipeDirection={swipeDirection} duration={duration}>
      {children}
      <ToastViewport />
    </Toast.Provider>
  )
}

// Toast Viewport
const ToastViewport: React.FC = () => {
  return (
    <Toast.Viewport className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]" />
  )
}

// Toast variants
const toastVariants = {
  default: {
    bg: 'bg-background',
    border: 'border-border',
    text: 'text-foreground',
    icon: null,
  },
  success: {
    bg: 'bg-success/10',
    border: 'border-success/20',
    text: 'text-success',
    icon: CheckCircle,
  },
  error: {
    bg: 'bg-destructive/10',
    border: 'border-destructive/20',
    text: 'text-destructive',
    icon: AlertCircle,
  },
  warning: {
    bg: 'bg-warning/10',
    border: 'border-warning/20',
    text: 'text-warning',
    icon: AlertTriangle,
  },
  info: {
    bg: 'bg-info/10',
    border: 'border-info/20',
    text: 'text-info',
    icon: Info,
  },
} as const

// Main Toast Component
export interface ToastProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title?: string
  description?: string
  variant?: keyof typeof toastVariants
  action?: React.ReactNode
  className?: string
  duration?: number
}

const ToastRoot: React.FC<ToastProps> = ({
  open,
  onOpenChange,
  title,
  description,
  variant = 'default',
  action,
  className,
  duration,
}) => {
  const variantConfig = toastVariants[variant]
  const Icon = variantConfig.icon

  return (
    <AnimatePresence>
      {open && (
        <Toast.Root
          className={cn(
            'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all',
            'data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full',
            variantConfig.bg,
            variantConfig.border,
            className
          )}
          open={open}
          onOpenChange={onOpenChange}
          duration={duration}
        >
          <div className="flex items-start space-x-3">
            {Icon && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                <Icon className={cn('h-5 w-5 mt-0.5', variantConfig.text)} />
              </motion.div>
            )}
            
            <div className="grid gap-1">
              {title && (
                <Toast.Title className="text-sm font-semibold">
                  {title}
                </Toast.Title>
              )}
              
              {description && (
                <Toast.Description className="text-sm opacity-90">
                  {description}
                </Toast.Description>
              )}
            </div>
          </div>

          {action && (
            <Toast.Action altText="Action" asChild>
              {action}
            </Toast.Action>
          )}

          <Toast.Close className="absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600">
            <X className="h-4 w-4" />
          </Toast.Close>
        </Toast.Root>
      )}
    </AnimatePresence>
  )
}

// Toast Hook for programmatic usage (internal use only)
interface ToastOptions {
  title?: string
  description?: string
  variant?: keyof typeof toastVariants
  duration?: number
  action?: React.ReactNode
}

interface ToastState {
  id: string
  open: boolean
  options: ToastOptions
}

const toastContext = React.createContext<{
  toasts: ToastState[]
  addToast: (options: ToastOptions) => string
  removeToast: (id: string) => void
  updateToast: (id: string, options: Partial<ToastOptions>) => void
}>({
  toasts: [],
  addToast: () => '',
  removeToast: () => {},
  updateToast: () => {},
})

// Internal hook - not exported to avoid conflicts with main ToastProvider
const useToastInternal = () => {
  const context = React.useContext(toastContext)
  if (!context) {
    throw new Error('useToastInternal must be used within a ToastManager')
  }
  return context
}

// Toast Manager Component (for internal UI use only)
export interface ToastManagerProps {
  children: React.ReactNode
}

export const ToastManager: React.FC<ToastManagerProps> = ({ children }) => {
  const [toasts, setToasts] = React.useState<ToastState[]>([])

  const addToast = React.useCallback((options: ToastOptions) => {
    const id = Math.random().toString(36).substr(2, 9)
    setToasts(prev => [...prev, { id, open: true, options }])
    return id
  }, [])

  const removeToast = React.useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const updateToast = React.useCallback((id: string, options: Partial<ToastOptions>) => {
    setToasts(prev => prev.map(toast => 
      toast.id === id 
        ? { ...toast, options: { ...toast.options, ...options } }
        : toast
    ))
  }, [])

  const contextValue = React.useMemo(() => ({
    toasts,
    addToast,
    removeToast,
    updateToast,
  }), [toasts, addToast, removeToast, updateToast])

  return (
    <toastContext.Provider value={contextValue}>
      <ToastProvider>
        {children}
        {toasts.map(toast => (
          <ToastRoot
            key={toast.id}
            open={toast.open}
            onOpenChange={(open) => {
              if (!open) {
                removeToast(toast.id)
              }
            }}
            {...toast.options}
          />
        ))}
      </ToastProvider>
    </toastContext.Provider>
  )
}

// Convenience functions for creating toast options (not for direct use)
export const toastHelpers = {
  success: (options: Omit<ToastOptions, 'variant'>) => {
    return { ...options, variant: 'success' as const }
  },
  error: (options: Omit<ToastOptions, 'variant'>) => {
    return { ...options, variant: 'error' as const }
  },
  warning: (options: Omit<ToastOptions, 'variant'>) => {
    return { ...options, variant: 'warning' as const }
  },
  info: (options: Omit<ToastOptions, 'variant'>) => {
    return { ...options, variant: 'info' as const }
  },
  default: (options: Omit<ToastOptions, 'variant'>) => {
    return { ...options, variant: 'default' as const }
  },
}

export { ToastProvider, ToastRoot as Toast }