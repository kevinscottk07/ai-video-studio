/**
 * Input Component
 * 
 * A flexible input component with consistent styling, focus states,
 * and accessibility features. Supports various input types and states.
 */

import React from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn, inputVariants, focusRing } from '../../lib/component-variants'

export interface InputProps extends Omit<HTMLMotionProps<'input'>, 'size'> {
  variant?: keyof typeof inputVariants.variant
  size?: keyof typeof inputVariants.size
  error?: boolean
  success?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  label?: string
  helperText?: string
  errorText?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    variant = 'default',
    size = 'default',
    error = false,
    success = false,
    leftIcon,
    rightIcon,
    label,
    helperText,
    errorText,
    type = 'text',
    disabled,
    ...props
  }, ref) => {
    const inputClasses = cn(
      // Base input styles
      'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
      'file:border-0 file:bg-transparent file:text-sm file:font-medium',
      'placeholder:text-muted-foreground',
      'disabled:cursor-not-allowed disabled:opacity-50',
      focusRing,
      
      // Variant and size classes
      inputVariants.variant[variant],
      inputVariants.size[size],
      
      // State classes
      error && 'border-destructive focus-visible:ring-destructive',
      success && 'border-success focus-visible:ring-success',
      
      // Icon padding adjustments
      leftIcon && 'pl-10',
      rightIcon && 'pr-10',
      
      className
    )

    const containerClasses = cn(
      'relative w-full',
      disabled && 'opacity-50'
    )

    const iconClasses = 'absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground'

    return (
      <div className="space-y-2">
        {label && (
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {label}
          </label>
        )}
        
        <div className={containerClasses}>
          {leftIcon && (
            <div className={cn(iconClasses, 'left-3')}>
              {leftIcon}
            </div>
          )}
          
          <motion.input
            type={type}
            className={inputClasses}
            ref={ref}
            disabled={disabled}
            whileFocus={{ scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            {...props}
          />
          
          {rightIcon && (
            <div className={cn(iconClasses, 'right-3')}>
              {rightIcon}
            </div>
          )}
        </div>
        
        {(helperText || errorText) && (
          <motion.p
            className={cn(
              'text-sm',
              error ? 'text-destructive' : 'text-muted-foreground'
            )}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {error ? errorText : helperText}
          </motion.p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input, inputVariants }