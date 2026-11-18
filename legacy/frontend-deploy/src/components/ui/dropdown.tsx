/**
 * Dropdown Component
 * 
 * A dropdown menu component built with Radix UI DropdownMenu primitive.
 * Features keyboard navigation, focus management, and smooth animations.
 */

import React from 'react'
import { motion } from 'framer-motion'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, ChevronRight } from 'lucide-react'
import { cn, focusRing } from '../../lib/component-variants'

// Main Dropdown Component
export interface DropdownProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  modal?: boolean
}

const Dropdown: React.FC<DropdownProps> = ({ 
  children, 
  open, 
  onOpenChange, 
  modal = false 
}) => {
  return (
    <DropdownMenu.Root open={open} onOpenChange={onOpenChange} modal={modal}>
      {children}
    </DropdownMenu.Root>
  )
}

// Dropdown Trigger
export interface DropdownTriggerProps {
  children: React.ReactNode
  asChild?: boolean
  className?: string
}

const DropdownTrigger: React.FC<DropdownTriggerProps> = ({ 
  children, 
  asChild = false,
  className 
}) => {
  return (
    <DropdownMenu.Trigger asChild={asChild} className={className}>
      {children}
    </DropdownMenu.Trigger>
  )
}

// Dropdown Content
export interface DropdownContentProps {
  children: React.ReactNode
  className?: string
  sideOffset?: number
  align?: 'start' | 'center' | 'end'
  side?: 'top' | 'right' | 'bottom' | 'left'
}

const DropdownContent: React.FC<DropdownContentProps> = ({
  children,
  className,
  sideOffset = 4,
  align = 'center',
  side = 'bottom',
}) => {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        className={cn(
          'z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2',
          'data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
          className
        )}
        sideOffset={sideOffset}
        align={align}
        side={side}
      >
        {children}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  )
}

// Dropdown Item
export interface DropdownItemProps {
  children: React.ReactNode
  className?: string
  disabled?: boolean
  onSelect?: (event: Event) => void
  asChild?: boolean
}

const DropdownItem: React.FC<DropdownItemProps> = ({
  children,
  className,
  disabled = false,
  onSelect,
  asChild = false,
}) => {
  return (
    <DropdownMenu.Item
      className={cn(
        'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
        'transition-colors focus:bg-accent focus:text-accent-foreground',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
      disabled={disabled}
      onSelect={onSelect}
      asChild={asChild}
    >
      {children}
    </DropdownMenu.Item>
  )
}

// Dropdown Checkbox Item
export interface DropdownCheckboxItemProps {
  children: React.ReactNode
  className?: string
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
}

const DropdownCheckboxItem: React.FC<DropdownCheckboxItemProps> = ({
  children,
  className,
  checked = false,
  onCheckedChange,
  disabled = false,
}) => {
  return (
    <DropdownMenu.CheckboxItem
      className={cn(
        'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none',
        'transition-colors focus:bg-accent focus:text-accent-foreground',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <DropdownMenu.ItemIndicator>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <Check className="h-4 w-4" />
          </motion.div>
        </DropdownMenu.ItemIndicator>
      </span>
      {children}
    </DropdownMenu.CheckboxItem>
  )
}

// Dropdown Radio Group
export interface DropdownRadioGroupProps {
  children: React.ReactNode
  value?: string
  onValueChange?: (value: string) => void
}

const DropdownRadioGroup: React.FC<DropdownRadioGroupProps> = ({
  children,
  value,
  onValueChange,
}) => {
  return (
    <DropdownMenu.RadioGroup value={value} onValueChange={onValueChange}>
      {children}
    </DropdownMenu.RadioGroup>
  )
}

// Dropdown Radio Item
export interface DropdownRadioItemProps {
  children: React.ReactNode
  className?: string
  value: string
  disabled?: boolean
}

const DropdownRadioItem: React.FC<DropdownRadioItemProps> = ({
  children,
  className,
  value,
  disabled = false,
}) => {
  return (
    <DropdownMenu.RadioItem
      className={cn(
        'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none',
        'transition-colors focus:bg-accent focus:text-accent-foreground',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
      value={value}
      disabled={disabled}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <DropdownMenu.ItemIndicator>
          <motion.div
            className="h-2 w-2 rounded-full bg-current"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          />
        </DropdownMenu.ItemIndicator>
      </span>
      {children}
    </DropdownMenu.RadioItem>
  )
}

// Dropdown Label
export interface DropdownLabelProps {
  children: React.ReactNode
  className?: string
}

const DropdownLabel: React.FC<DropdownLabelProps> = ({ children, className }) => {
  return (
    <DropdownMenu.Label
      className={cn('px-2 py-1.5 text-sm font-semibold', className)}
    >
      {children}
    </DropdownMenu.Label>
  )
}

// Dropdown Separator
export interface DropdownSeparatorProps {
  className?: string
}

const DropdownSeparator: React.FC<DropdownSeparatorProps> = ({ className }) => {
  return (
    <DropdownMenu.Separator
      className={cn('-mx-1 my-1 h-px bg-muted', className)}
    />
  )
}

// Dropdown Sub Menu
export interface DropdownSubProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const DropdownSub: React.FC<DropdownSubProps> = ({ 
  children, 
  open, 
  onOpenChange 
}) => {
  return (
    <DropdownMenu.Sub open={open} onOpenChange={onOpenChange}>
      {children}
    </DropdownMenu.Sub>
  )
}

// Dropdown Sub Trigger
export interface DropdownSubTriggerProps {
  children: React.ReactNode
  className?: string
  disabled?: boolean
}

const DropdownSubTrigger: React.FC<DropdownSubTriggerProps> = ({
  children,
  className,
  disabled = false,
}) => {
  return (
    <DropdownMenu.SubTrigger
      className={cn(
        'flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
        'focus:bg-accent data-[state=open]:bg-accent',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
      disabled={disabled}
    >
      {children}
      <ChevronRight className="ml-auto h-4 w-4" />
    </DropdownMenu.SubTrigger>
  )
}

// Dropdown Sub Content
export interface DropdownSubContentProps {
  children: React.ReactNode
  className?: string
}

const DropdownSubContent: React.FC<DropdownSubContentProps> = ({
  children,
  className,
}) => {
  return (
    <DropdownMenu.SubContent
      className={cn(
        'z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2',
        'data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        className
      )}
    >
      {children}
    </DropdownMenu.SubContent>
  )
}

export {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownCheckboxItem,
  DropdownRadioGroup,
  DropdownRadioItem,
  DropdownLabel,
  DropdownSeparator,
  DropdownSub,
  DropdownSubTrigger,
  DropdownSubContent,
}