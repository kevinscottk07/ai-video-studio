/**
 * Select Component
 * 
 * A select dropdown component built with Radix UI Select primitive.
 * Features keyboard navigation, search, and smooth animations.
 */

import React from 'react'
import { motion } from 'framer-motion'
import * as Select from '@radix-ui/react-select'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import { cn, focusRing } from '../../lib/component-variants'

// Main Select Component
export interface SelectProps {
  children: React.ReactNode
  value?: string
  onValueChange?: (value: string) => void
  defaultValue?: string
  disabled?: boolean
  required?: boolean
  name?: string
}

const SelectRoot: React.FC<SelectProps> = ({
  children,
  value,
  onValueChange,
  defaultValue,
  disabled = false,
  required = false,
  name,
}) => {
  return (
    <Select.Root
      value={value}
      onValueChange={onValueChange}
      defaultValue={defaultValue}
      disabled={disabled}
      required={required}
      name={name}
    >
      {children}
    </Select.Root>
  )
}

// Select Trigger
export interface SelectTriggerProps {
  children: React.ReactNode
  className?: string
  placeholder?: string
}

const SelectTrigger: React.FC<SelectTriggerProps> = ({
  children,
  className,
  placeholder,
}) => {
  return (
    <Select.Trigger
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm',
        'placeholder:text-muted-foreground',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        '[&>span]:line-clamp-1',
        className
      )}
    >
      <Select.Value placeholder={placeholder} />
      <Select.Icon asChild>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </Select.Icon>
    </Select.Trigger>
  )
}

// Select Content
export interface SelectContentProps {
  children: React.ReactNode
  className?: string
  position?: 'item-aligned' | 'popper'
  side?: 'top' | 'right' | 'bottom' | 'left'
  sideOffset?: number
  align?: 'start' | 'center' | 'end'
}

const SelectContent: React.FC<SelectContentProps> = ({
  children,
  className,
  position = 'popper',
  side = 'bottom',
  sideOffset = 4,
  align = 'start',
}) => {
  return (
    <Select.Portal>
      <Select.Content
        className={cn(
          'relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2',
          'data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
          position === 'popper' &&
            'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
          className
        )}
        position={position}
        side={side}
        sideOffset={sideOffset}
        align={align}
      >
        <Select.ScrollUpButton className="flex cursor-default items-center justify-center py-1">
          <ChevronUp className="h-4 w-4" />
        </Select.ScrollUpButton>
        
        <Select.Viewport
          className={cn(
            'p-1',
            position === 'popper' &&
              'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]'
          )}
        >
          {children}
        </Select.Viewport>
        
        <Select.ScrollDownButton className="flex cursor-default items-center justify-center py-1">
          <ChevronDown className="h-4 w-4" />
        </Select.ScrollDownButton>
      </Select.Content>
    </Select.Portal>
  )
}

// Select Item
export interface SelectItemProps {
  children: React.ReactNode
  className?: string
  value: string
  disabled?: boolean
}

const SelectItem: React.FC<SelectItemProps> = ({
  children,
  className,
  value,
  disabled = false,
}) => {
  return (
    <Select.Item
      className={cn(
        'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none',
        'focus:bg-accent focus:text-accent-foreground',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
      value={value}
      disabled={disabled}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <Select.ItemIndicator>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <Check className="h-4 w-4" />
          </motion.div>
        </Select.ItemIndicator>
      </span>
      
      <Select.ItemText>{children}</Select.ItemText>
    </Select.Item>
  )
}

// Select Label
export interface SelectLabelProps {
  children: React.ReactNode
  className?: string
}

const SelectLabel: React.FC<SelectLabelProps> = ({ children, className }) => {
  return (
    <Select.Label className={cn('py-1.5 pl-8 pr-2 text-sm font-semibold', className)}>
      {children}
    </Select.Label>
  )
}

// Select Separator
export interface SelectSeparatorProps {
  className?: string
}

const SelectSeparator: React.FC<SelectSeparatorProps> = ({ className }) => {
  return (
    <Select.Separator className={cn('-mx-1 my-1 h-px bg-muted', className)} />
  )
}

// Select Group
export interface SelectGroupProps {
  children: React.ReactNode
}

const SelectGroup: React.FC<SelectGroupProps> = ({ children }) => {
  return <Select.Group>{children}</Select.Group>
}

// Select Value
export interface SelectValueProps {
  placeholder?: string
  className?: string
}

const SelectValue: React.FC<SelectValueProps> = ({ placeholder, className }) => {
  return (
    <Select.Value 
      placeholder={placeholder}
      className={cn("", className)}
    />
  )
}

export {
  SelectRoot as Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectGroup,
}