/**
 * Modal Component
 * 
 * A modal dialog component built with Radix UI Dialog primitive.
 * Features smooth animations, focus management, and accessibility.
 */

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn, focusRing } from '../../lib/component-variants'

export interface ModalProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
  title?: string
  description?: string
  showCloseButton?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  className?: string
}

const modalSizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[95vw] max-h-[95vh]',
}

const Modal: React.FC<ModalProps> = ({
  open,
  onOpenChange,
  children,
  title,
  description,
  showCloseButton = true,
  size = 'md',
  className,
}) => {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            {/* Overlay */}
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </Dialog.Overlay>

            {/* Content */}
            <Dialog.Content asChild>
              <motion.div
                className={cn(
                  'fixed left-[50%] top-[50%] z-50 w-full translate-x-[-50%] translate-y-[-50%]',
                  'grid gap-4 border bg-background p-6 shadow-lg',
                  'rounded-lg',
                  modalSizes[size],
                  focusRing,
                  className
                )}
                initial={{ opacity: 0, scale: 0.95, y: '-48%' }}
                animate={{ opacity: 1, scale: 1, y: '-50%' }}
                exit={{ opacity: 0, scale: 0.95, y: '-48%' }}
                transition={{ 
                  type: 'spring', 
                  stiffness: 400, 
                  damping: 30,
                  duration: 0.3 
                }}
              >
                {/* Header */}
                {(title || description || showCloseButton) && (
                  <div className="flex flex-col space-y-1.5 text-center sm:text-left">
                    <div className="flex items-center justify-between">
                      {title && (
                        <Dialog.Title className="text-lg font-semibold leading-none tracking-tight">
                          {title}
                        </Dialog.Title>
                      )}
                      
                      {showCloseButton && (
                        <Dialog.Close asChild>
                          <motion.button
                            className={cn(
                              'rounded-sm opacity-70 ring-offset-background transition-opacity',
                              'hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                              'disabled:pointer-events-none'
                            )}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                          >
                            <X className="h-4 w-4" />
                            <span className="sr-only">Close</span>
                          </motion.button>
                        </Dialog.Close>
                      )}
                    </div>
                    
                    {description && (
                      <Dialog.Description className="text-sm text-muted-foreground">
                        {description}
                      </Dialog.Description>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className="flex-1">
                  {children}
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}

// Modal Trigger Component
export interface ModalTriggerProps {
  children: React.ReactNode
  asChild?: boolean
}

const ModalTrigger: React.FC<ModalTriggerProps> = ({ children, asChild = false }) => {
  return (
    <Dialog.Trigger asChild={asChild}>
      {children}
    </Dialog.Trigger>
  )
}

// Modal Footer Component
export interface ModalFooterProps {
  children: React.ReactNode
  className?: string
}

const ModalFooter: React.FC<ModalFooterProps> = ({ children, className }) => {
  return (
    <div className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
      className
    )}>
      {children}
    </div>
  )
}

// Modal Body Component
export interface ModalBodyProps {
  children: React.ReactNode
  className?: string
}

const ModalBody: React.FC<ModalBodyProps> = ({ children, className }) => {
  return (
    <div className={cn('py-4', className)}>
      {children}
    </div>
  )
}

export { Modal, ModalTrigger, ModalFooter, ModalBody }