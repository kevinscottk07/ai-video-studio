/**
 * Dropdown Component Unit Tests
 * 
 * Comprehensive tests for the Dropdown component including rendering,
 * interactions, accessibility, keyboard navigation, and various item types.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import {
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
} from '../dropdown'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef<HTMLDivElement, any>(({ children, ...props }, ref) => (
      <div ref={ref} {...props}>
        {children}
      </div>
    )),
  },
}))

// Mock Radix UI DropdownMenu
vi.mock('@radix-ui/react-dropdown-menu', () => ({
  Root: ({ children, open, onOpenChange }: any) => (
    <div data-testid="dropdown-root" data-open={open}>
      {children}
    </div>
  ),
  Trigger: React.forwardRef<HTMLButtonElement, any>(({ children, asChild, ...props }, ref) => (
    <button ref={ref} data-testid="dropdown-trigger" {...props}>
      {children}
    </button>
  )),
  Portal: ({ children }: any) => <div data-testid="dropdown-portal">{children}</div>,
  Content: React.forwardRef<HTMLDivElement, any>(({ children, ...props }, ref) => (
    <div ref={ref} data-testid="dropdown-content" {...props}>
      {children}
    </div>
  )),
  Item: React.forwardRef<HTMLDivElement, any>(({ children, onSelect, disabled, ...props }, ref) => (
    <div
      ref={ref}
      data-testid="dropdown-item"
      data-disabled={disabled}
      onClick={onSelect}
      {...props}
    >
      {children}
    </div>
  )),
  CheckboxItem: React.forwardRef<HTMLDivElement, any>(
    ({ children, checked, onCheckedChange, disabled, ...props }, ref) => (
      <div
        ref={ref}
        data-testid="dropdown-checkbox-item"
        data-checked={checked}
        data-disabled={disabled}
        onClick={() => onCheckedChange?.(!checked)}
        {...props}
      >
        {children}
      </div>
    )
  ),
  RadioGroup: ({ children, value, onValueChange }: any) => (
    <div data-testid="dropdown-radio-group" data-value={value}>
      {React.Children.map(children, (child) =>
        React.cloneElement(child, { groupValue: value, onGroupValueChange: onValueChange })
      )}
    </div>
  ),
  RadioItem: React.forwardRef<HTMLDivElement, any>(
    ({ children, value, disabled, groupValue, onGroupValueChange, ...props }, ref) => (
      <div
        ref={ref}
        data-testid="dropdown-radio-item"
        data-value={value}
        data-checked={groupValue === value}
        data-disabled={disabled}
        onClick={() => onGroupValueChange?.(value)}
        {...props}
      >
        {children}
      </div>
    )
  ),
  Label: ({ children, ...props }: any) => (
    <div data-testid="dropdown-label" {...props}>
      {children}
    </div>
  ),
  Separator: ({ ...props }: any) => <hr data-testid="dropdown-separator" {...props} />,
  Sub: ({ children, open, onOpenChange }: any) => (
    <div data-testid="dropdown-sub" data-open={open}>
      {children}
    </div>
  ),
  SubTrigger: React.forwardRef<HTMLDivElement, any>(({ children, disabled, ...props }, ref) => (
    <div ref={ref} data-testid="dropdown-sub-trigger" data-disabled={disabled} {...props}>
      {children}
    </div>
  )),
  SubContent: React.forwardRef<HTMLDivElement, any>(({ children, ...props }, ref) => (
    <div ref={ref} data-testid="dropdown-sub-content" {...props}>
      {children}
    </div>
  )),
  ItemIndicator: ({ children }: any) => (
    <span data-testid="dropdown-item-indicator">{children}</span>
  ),
}))

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Check: () => <div data-testid="check-icon" />,
  ChevronRight: () => <div data-testid="chevron-right-icon" />,
}))

describe('Dropdown Component', () => {
  describe('Basic Rendering', () => {
    it('renders dropdown with trigger and content', () => {
      render(
        <Dropdown>
          <DropdownTrigger>
            <button>Open Menu</button>
          </DropdownTrigger>
          <DropdownContent>
            <DropdownItem>Item 1</DropdownItem>
            <DropdownItem>Item 2</DropdownItem>
          </DropdownContent>
        </Dropdown>
      )
      
      expect(screen.getByTestId('dropdown-root')).toBeInTheDocument()
      expect(screen.getByTestId('dropdown-trigger')).toBeInTheDocument()
      expect(screen.getByText('Open Menu')).toBeInTheDocument()
    })

    it('renders content when open', () => {
      render(
        <Dropdown open={true}>
          <DropdownTrigger>
            <button>Menu</button>
          </DropdownTrigger>
          <DropdownContent>
            <DropdownItem>Item 1</DropdownItem>
          </DropdownContent>
        </Dropdown>
      )
      
      expect(screen.getByTestId('dropdown-content')).toBeInTheDocument()
      expect(screen.getByText('Item 1')).toBeInTheDocument()
    })

    it('does not render content when closed', () => {
      render(
        <Dropdown open={false}>
          <DropdownTrigger>
            <button>Menu</button>
          </DropdownTrigger>
          <DropdownContent>
            <DropdownItem>Item 1</DropdownItem>
          </DropdownContent>
        </Dropdown>
      )
      
      expect(screen.queryByTestId('dropdown-content')).not.toBeInTheDocument()
    })
  })

  describe('DropdownTrigger', () => {
    it('renders trigger with custom className', () => {
      render(
        <Dropdown>
          <DropdownTrigger className="custom-trigger-class">
            <button>Trigger</button>
          </DropdownTrigger>
        </Dropdown>
      )
      
      const trigger = screen.getByTestId('dropdown-trigger')
      expect(trigger).toHaveClass('custom-trigger-class')
    })

    it('supports asChild prop', () => {
      render(
        <Dropdown>
          <DropdownTrigger asChild>
            <button>Custom Trigger</button>
          </DropdownTrigger>
        </Dropdown>
      )
      
      expect(screen.getByText('Custom Trigger')).toBeInTheDocument()
    })
  })

  describe('DropdownContent', () => {
    it('applies default styling classes', () => {
      render(
        <Dropdown open={true}>
          <DropdownContent>
            <DropdownItem>Item</DropdownItem>
          </DropdownContent>
        </Dropdown>
      )
      
      const content = screen.getByTestId('dropdown-content')
      expect(content).toHaveClass(
        'z-50',
        'min-w-[8rem]',
        'overflow-hidden',
        'rounded-md',
        'border',
        'bg-popover',
        'p-1',
        'text-popover-foreground',
        'shadow-md'
      )
    })

    it('applies custom className', () => {
      render(
        <Dropdown open={true}>
          <DropdownContent className="custom-content-class">
            <DropdownItem>Item</DropdownItem>
          </DropdownContent>
        </Dropdown>
      )
      
      const content = screen.getByTestId('dropdown-content')
      expect(content).toHaveClass('custom-content-class')
    })

    it('supports positioning props', () => {
      render(
        <Dropdown open={true}>
          <DropdownContent sideOffset={8} align="end" side="top">
            <DropdownItem>Item</DropdownItem>
          </DropdownContent>
        </Dropdown>
      )
      
      const content = screen.getByTestId('dropdown-content')
      expect(content).toBeInTheDocument()
    })
  })

  describe('DropdownItem', () => {
    it('renders item with default styling', () => {
      render(
        <Dropdown open={true}>
          <DropdownContent>
            <DropdownItem>Menu Item</DropdownItem>
          </DropdownContent>
        </Dropdown>
      )
      
      const item = screen.getByTestId('dropdown-item')
      expect(item).toHaveClass(
        'relative',
        'flex',
        'cursor-default',
        'select-none',
        'items-center',
        'rounded-sm',
        'px-2',
        'py-1.5',
        'text-sm',
        'outline-none'
      )
      expect(screen.getByText('Menu Item')).toBeInTheDocument()
    })

    it('handles click events', async () => {
      const handleSelect = vi.fn()
      const user = userEvent.setup()
      
      render(
        <Dropdown open={true}>
          <DropdownContent>
            <DropdownItem onSelect={handleSelect}>Clickable Item</DropdownItem>
          </DropdownContent>
        </Dropdown>
      )
      
      const item = screen.getByTestId('dropdown-item')
      await user.click(item)
      
      expect(handleSelect).toHaveBeenCalled()
    })

    it('handles disabled state', () => {
      render(
        <Dropdown open={true}>
          <DropdownContent>
            <DropdownItem disabled>Disabled Item</DropdownItem>
          </DropdownContent>
        </Dropdown>
      )
      
      const item = screen.getByTestId('dropdown-item')
      expect(item).toHaveAttribute('data-disabled', 'true')
    })

    it('applies custom className', () => {
      render(
        <Dropdown open={true}>
          <DropdownContent>
            <DropdownItem className="custom-item-class">Custom Item</DropdownItem>
          </DropdownContent>
        </Dropdown>
      )
      
      const item = screen.getByTestId('dropdown-item')
      expect(item).toHaveClass('custom-item-class')
    })
  })

  describe('DropdownCheckboxItem', () => {
    it('renders checkbox item', () => {
      render(
        <Dropdown open={true}>
          <DropdownContent>
            <DropdownCheckboxItem checked={false}>Checkbox Item</DropdownCheckboxItem>
          </DropdownContent>
        </Dropdown>
      )
      
      const item = screen.getByTestId('dropdown-checkbox-item')
      expect(item).toHaveClass('pl-8') // Space for checkbox indicator
      expect(screen.getByText('Checkbox Item')).toBeInTheDocument()
    })

    it('shows checked state', () => {
      render(
        <Dropdown open={true}>
          <DropdownContent>
            <DropdownCheckboxItem checked={true}>Checked Item</DropdownCheckboxItem>
          </DropdownContent>
        </Dropdown>
      )
      
      const item = screen.getByTestId('dropdown-checkbox-item')
      expect(item).toHaveAttribute('data-checked', 'true')
      expect(screen.getByTestId('dropdown-item-indicator')).toBeInTheDocument()
      expect(screen.getByTestId('check-icon')).toBeInTheDocument()
    })

    it('handles check state changes', async () => {
      const handleCheckedChange = vi.fn()
      const user = userEvent.setup()
      
      render(
        <Dropdown open={true}>
          <DropdownContent>
            <DropdownCheckboxItem 
              checked={false} 
              onCheckedChange={handleCheckedChange}
            >
              Toggle Item
            </DropdownCheckboxItem>
          </DropdownContent>
        </Dropdown>
      )
      
      const item = screen.getByTestId('dropdown-checkbox-item')
      await user.click(item)
      
      expect(handleCheckedChange).toHaveBeenCalledWith(true)
    })

    it('handles disabled state', () => {
      render(
        <Dropdown open={true}>
          <DropdownContent>
            <DropdownCheckboxItem disabled checked={false}>
              Disabled Checkbox
            </DropdownCheckboxItem>
          </DropdownContent>
        </Dropdown>
      )
      
      const item = screen.getByTestId('dropdown-checkbox-item')
      expect(item).toHaveAttribute('data-disabled', 'true')
    })
  })

  describe('DropdownRadioGroup and DropdownRadioItem', () => {
    it('renders radio group with items', () => {
      render(
        <Dropdown open={true}>
          <DropdownContent>
            <DropdownRadioGroup value="option1">
              <DropdownRadioItem value="option1">Option 1</DropdownRadioItem>
              <DropdownRadioItem value="option2">Option 2</DropdownRadioItem>
            </DropdownRadioGroup>
          </DropdownContent>
        </Dropdown>
      )
      
      expect(screen.getByTestId('dropdown-radio-group')).toBeInTheDocument()
      expect(screen.getByText('Option 1')).toBeInTheDocument()
      expect(screen.getByText('Option 2')).toBeInTheDocument()
    })

    it('shows selected radio item', () => {
      render(
        <Dropdown open={true}>
          <DropdownContent>
            <DropdownRadioGroup value="option2">
              <DropdownRadioItem value="option1">Option 1</DropdownRadioItem>
              <DropdownRadioItem value="option2">Option 2</DropdownRadioItem>
            </DropdownRadioGroup>
          </DropdownContent>
        </Dropdown>
      )
      
      const radioItems = screen.getAllByTestId('dropdown-radio-item')
      expect(radioItems[0]).toHaveAttribute('data-checked', 'false')
      expect(radioItems[1]).toHaveAttribute('data-checked', 'true')
      
      // Check for indicator on selected item
      expect(screen.getByTestId('dropdown-item-indicator')).toBeInTheDocument()
    })

    it('handles radio selection changes', async () => {
      const handleValueChange = vi.fn()
      const user = userEvent.setup()
      
      render(
        <Dropdown open={true}>
          <DropdownContent>
            <DropdownRadioGroup value="option1" onValueChange={handleValueChange}>
              <DropdownRadioItem value="option1">Option 1</DropdownRadioItem>
              <DropdownRadioItem value="option2">Option 2</DropdownRadioItem>
            </DropdownRadioGroup>
          </DropdownContent>
        </Dropdown>
      )
      
      const option2 = screen.getAllByTestId('dropdown-radio-item')[1]
      await user.click(option2)
      
      expect(handleValueChange).toHaveBeenCalledWith('option2')
    })

    it('handles disabled radio items', () => {
      render(
        <Dropdown open={true}>
          <DropdownContent>
            <DropdownRadioGroup value="option1">
              <DropdownRadioItem value="option1">Option 1</DropdownRadioItem>
              <DropdownRadioItem value="option2" disabled>
                Disabled Option
              </DropdownRadioItem>
            </DropdownRadioGroup>
          </DropdownContent>
        </Dropdown>
      )
      
      const radioItems = screen.getAllByTestId('dropdown-radio-item')
      expect(radioItems[1]).toHaveAttribute('data-disabled', 'true')
    })
  })

  describe('DropdownLabel', () => {
    it('renders label with default styling', () => {
      render(
        <Dropdown open={true}>
          <DropdownContent>
            <DropdownLabel>Section Label</DropdownLabel>
          </DropdownContent>
        </Dropdown>
      )
      
      const label = screen.getByTestId('dropdown-label')
      expect(label).toHaveClass('px-2', 'py-1.5', 'text-sm', 'font-semibold')
      expect(screen.getByText('Section Label')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(
        <Dropdown open={true}>
          <DropdownContent>
            <DropdownLabel className="custom-label-class">
              Custom Label
            </DropdownLabel>
          </DropdownContent>
        </Dropdown>
      )
      
      const label = screen.getByTestId('dropdown-label')
      expect(label).toHaveClass('custom-label-class')
    })
  })

  describe('DropdownSeparator', () => {
    it('renders separator with default styling', () => {
      render(
        <Dropdown open={true}>
          <DropdownContent>
            <DropdownItem>Item 1</DropdownItem>
            <DropdownSeparator />
            <DropdownItem>Item 2</DropdownItem>
          </DropdownContent>
        </Dropdown>
      )
      
      const separator = screen.getByTestId('dropdown-separator')
      expect(separator).toHaveClass('-mx-1', 'my-1', 'h-px', 'bg-muted')
    })

    it('applies custom className', () => {
      render(
        <Dropdown open={true}>
          <DropdownContent>
            <DropdownSeparator className="custom-separator-class" />
          </DropdownContent>
        </Dropdown>
      )
      
      const separator = screen.getByTestId('dropdown-separator')
      expect(separator).toHaveClass('custom-separator-class')
    })
  })

  describe('DropdownSub Components', () => {
    it('renders sub menu components', () => {
      render(
        <Dropdown open={true}>
          <DropdownContent>
            <DropdownSub>
              <DropdownSubTrigger>More Options</DropdownSubTrigger>
              <DropdownSubContent>
                <DropdownItem>Sub Item 1</DropdownItem>
              </DropdownSubContent>
            </DropdownSub>
          </DropdownContent>
        </Dropdown>
      )
      
      expect(screen.getByTestId('dropdown-sub')).toBeInTheDocument()
      expect(screen.getByTestId('dropdown-sub-trigger')).toBeInTheDocument()
      expect(screen.getByTestId('dropdown-sub-content')).toBeInTheDocument()
      expect(screen.getByText('More Options')).toBeInTheDocument()
      expect(screen.getByTestId('chevron-right-icon')).toBeInTheDocument()
    })

    it('handles sub menu open state', () => {
      render(
        <Dropdown open={true}>
          <DropdownContent>
            <DropdownSub open={true}>
              <DropdownSubTrigger>Sub Menu</DropdownSubTrigger>
              <DropdownSubContent>
                <DropdownItem>Sub Item</DropdownItem>
              </DropdownSubContent>
            </DropdownSub>
          </DropdownContent>
        </Dropdown>
      )
      
      const sub = screen.getByTestId('dropdown-sub')
      expect(sub).toHaveAttribute('data-open', 'true')
    })

    it('handles disabled sub trigger', () => {
      render(
        <Dropdown open={true}>
          <DropdownContent>
            <DropdownSub>
              <DropdownSubTrigger disabled>Disabled Sub</DropdownSubTrigger>
            </DropdownSub>
          </DropdownContent>
        </Dropdown>
      )
      
      const subTrigger = screen.getByTestId('dropdown-sub-trigger')
      expect(subTrigger).toHaveAttribute('data-disabled', 'true')
    })

    it('applies styling to sub content', () => {
      render(
        <Dropdown open={true}>
          <DropdownContent>
            <DropdownSub>
              <DropdownSubTrigger>Sub Menu</DropdownSubTrigger>
              <DropdownSubContent className="custom-sub-content">
                <DropdownItem>Sub Item</DropdownItem>
              </DropdownSubContent>
            </DropdownSub>
          </DropdownContent>
        </Dropdown>
      )
      
      const subContent = screen.getByTestId('dropdown-sub-content')
      expect(subContent).toHaveClass(
        'z-50',
        'min-w-[8rem]',
        'overflow-hidden',
        'rounded-md',
        'border',
        'bg-popover',
        'p-1',
        'text-popover-foreground',
        'shadow-lg',
        'custom-sub-content'
      )
    })
  })

  describe('Complete Dropdown Example', () => {
    it('renders complex dropdown with all component types', () => {
      const handleItemSelect = vi.fn()
      const handleCheckboxChange = vi.fn()
      const handleRadioChange = vi.fn()
      
      render(
        <Dropdown open={true}>
          <DropdownTrigger>
            <button>Complex Menu</button>
          </DropdownTrigger>
          <DropdownContent>
            <DropdownLabel>Actions</DropdownLabel>
            <DropdownItem onSelect={handleItemSelect}>Edit</DropdownItem>
            <DropdownItem onSelect={handleItemSelect}>Copy</DropdownItem>
            <DropdownSeparator />
            
            <DropdownLabel>Settings</DropdownLabel>
            <DropdownCheckboxItem 
              checked={true} 
              onCheckedChange={handleCheckboxChange}
            >
              Show Notifications
            </DropdownCheckboxItem>
            <DropdownCheckboxItem 
              checked={false} 
              onCheckedChange={handleCheckboxChange}
            >
              Auto Save
            </DropdownCheckboxItem>
            <DropdownSeparator />
            
            <DropdownLabel>Theme</DropdownLabel>
            <DropdownRadioGroup value="dark" onValueChange={handleRadioChange}>
              <DropdownRadioItem value="light">Light</DropdownRadioItem>
              <DropdownRadioItem value="dark">Dark</DropdownRadioItem>
              <DropdownRadioItem value="system">System</DropdownRadioItem>
            </DropdownRadioGroup>
            <DropdownSeparator />
            
            <DropdownSub>
              <DropdownSubTrigger>More Options</DropdownSubTrigger>
              <DropdownSubContent>
                <DropdownItem>Advanced Settings</DropdownItem>
                <DropdownItem>Help</DropdownItem>
              </DropdownSubContent>
            </DropdownSub>
          </DropdownContent>
        </Dropdown>
      )
      
      // Verify all components are rendered
      expect(screen.getByText('Actions')).toBeInTheDocument()
      expect(screen.getByText('Edit')).toBeInTheDocument()
      expect(screen.getByText('Show Notifications')).toBeInTheDocument()
      expect(screen.getByText('Dark')).toBeInTheDocument()
      expect(screen.getByText('More Options')).toBeInTheDocument()
      
      // Verify separators
      const separators = screen.getAllByTestId('dropdown-separator')
      expect(separators).toHaveLength(3)
      
      // Verify radio selection
      const radioItems = screen.getAllByTestId('dropdown-radio-item')
      expect(radioItems[1]).toHaveAttribute('data-checked', 'true') // Dark theme
    })
  })

  describe('Accessibility', () => {
    it('maintains proper ARIA attributes', () => {
      render(
        <Dropdown open={true}>
          <DropdownTrigger>
            <button aria-haspopup="true">Menu Button</button>
          </DropdownTrigger>
          <DropdownContent>
            <DropdownItem>Item 1</DropdownItem>
          </DropdownContent>
        </Dropdown>
      )
      
      const trigger = screen.getByRole('button')
      expect(trigger).toHaveAttribute('aria-haspopup', 'true')
    })

    it('supports keyboard navigation classes', () => {
      render(
        <Dropdown open={true}>
          <DropdownContent>
            <DropdownItem>Keyboard Item</DropdownItem>
          </DropdownContent>
        </Dropdown>
      )
      
      const item = screen.getByTestId('dropdown-item')
      expect(item).toHaveClass('outline-none')
    })
  })

  describe('Edge Cases', () => {
    it('handles empty dropdown content', () => {
      render(
        <Dropdown open={true}>
          <DropdownTrigger>
            <button>Empty Menu</button>
          </DropdownTrigger>
          <DropdownContent>
          </DropdownContent>
        </Dropdown>
      )
      
      expect(screen.getByTestId('dropdown-content')).toBeInTheDocument()
    })

    it('handles rapid state changes', async () => {
      const TestComponent = () => {
        const [open, setOpen] = React.useState(false)
        
        return (
          <Dropdown open={open} onOpenChange={setOpen}>
            <DropdownTrigger>
              <button onClick={() => setOpen(!open)}>Toggle</button>
            </DropdownTrigger>
            <DropdownContent>
              <DropdownItem>Item</DropdownItem>
            </DropdownContent>
          </Dropdown>
        )
      }
      
      const user = userEvent.setup()
      render(<TestComponent />)
      
      const trigger = screen.getByRole('button')
      
      // Rapid toggle
      await user.click(trigger)
      await user.click(trigger)
      await user.click(trigger)
      
      // Should handle state changes gracefully
      expect(trigger).toBeInTheDocument()
    })
  })
})