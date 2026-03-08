/**
 * Button Component Unit Tests
 * 
 * Comprehensive tests for the Button component including rendering,
 * interactions, accessibility, and variant behaviors.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Button } from '../button'

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    button: React.forwardRef<HTMLButtonElement, any>(({ children, ...props }, ref) => (
      <button ref={ref} {...props}>
        {children}
      </button>
    )),
    div: React.forwardRef<HTMLDivElement, any>(({ children, ...props }, ref) => (
      <div ref={ref} {...props}>
        {children}
      </div>
    )),
  },
}))

describe('Button Component', () => {
  describe('Rendering', () => {
    it('renders with default props', () => {
      render(<Button>Click me</Button>)
      
      const button = screen.getByRole('button', { name: /click me/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('inline-flex', 'items-center', 'justify-center')
    })

    it('renders with custom className', () => {
      render(<Button className="custom-class">Button</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('custom-class')
    })

    it('renders children correctly', () => {
      render(
        <Button>
          <span>Icon</span>
          Button Text
        </Button>
      )
      
      expect(screen.getByText('Icon')).toBeInTheDocument()
      expect(screen.getByText('Button Text')).toBeInTheDocument()
    })
  })

  describe('Variants', () => {
    it('applies default variant classes', () => {
      render(<Button variant="default">Default</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('btn-primary')
    })

    it('applies destructive variant classes', () => {
      render(<Button variant="destructive">Delete</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('btn-destructive')
    })

    it('applies outline variant classes', () => {
      render(<Button variant="outline">Outline</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('btn-outline')
    })

    it('applies secondary variant classes', () => {
      render(<Button variant="secondary">Secondary</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('btn-secondary')
    })

    it('applies ghost variant classes', () => {
      render(<Button variant="ghost">Ghost</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('btn-ghost')
    })

    it('applies AI variant classes', () => {
      render(<Button variant="ai">AI Generate</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-ai', 'text-ai-foreground')
    })

    it('applies video variant classes', () => {
      render(<Button variant="video">Create Video</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-video', 'text-video-foreground')
    })

    it('applies gradient variant classes', () => {
      render(<Button variant="gradient">Gradient</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-gradient-to-r')
    })
  })

  describe('Sizes', () => {
    it('applies default size classes', () => {
      render(<Button size="default">Default Size</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('btn-md')
    })

    it('applies small size classes', () => {
      render(<Button size="sm">Small</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('btn-sm')
    })

    it('applies large size classes', () => {
      render(<Button size="lg">Large</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('btn-lg')
    })

    it('applies extra large size classes', () => {
      render(<Button size="xl">Extra Large</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('btn-xl')
    })

    it('applies icon size classes', () => {
      render(<Button size="icon">🔥</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-10', 'w-10', 'p-0')
    })
  })

  describe('States', () => {
    it('handles disabled state', () => {
      render(<Button disabled>Disabled</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(button).toHaveClass('disabled:pointer-events-none', 'disabled:opacity-50')
    })

    it('handles loading state', () => {
      render(<Button loading>Loading</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(button).toHaveClass('cursor-wait')
      
      // Check for loading spinner
      const spinner = button.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('shows loading spinner with correct classes', () => {
      render(<Button loading>Loading Button</Button>)
      
      const spinner = screen.getByRole('button').querySelector('.animate-spin')
      expect(spinner).toHaveClass(
        'h-4',
        'w-4',
        'animate-spin',
        'rounded-full',
        'border-2',
        'border-current',
        'border-t-transparent'
      )
    })

    it('disables button when loading', () => {
      const handleClick = vi.fn()
      render(<Button loading onClick={handleClick}>Loading</Button>)
      
      const button = screen.getByRole('button')
      fireEvent.click(button)
      
      expect(handleClick).not.toHaveBeenCalled()
      expect(button).toBeDisabled()
    })
  })

  describe('Interactions', () => {
    it('handles click events', async () => {
      const handleClick = vi.fn()
      const user = userEvent.setup()
      
      render(<Button onClick={handleClick}>Click me</Button>)
      
      const button = screen.getByRole('button')
      await user.click(button)
      
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('does not trigger click when disabled', async () => {
      const handleClick = vi.fn()
      const user = userEvent.setup()
      
      render(<Button disabled onClick={handleClick}>Disabled</Button>)
      
      const button = screen.getByRole('button')
      await user.click(button)
      
      expect(handleClick).not.toHaveBeenCalled()
    })

    it('handles keyboard navigation', async () => {
      const handleClick = vi.fn()
      const user = userEvent.setup()
      
      render(<Button onClick={handleClick}>Keyboard</Button>)
      
      const button = screen.getByRole('button')
      button.focus()
      
      expect(button).toHaveFocus()
      
      await user.keyboard('{Enter}')
      expect(handleClick).toHaveBeenCalledTimes(1)
      
      await user.keyboard(' ')
      expect(handleClick).toHaveBeenCalledTimes(2)
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<Button aria-label="Custom label">Button</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Custom label')
    })

    it('supports aria-describedby', () => {
      render(
        <div>
          <Button aria-describedby="help-text">Button</Button>
          <div id="help-text">Help text</div>
        </div>
      )
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-describedby', 'help-text')
    })

    it('has focus ring classes', () => {
      render(<Button>Focus me</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass(
        'focus-visible:outline-none',
        'focus-visible:ring-2',
        'focus-visible:ring-ring',
        'focus-visible:ring-offset-2'
      )
    })

    it('maintains semantic button role', () => {
      render(<Button>Semantic Button</Button>)
      
      const button = screen.getByRole('button')
      expect(button.tagName).toBe('BUTTON')
    })

    it('supports custom ARIA attributes', () => {
      render(
        <Button 
          aria-expanded="false" 
          aria-haspopup="true"
          aria-controls="menu"
        >
          Menu Button
        </Button>
      )
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-expanded', 'false')
      expect(button).toHaveAttribute('aria-haspopup', 'true')
      expect(button).toHaveAttribute('aria-controls', 'menu')
    })
  })

  describe('AsChild Prop', () => {
    it('renders as child component when asChild is true', () => {
      render(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>
      )
      
      const link = screen.getByRole('link')
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/test')
      expect(link).toHaveClass('inline-flex', 'items-center', 'justify-center')
    })

    it('maintains button classes when rendered as child', () => {
      render(
        <Button asChild variant="destructive" size="lg">
          <a href="/delete">Delete Link</a>
        </Button>
      )
      
      const link = screen.getByRole('link')
      expect(link).toHaveClass('btn-destructive', 'btn-lg')
    })
  })

  describe('Forwarded Ref', () => {
    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLButtonElement>()
      
      render(<Button ref={ref}>Ref Button</Button>)
      
      expect(ref.current).toBeInstanceOf(HTMLButtonElement)
      expect(ref.current?.textContent).toBe('Ref Button')
    })

    it('forwards ref with asChild', () => {
      const ref = React.createRef<HTMLAnchorElement>()
      
      render(
        <Button asChild ref={ref as any}>
          <a href="/test">Link with Ref</a>
        </Button>
      )
      
      expect(ref.current).toBeInstanceOf(HTMLAnchorElement)
    })
  })

  describe('Custom Props', () => {
    it('passes through HTML button attributes', () => {
      render(
        <Button 
          type="submit" 
          form="test-form"
          data-testid="custom-button"
        >
          Submit
        </Button>
      )
      
      const button = screen.getByTestId('custom-button')
      expect(button).toHaveAttribute('type', 'submit')
      expect(button).toHaveAttribute('form', 'test-form')
    })

    it('handles custom event handlers', async () => {
      const handleMouseEnter = vi.fn()
      const handleMouseLeave = vi.fn()
      const user = userEvent.setup()
      
      render(
        <Button 
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          Hover me
        </Button>
      )
      
      const button = screen.getByRole('button')
      
      await user.hover(button)
      expect(handleMouseEnter).toHaveBeenCalledTimes(1)
      
      await user.unhover(button)
      expect(handleMouseLeave).toHaveBeenCalledTimes(1)
    })
  })

  describe('Edge Cases', () => {
    it('handles empty children', () => {
      render(<Button></Button>)
      
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
      expect(button.textContent).toBe('')
    })

    it('handles null children', () => {
      render(<Button>{null}</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
    })

    it('handles multiple variant and size combinations', () => {
      const variants = ['default', 'destructive', 'outline', 'secondary', 'ghost'] as const
      const sizes = ['sm', 'default', 'lg', 'xl'] as const
      
      variants.forEach(variant => {
        sizes.forEach(size => {
          const { unmount } = render(
            <Button variant={variant} size={size}>
              {variant} {size}
            </Button>
          )
          
          const button = screen.getByRole('button')
          expect(button).toBeInTheDocument()
          
          unmount()
        })
      })
    })

    it('handles rapid state changes', async () => {
      const TestComponent = () => {
        const [loading, setLoading] = React.useState(false)
        const [disabled, setDisabled] = React.useState(false)
        
        return (
          <div>
            <Button loading={loading} disabled={disabled}>
              Test Button
            </Button>
            <button onClick={() => setLoading(!loading)}>
              Toggle Loading
            </button>
            <button onClick={() => setDisabled(!disabled)}>
              Toggle Disabled
            </button>
          </div>
        )
      }
      
      const user = userEvent.setup()
      render(<TestComponent />)
      
      const testButton = screen.getByText('Test Button')
      const loadingToggle = screen.getByText('Toggle Loading')
      const disabledToggle = screen.getByText('Toggle Disabled')
      
      // Initial state
      expect(testButton).not.toBeDisabled()
      
      // Toggle loading
      await user.click(loadingToggle)
      expect(testButton).toBeDisabled()
      expect(testButton).toHaveClass('cursor-wait')
      
      // Toggle disabled while loading
      await user.click(disabledToggle)
      expect(testButton).toBeDisabled()
      
      // Toggle loading off
      await user.click(loadingToggle)
      expect(testButton).toBeDisabled() // Still disabled due to disabled prop
      expect(testButton).not.toHaveClass('cursor-wait')
      
      // Toggle disabled off
      await user.click(disabledToggle)
      expect(testButton).not.toBeDisabled()
    })
  })
})