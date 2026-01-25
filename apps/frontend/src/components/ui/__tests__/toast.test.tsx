/**
 * Toast Component Unit Tests
 * 
 * Comprehensive tests for the Toast component including rendering,
 * variants, interactions, accessibility, and programmatic usage.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  ToastProvider,
  Toast,
  ToastManager,
  useToast,
  toast,
} from '../toast'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef<HTMLDivElement, any>(({ children, ...props }, ref) => (
      <div ref={ref} {...props}>
        {children}
      </div>
    )),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock Radix UI Toast
vi.mock('@radix-ui/react-toast', () => ({
  Provider: ({ children, swipeDirection, duration }: any) => (
    <div data-testid="toast-provider" data-swipe-direction={swipeDirection} data-duration={duration}>
      {children}
    </div>
  ),
  Viewport: ({ ...props }: any) => (
    <div data-testid="toast-viewport" {...props} />
  ),
  Root: React.forwardRef<HTMLDivElement, any>(
    ({ children, open, onOpenChange, duration, ...props }, ref) => (
      open ? (
        <div
          ref={ref}
          data-testid="toast-root"
          data-open={open}
          data-duration={duration}
          {...props}
        >
          {children}
        </div>
      ) : null
    )
  ),
  Title: ({ children, ...props }: any) => (
    <div data-testid="toast-title" {...props}>
      {children}
    </div>
  ),
  Description: ({ children, ...props }: any) => (
    <div data-testid="toast-description" {...props}>
      {children}
    </div>
  ),
  Action: ({ children, altText, asChild }: any) => (
    <div data-testid="toast-action" data-alt-text={altText}>
      {children}
    </div>
  ),
  Close: React.forwardRef<HTMLButtonElement, any>(({ children, ...props }, ref) => (
    <button ref={ref} data-testid="toast-close" {...props}>
      {children}
    </button>
  )),
}))

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  X: () => <div data-testid="x-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  Info: () => <div data-testid="info-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
}))

describe('Toast Components', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  describe('ToastProvider', () => {
    it('renders provider with default props', () => {
      render(
        <ToastProvider>
          <div>Toast content</div>
        </ToastProvider>
      )
      
      expect(screen.getByTestId('toast-provider')).toBeInTheDocument()
      expect(screen.getByTestId('toast-viewport')).toBeInTheDocument()
      expect(screen.getByText('Toast content')).toBeInTheDocument()
    })

    it('applies custom swipe direction and duration', () => {
      render(
        <ToastProvider swipeDirection="left" duration={3000}>
          <div>Content</div>
        </ToastProvider>
      )
      
      const provider = screen.getByTestId('toast-provider')
      expect(provider).toHaveAttribute('data-swipe-direction', 'left')
      expect(provider).toHaveAttribute('data-duration', '3000')
    })

    it('renders viewport with correct classes', () => {
      render(
        <ToastProvider>
          <div>Content</div>
        </ToastProvider>
      )
      
      const viewport = screen.getByTestId('toast-viewport')
      expect(viewport).toHaveClass(
        'fixed',
        'top-0',
        'z-[100]',
        'flex',
        'max-h-screen',
        'w-full',
        'flex-col-reverse',
        'p-4'
      )
    })
  })

  describe('Toast Component', () => {
    it('renders toast when open', () => {
      render(
        <ToastProvider>
          <Toast open={true} title="Test Toast" description="Toast description">
            <div>Toast content</div>
          </Toast>
        </ToastProvider>
      )
      
      expect(screen.getByTestId('toast-root')).toBeInTheDocument()
      expect(screen.getByTestId('toast-title')).toHaveTextContent('Test Toast')
      expect(screen.getByTestId('toast-description')).toHaveTextContent('Toast description')
    })

    it('does not render when closed', () => {
      render(
        <ToastProvider>
          <Toast open={false} title="Hidden Toast">
            <div>Hidden content</div>
          </Toast>
        </ToastProvider>
      )
      
      expect(screen.queryByTestId('toast-root')).not.toBeInTheDocument()
    })

    it('renders close button', () => {
      render(
        <ToastProvider>
          <Toast open={true} title="Closable Toast" />
        </ToastProvider>
      )
      
      expect(screen.getByTestId('toast-close')).toBeInTheDocument()
      expect(screen.getByTestId('x-icon')).toBeInTheDocument()
    })

    it('handles close button click', async () => {
      const handleOpenChange = vi.fn()
      const user = userEvent.setup()
      
      render(
        <ToastProvider>
          <Toast open={true} onOpenChange={handleOpenChange} title="Test Toast" />
        </ToastProvider>
      )
      
      const closeButton = screen.getByTestId('toast-close')
      await user.click(closeButton)
      
      expect(handleOpenChange).toHaveBeenCalledWith(false)
    })

    it('applies custom duration', () => {
      render(
        <ToastProvider>
          <Toast open={true} title="Custom Duration" duration={10000} />
        </ToastProvider>
      )
      
      const toast = screen.getByTestId('toast-root')
      expect(toast).toHaveAttribute('data-duration', '10000')
    })
  })

  describe('Toast Variants', () => {
    it('renders default variant', () => {
      render(
        <ToastProvider>
          <Toast open={true} variant="default" title="Default Toast" />
        </ToastProvider>
      )
      
      const toast = screen.getByTestId('toast-root')
      expect(toast).toHaveClass('bg-background', 'border-border', 'text-foreground')
    })

    it('renders success variant with icon', () => {
      render(
        <ToastProvider>
          <Toast open={true} variant="success" title="Success Toast" />
        </ToastProvider>
      )
      
      const toast = screen.getByTestId('toast-root')
      expect(toast).toHaveClass('bg-success/10', 'border-success/20', 'text-success')
      expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument()
    })

    it('renders error variant with icon', () => {
      render(
        <ToastProvider>
          <Toast open={true} variant="error" title="Error Toast" />
        </ToastProvider>
      )
      
      const toast = screen.getByTestId('toast-root')
      expect(toast).toHaveClass('bg-destructive/10', 'border-destructive/20', 'text-destructive')
      expect(screen.getByTestId('alert-circle-icon')).toBeInTheDocument()
    })

    it('renders warning variant with icon', () => {
      render(
        <ToastProvider>
          <Toast open={true} variant="warning" title="Warning Toast" />
        </ToastProvider>
      )
      
      const toast = screen.getByTestId('toast-root')
      expect(toast).toHaveClass('bg-warning/10', 'border-warning/20', 'text-warning')
      expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument()
    })

    it('renders info variant with icon', () => {
      render(
        <ToastProvider>
          <Toast open={true} variant="info" title="Info Toast" />
        </ToastProvider>
      )
      
      const toast = screen.getByTestId('toast-root')
      expect(toast).toHaveClass('bg-info/10', 'border-info/20', 'text-info')
      expect(screen.getByTestId('info-icon')).toBeInTheDocument()
    })
  })

  describe('Toast with Action', () => {
    it('renders action button', () => {
      const actionButton = <button>Undo</button>
      
      render(
        <ToastProvider>
          <Toast 
            open={true} 
            title="Action Toast" 
            action={actionButton}
          />
        </ToastProvider>
      )
      
      expect(screen.getByTestId('toast-action')).toBeInTheDocument()
      expect(screen.getByText('Undo')).toBeInTheDocument()
    })

    it('handles action button click', async () => {
      const handleAction = vi.fn()
      const user = userEvent.setup()
      
      const actionButton = <button onClick={handleAction}>Action</button>
      
      render(
        <ToastProvider>
          <Toast 
            open={true} 
            title="Interactive Toast" 
            action={actionButton}
          />
        </ToastProvider>
      )
      
      const actionBtn = screen.getByText('Action')
      await user.click(actionBtn)
      
      expect(handleAction).toHaveBeenCalled()
    })
  })

  describe('ToastManager and useToast Hook', () => {
    const TestComponent = () => {
      const { addToast, removeToast } = useToast()
      
      return (
        <div>
          <button 
            onClick={() => addToast({ 
              title: 'Test Toast', 
              description: 'Test description',
              variant: 'success' 
            })}
          >
            Add Toast
          </button>
          <button onClick={() => removeToast('test-id')}>
            Remove Toast
          </button>
        </div>
      )
    }

    it('provides toast context to children', () => {
      render(
        <ToastManager>
          <TestComponent />
        </ToastManager>
      )
      
      expect(screen.getByText('Add Toast')).toBeInTheDocument()
      expect(screen.getByText('Remove Toast')).toBeInTheDocument()
    })

    it('adds toast when addToast is called', async () => {
      const user = userEvent.setup()
      
      render(
        <ToastManager>
          <TestComponent />
        </ToastManager>
      )
      
      const addButton = screen.getByText('Add Toast')
      await user.click(addButton)
      
      await waitFor(() => {
        expect(screen.getByText('Test Toast')).toBeInTheDocument()
        expect(screen.getByText('Test description')).toBeInTheDocument()
      })
    })

    it('removes toast when removeToast is called', async () => {
      const TestComponentWithRemove = () => {
        const { addToast, removeToast } = useToast()
        const [toastId, setToastId] = React.useState<string>('')
        
        return (
          <div>
            <button 
              onClick={() => {
                const id = addToast({ title: 'Removable Toast' })
                setToastId(id)
              }}
            >
              Add Toast
            </button>
            <button onClick={() => removeToast(toastId)}>
              Remove Toast
            </button>
          </div>
        )
      }
      
      const user = userEvent.setup()
      
      render(
        <ToastManager>
          <TestComponentWithRemove />
        </ToastManager>
      )
      
      // Add toast
      const addButton = screen.getByText('Add Toast')
      await user.click(addButton)
      
      await waitFor(() => {
        expect(screen.getByText('Removable Toast')).toBeInTheDocument()
      })
      
      // Remove toast
      const removeButton = screen.getByText('Remove Toast')
      await user.click(removeButton)
      
      await waitFor(() => {
        expect(screen.queryByText('Removable Toast')).not.toBeInTheDocument()
      })
    })

    it('updates existing toast', async () => {
      const TestComponentWithUpdate = () => {
        const { addToast, updateToast } = useToast()
        const [toastId, setToastId] = React.useState<string>('')
        
        return (
          <div>
            <button 
              onClick={() => {
                const id = addToast({ title: 'Original Title' })
                setToastId(id)
              }}
            >
              Add Toast
            </button>
            <button 
              onClick={() => updateToast(toastId, { title: 'Updated Title' })}
            >
              Update Toast
            </button>
          </div>
        )
      }
      
      const user = userEvent.setup()
      
      render(
        <ToastManager>
          <TestComponentWithUpdate />
        </ToastManager>
      )
      
      // Add toast
      const addButton = screen.getByText('Add Toast')
      await user.click(addButton)
      
      await waitFor(() => {
        expect(screen.getByText('Original Title')).toBeInTheDocument()
      })
      
      // Update toast
      const updateButton = screen.getByText('Update Toast')
      await user.click(updateButton)
      
      await waitFor(() => {
        expect(screen.getByText('Updated Title')).toBeInTheDocument()
        expect(screen.queryByText('Original Title')).not.toBeInTheDocument()
      })
    })

    it('throws error when useToast is used outside provider', () => {
      const TestComponentOutsideProvider = () => {
        const toast = useToast()
        return <div>Should not render</div>
      }

      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        render(<TestComponentOutsideProvider />)
      }).toThrow('useToast must be used within a ToastProvider')

      consoleSpy.mockRestore()
    })
  })

  describe('Toast Convenience Functions', () => {
    it('creates success toast options', () => {
      const options = toast.success({ 
        title: 'Success!', 
        description: 'Operation completed' 
      })
      
      expect(options).toEqual({
        title: 'Success!',
        description: 'Operation completed',
        variant: 'success'
      })
    })

    it('creates error toast options', () => {
      const options = toast.error({ 
        title: 'Error!', 
        description: 'Something went wrong' 
      })
      
      expect(options).toEqual({
        title: 'Error!',
        description: 'Something went wrong',
        variant: 'error'
      })
    })

    it('creates warning toast options', () => {
      const options = toast.warning({ 
        title: 'Warning!', 
        description: 'Please be careful' 
      })
      
      expect(options).toEqual({
        title: 'Warning!',
        description: 'Please be careful',
        variant: 'warning'
      })
    })

    it('creates info toast options', () => {
      const options = toast.info({ 
        title: 'Info', 
        description: 'Here is some information' 
      })
      
      expect(options).toEqual({
        title: 'Info',
        description: 'Here is some information',
        variant: 'info'
      })
    })

    it('creates default toast options', () => {
      const options = toast.default({ 
        title: 'Default', 
        description: 'Default toast' 
      })
      
      expect(options).toEqual({
        title: 'Default',
        description: 'Default toast',
        variant: 'default'
      })
    })
  })

  describe('Toast Auto-dismiss', () => {
    it('auto-dismisses after duration', async () => {
      const TestAutoToast = () => {
        const { addToast } = useToast()
        
        React.useEffect(() => {
          addToast({ 
            title: 'Auto Dismiss', 
            duration: 1000 
          })
        }, [addToast])
        
        return <div>Auto dismiss test</div>
      }
      
      render(
        <ToastManager>
          <TestAutoToast />
        </ToastManager>
      )
      
      // Toast should be visible initially
      await waitFor(() => {
        expect(screen.getByText('Auto Dismiss')).toBeInTheDocument()
      })
      
      // Fast-forward time to trigger auto-dismiss
      act(() => {
        vi.advanceTimersByTime(1000)
      })
      
      // Toast should be removed
      await waitFor(() => {
        expect(screen.queryByText('Auto Dismiss')).not.toBeInTheDocument()
      })
    })
  })

  describe('Toast Styling and Classes', () => {
    it('applies default toast styling classes', () => {
      render(
        <ToastProvider>
          <Toast open={true} title="Styled Toast" />
        </ToastProvider>
      )
      
      const toast = screen.getByTestId('toast-root')
      expect(toast).toHaveClass(
        'group',
        'pointer-events-auto',
        'relative',
        'flex',
        'w-full',
        'items-center',
        'justify-between',
        'space-x-4',
        'overflow-hidden',
        'rounded-md',
        'border',
        'p-6',
        'pr-8',
        'shadow-lg',
        'transition-all'
      )
    })

    it('applies custom className', () => {
      render(
        <ToastProvider>
          <Toast 
            open={true} 
            title="Custom Toast" 
            className="custom-toast-class"
          />
        </ToastProvider>
      )
      
      const toast = screen.getByTestId('toast-root')
      expect(toast).toHaveClass('custom-toast-class')
    })

    it('applies close button styling', () => {
      render(
        <ToastProvider>
          <Toast open={true} title="Toast with Close" />
        </ToastProvider>
      )
      
      const closeButton = screen.getByTestId('toast-close')
      expect(closeButton).toHaveClass(
        'absolute',
        'right-2',
        'top-2',
        'rounded-md',
        'p-1',
        'text-foreground/50',
        'opacity-0',
        'transition-opacity',
        'hover:text-foreground',
        'focus:opacity-100',
        'focus:outline-none',
        'focus:ring-2',
        'group-hover:opacity-100'
      )
    })
  })

  describe('Edge Cases', () => {
    it('handles toast without title', () => {
      render(
        <ToastProvider>
          <Toast open={true} description="Description only" />
        </ToastProvider>
      )
      
      expect(screen.queryByTestId('toast-title')).not.toBeInTheDocument()
      expect(screen.getByTestId('toast-description')).toHaveTextContent('Description only')
    })

    it('handles toast without description', () => {
      render(
        <ToastProvider>
          <Toast open={true} title="Title only" />
        </ToastProvider>
      )
      
      expect(screen.getByTestId('toast-title')).toHaveTextContent('Title only')
      expect(screen.queryByTestId('toast-description')).not.toBeInTheDocument()
    })

    it('handles multiple toasts', async () => {
      const TestMultipleToasts = () => {
        const { addToast } = useToast()
        
        return (
          <button 
            onClick={() => {
              addToast({ title: 'Toast 1' })
              addToast({ title: 'Toast 2' })
              addToast({ title: 'Toast 3' })
            }}
          >
            Add Multiple
          </button>
        )
      }
      
      const user = userEvent.setup()
      
      render(
        <ToastManager>
          <TestMultipleToasts />
        </ToastManager>
      )
      
      const button = screen.getByText('Add Multiple')
      await user.click(button)
      
      await waitFor(() => {
        expect(screen.getByText('Toast 1')).toBeInTheDocument()
        expect(screen.getByText('Toast 2')).toBeInTheDocument()
        expect(screen.getByText('Toast 3')).toBeInTheDocument()
      })
    })
  })
})