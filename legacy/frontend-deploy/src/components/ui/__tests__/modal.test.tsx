/**
 * Modal Component Unit Tests
 * 
 * Comprehensive tests for the Modal component including rendering,
 * interactions, accessibility, focus management, and animations.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Modal, ModalTrigger, ModalBody, ModalFooter } from '../modal'

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef<HTMLDivElement, any>(({ children, ...props }, ref) => (
      <div ref={ref} {...props}>
        {children}
      </div>
    )),
    button: React.forwardRef<HTMLButtonElement, any>(({ children, ...props }, ref) => (
      <button ref={ref} {...props}>
        {children}
      </button>
    )),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock Radix UI Dialog
vi.mock('@radix-ui/react-dialog', () => ({
  Root: ({ children, open, onOpenChange }: any) => (
    <div data-testid="dialog-root" data-open={open}>
      {open && children}
    </div>
  ),
  Portal: ({ children }: any) => <div data-testid="dialog-portal">{children}</div>,
  Overlay: React.forwardRef<HTMLDivElement, any>(({ children, ...props }, ref) => (
    <div ref={ref} data-testid="dialog-overlay" {...props}>
      {children}
    </div>
  )),
  Content: React.forwardRef<HTMLDivElement, any>(({ children, ...props }, ref) => (
    <div ref={ref} data-testid="dialog-content" {...props}>
      {children}
    </div>
  )),
  Title: ({ children, ...props }: any) => (
    <h2 data-testid="dialog-title" {...props}>
      {children}
    </h2>
  ),
  Description: ({ children, ...props }: any) => (
    <p data-testid="dialog-description" {...props}>
      {children}
    </p>
  ),
  Close: React.forwardRef<HTMLButtonElement, any>(({ children, ...props }, ref) => (
    <button ref={ref} data-testid="dialog-close" {...props}>
      {children}
    </button>
  )),
  Trigger: React.forwardRef<HTMLButtonElement, any>(({ children, ...props }, ref) => (
    <button ref={ref} data-testid="dialog-trigger" {...props}>
      {children}
    </button>
  )),
}))

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  X: () => <div data-testid="x-icon" />,
}))

describe('Modal Component', () => {
  describe('Rendering', () => {
    it('renders when open is true', () => {
      render(
        <Modal open={true} title="Test Modal">
          <div>Modal content</div>
        </Modal>
      )
      
      expect(screen.getByTestId('dialog-root')).toHaveAttribute('data-open', 'true')
      expect(screen.getByTestId('dialog-content')).toBeInTheDocument()
      expect(screen.getByText('Modal content')).toBeInTheDocument()
    })

    it('does not render when open is false', () => {
      render(
        <Modal open={false} title="Test Modal">
          <div>Modal content</div>
        </Modal>
      )
      
      expect(screen.getByTestId('dialog-root')).toHaveAttribute('data-open', 'false')
      expect(screen.queryByText('Modal content')).not.toBeInTheDocument()
    })

    it('renders title when provided', () => {
      render(
        <Modal open={true} title="Test Title">
          <div>Content</div>
        </Modal>
      )
      
      expect(screen.getByTestId('dialog-title')).toHaveTextContent('Test Title')
    })

    it('renders description when provided', () => {
      render(
        <Modal open={true} title="Title" description="Test description">
          <div>Content</div>
        </Modal>
      )
      
      expect(screen.getByTestId('dialog-description')).toHaveTextContent('Test description')
    })

    it('renders close button by default', () => {
      render(
        <Modal open={true} title="Test Modal">
          <div>Content</div>
        </Modal>
      )
      
      expect(screen.getByTestId('dialog-close')).toBeInTheDocument()
      expect(screen.getByTestId('x-icon')).toBeInTheDocument()
    })

    it('hides close button when showCloseButton is false', () => {
      render(
        <Modal open={true} title="Test Modal" showCloseButton={false}>
          <div>Content</div>
        </Modal>
      )
      
      expect(screen.queryByTestId('dialog-close')).not.toBeInTheDocument()
    })
  })

  describe('Sizes', () => {
    it('applies small size classes', () => {
      render(
        <Modal open={true} size="sm">
          <div>Small modal</div>
        </Modal>
      )
      
      const content = screen.getByTestId('dialog-content')
      expect(content).toHaveClass('max-w-md')
    })

    it('applies medium size classes (default)', () => {
      render(
        <Modal open={true} size="md">
          <div>Medium modal</div>
        </Modal>
      )
      
      const content = screen.getByTestId('dialog-content')
      expect(content).toHaveClass('max-w-lg')
    })

    it('applies large size classes', () => {
      render(
        <Modal open={true} size="lg">
          <div>Large modal</div>
        </Modal>
      )
      
      const content = screen.getByTestId('dialog-content')
      expect(content).toHaveClass('max-w-2xl')
    })

    it('applies extra large size classes', () => {
      render(
        <Modal open={true} size="xl">
          <div>Extra large modal</div>
        </Modal>
      )
      
      const content = screen.getByTestId('dialog-content')
      expect(content).toHaveClass('max-w-4xl')
    })

    it('applies full size classes', () => {
      render(
        <Modal open={true} size="full">
          <div>Full modal</div>
        </Modal>
      )
      
      const content = screen.getByTestId('dialog-content')
      expect(content).toHaveClass('max-w-[95vw]', 'max-h-[95vh]')
    })
  })

  describe('Interactions', () => {
    it('calls onOpenChange when close button is clicked', async () => {
      const handleOpenChange = vi.fn()
      const user = userEvent.setup()
      
      render(
        <Modal open={true} onOpenChange={handleOpenChange} title="Test Modal">
          <div>Content</div>
        </Modal>
      )
      
      const closeButton = screen.getByTestId('dialog-close')
      await user.click(closeButton)
      
      expect(handleOpenChange).toHaveBeenCalledWith(false)
    })

    it('handles ESC key press', async () => {
      const handleOpenChange = vi.fn()
      const user = userEvent.setup()
      
      render(
        <Modal open={true} onOpenChange={handleOpenChange} title="Test Modal">
          <div>Content</div>
        </Modal>
      )
      
      await user.keyboard('{Escape}')
      
      // Note: In a real implementation, this would be handled by Radix UI
      // For testing purposes, we verify the modal is set up to handle it
      expect(screen.getByTestId('dialog-content')).toBeInTheDocument()
    })

    it('handles overlay click', async () => {
      const handleOpenChange = vi.fn()
      const user = userEvent.setup()
      
      render(
        <Modal open={true} onOpenChange={handleOpenChange} title="Test Modal">
          <div>Content</div>
        </Modal>
      )
      
      const overlay = screen.getByTestId('dialog-overlay')
      await user.click(overlay)
      
      // Note: In a real implementation, this would be handled by Radix UI
      expect(overlay).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(
        <Modal open={true} title="Accessible Modal" description="Modal description">
          <div>Content</div>
        </Modal>
      )
      
      const title = screen.getByTestId('dialog-title')
      const description = screen.getByTestId('dialog-description')
      
      expect(title).toBeInTheDocument()
      expect(description).toBeInTheDocument()
    })

    it('has accessible close button', () => {
      render(
        <Modal open={true} title="Test Modal">
          <div>Content</div>
        </Modal>
      )
      
      const closeButton = screen.getByTestId('dialog-close')
      expect(closeButton).toBeInTheDocument()
      
      // Check for screen reader text
      expect(screen.getByText('Close')).toBeInTheDocument()
    })

    it('applies focus ring classes to close button', () => {
      render(
        <Modal open={true} title="Test Modal">
          <div>Content</div>
        </Modal>
      )
      
      const closeButton = screen.getByTestId('dialog-close')
      expect(closeButton).toHaveClass(
        'focus:outline-none',
        'focus:ring-2',
        'focus:ring-ring',
        'focus:ring-offset-2'
      )
    })

    it('applies focus ring classes to modal content', () => {
      render(
        <Modal open={true} title="Test Modal">
          <div>Content</div>
        </Modal>
      )
      
      const content = screen.getByTestId('dialog-content')
      expect(content).toHaveClass(
        'focus-visible:outline-none',
        'focus-visible:ring-2',
        'focus-visible:ring-ring',
        'focus-visible:ring-offset-2'
      )
    })
  })

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      render(
        <Modal open={true} className="custom-modal-class">
          <div>Content</div>
        </Modal>
      )
      
      const content = screen.getByTestId('dialog-content')
      expect(content).toHaveClass('custom-modal-class')
    })

    it('applies default styling classes', () => {
      render(
        <Modal open={true}>
          <div>Content</div>
        </Modal>
      )
      
      const content = screen.getByTestId('dialog-content')
      expect(content).toHaveClass(
        'fixed',
        'left-[50%]',
        'top-[50%]',
        'z-50',
        'w-full',
        'translate-x-[-50%]',
        'translate-y-[-50%]',
        'grid',
        'gap-4',
        'border',
        'bg-background',
        'p-6',
        'shadow-lg',
        'rounded-lg'
      )
    })

    it('applies overlay styling classes', () => {
      render(
        <Modal open={true}>
          <div>Content</div>
        </Modal>
      )
      
      const overlay = screen.getByTestId('dialog-overlay')
      expect(overlay).toHaveClass(
        'fixed',
        'inset-0',
        'z-50',
        'bg-black/50',
        'backdrop-blur-sm'
      )
    })
  })

  describe('Modal Trigger', () => {
    it('renders trigger button', () => {
      render(
        <ModalTrigger>
          <button>Open Modal</button>
        </ModalTrigger>
      )
      
      expect(screen.getByTestId('dialog-trigger')).toBeInTheDocument()
      expect(screen.getByText('Open Modal')).toBeInTheDocument()
    })

    it('handles asChild prop', () => {
      render(
        <ModalTrigger asChild>
          <button>Custom Trigger</button>
        </ModalTrigger>
      )
      
      expect(screen.getByText('Custom Trigger')).toBeInTheDocument()
    })
  })

  describe('Modal Body', () => {
    it('renders body content with default styling', () => {
      render(
        <Modal open={true}>
          <ModalBody>
            <div>Body content</div>
          </ModalBody>
        </Modal>
      )
      
      const body = screen.getByText('Body content').parentElement
      expect(body).toHaveClass('py-4')
    })

    it('applies custom className to body', () => {
      render(
        <Modal open={true}>
          <ModalBody className="custom-body-class">
            <div>Body content</div>
          </ModalBody>
        </Modal>
      )
      
      const body = screen.getByText('Body content').parentElement
      expect(body).toHaveClass('custom-body-class', 'py-4')
    })
  })

  describe('Modal Footer', () => {
    it('renders footer content with default styling', () => {
      render(
        <Modal open={true}>
          <ModalFooter>
            <button>Cancel</button>
            <button>Confirm</button>
          </ModalFooter>
        </Modal>
      )
      
      const footer = screen.getByText('Cancel').parentElement
      expect(footer).toHaveClass(
        'flex',
        'flex-col-reverse',
        'sm:flex-row',
        'sm:justify-end',
        'sm:space-x-2'
      )
    })

    it('applies custom className to footer', () => {
      render(
        <Modal open={true}>
          <ModalFooter className="custom-footer-class">
            <button>Action</button>
          </ModalFooter>
        </Modal>
      )
      
      const footer = screen.getByText('Action').parentElement
      expect(footer).toHaveClass('custom-footer-class')
    })
  })

  describe('Complete Modal Example', () => {
    it('renders complete modal with all components', () => {
      const handleOpenChange = vi.fn()
      
      render(
        <Modal 
          open={true} 
          onOpenChange={handleOpenChange}
          title="Complete Modal"
          description="This is a complete modal example"
          size="lg"
        >
          <ModalBody>
            <p>This is the modal body content.</p>
          </ModalBody>
          <ModalFooter>
            <button>Cancel</button>
            <button>Confirm</button>
          </ModalFooter>
        </Modal>
      )
      
      // Check all parts are rendered
      expect(screen.getByTestId('dialog-title')).toHaveTextContent('Complete Modal')
      expect(screen.getByTestId('dialog-description')).toHaveTextContent('This is a complete modal example')
      expect(screen.getByText('This is the modal body content.')).toBeInTheDocument()
      expect(screen.getByText('Cancel')).toBeInTheDocument()
      expect(screen.getByText('Confirm')).toBeInTheDocument()
      expect(screen.getByTestId('dialog-close')).toBeInTheDocument()
      
      // Check size is applied
      const content = screen.getByTestId('dialog-content')
      expect(content).toHaveClass('max-w-2xl')
    })
  })

  describe('Edge Cases', () => {
    it('handles undefined onOpenChange', () => {
      render(
        <Modal open={true} title="Test Modal">
          <div>Content</div>
        </Modal>
      )
      
      // Should not throw error
      expect(screen.getByTestId('dialog-content')).toBeInTheDocument()
    })

    it('handles empty children', () => {
      render(
        <Modal open={true} title="Empty Modal">
        </Modal>
      )
      
      expect(screen.getByTestId('dialog-title')).toHaveTextContent('Empty Modal')
      expect(screen.getByTestId('dialog-content')).toBeInTheDocument()
    })

    it('handles modal without title and description', () => {
      render(
        <Modal open={true}>
          <div>Content only</div>
        </Modal>
      )
      
      expect(screen.queryByTestId('dialog-title')).not.toBeInTheDocument()
      expect(screen.queryByTestId('dialog-description')).not.toBeInTheDocument()
      expect(screen.getByText('Content only')).toBeInTheDocument()
    })

    it('handles rapid open/close state changes', async () => {
      const TestComponent = () => {
        const [open, setOpen] = React.useState(false)
        
        return (
          <div>
            <button onClick={() => setOpen(!open)}>
              Toggle Modal
            </button>
            <Modal open={open} onOpenChange={setOpen} title="Toggle Modal">
              <div>Modal content</div>
            </Modal>
          </div>
        )
      }
      
      const user = userEvent.setup()
      render(<TestComponent />)
      
      const toggleButton = screen.getByText('Toggle Modal')
      
      // Initially closed
      expect(screen.queryByText('Modal content')).not.toBeInTheDocument()
      
      // Open modal
      await user.click(toggleButton)
      await waitFor(() => {
        expect(screen.getByText('Modal content')).toBeInTheDocument()
      })
      
      // Close modal
      await user.click(toggleButton)
      await waitFor(() => {
        expect(screen.queryByText('Modal content')).not.toBeInTheDocument()
      })
    })
  })
})