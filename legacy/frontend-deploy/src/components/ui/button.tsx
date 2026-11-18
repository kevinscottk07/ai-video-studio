/**
 * Button Component
 * 
 * A versatile button component built with Radix UI primitives and styled
 * with our design system. Includes Framer Motion animations and full
 * accessibility support.
 */

import React from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { Slot } from '@radix-ui/react-slot'
import { cn, buttonVariants, focusRing } from '../../lib/component-variants'

export interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: keyof typeof buttonVariants.variant
  size?: keyof typeof buttonVariants.size
  asChild?: boolean
  loading?: boolean
  disabled?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = 'default', 
    size = 'default', 
    asChild = false, 
    loading = false,
    disabled = false,
    children,
    ...props 
  }, ref) => {
    const Comp = asChild ? Slot : motion.button
    
    const buttonClasses = cn(
      // Base button styles
      'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors',
      'disabled:pointer-events-none disabled:opacity-50',
      focusRing,
      
      // Variant and size classes
      buttonVariants.variant[variant],
      buttonVariants.size[size],
      
      // Loading state
      loading && 'cursor-wait',
      
      className
    )

    const motionProps = {
      whileHover: { scale: 1.02 },
      whileTap: { scale: 0.98 },
      transition: { type: 'spring', stiffness: 400, damping: 17 },
    }

    return (
      <Comp
        className={buttonClasses}
        ref={ref}
        disabled={disabled || loading}
        {...(!asChild && motionProps)}
        {...props}
      >
        {loading && (
          <motion.div
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          />
        )}
        {children}
      </Comp>
    )
  }
)

Button.displayName = 'Button'

export { Button, buttonVariants }