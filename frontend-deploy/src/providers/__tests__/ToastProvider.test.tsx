/**
 * Toast Provider Tests
 * 
 * Unit tests for the enhanced ToastProvider component.
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ToastProvider, useToast } from '../ToastProvider';

// Test component that uses the toast hook
const TestComponent = () => {
  const toast = useToast();

  return (
    <div>
      <button onClick={() => toast.success('Success message', 'Success Title')}>
        Success Toast
      </button>
      <button onClick={() => toast.error('Error message', 'Error Title')}>
        Error Toast
      </button>
      <button onClick={() => toast.warning('Warning message', 'Warning Title')}>
        Warning Toast
      </button>
      <button onClick={() => toast.info('Info message', 'Info Title')}>
        Info Toast
      </button>
      <button onClick={() => toast.dismissAll()}>
        Dismiss All
      </button>
    </div>
  );
};

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <ToastProvider>
      {component}
    </ToastProvider>
  );
};

describe('ToastProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('should render children without toasts initially', () => {
    renderWithProvider(<div data-testid="child">Child content</div>);
    
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('should show success toast', async () => {
    renderWithProvider(<TestComponent />);
    
    fireEvent.click(screen.getByText('Success Toast'));
    
    await waitFor(() => {
      expect(screen.getByText('Success Title')).toBeInTheDocument();
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });
  });

  it('should show error toast', async () => {
    renderWithProvider(<TestComponent />);
    
    fireEvent.click(screen.getByText('Error Toast'));
    
    await waitFor(() => {
      expect(screen.getByText('Error Title')).toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
  });

  it('should show warning toast', async () => {
    renderWithProvider(<TestComponent />);
    
    fireEvent.click(screen.getByText('Warning Toast'));
    
    await waitFor(() => {
      expect(screen.getByText('Warning Title')).toBeInTheDocument();
      expect(screen.getByText('Warning message')).toBeInTheDocument();
    });
  });

  it('should show info toast', async () => {
    renderWithProvider(<TestComponent />);
    
    fireEvent.click(screen.getByText('Info Toast'));
    
    await waitFor(() => {
      expect(screen.getByText('Info Title')).toBeInTheDocument();
      expect(screen.getByText('Info message')).toBeInTheDocument();
    });
  });

  it('should auto-dismiss toasts after duration', async () => {
    renderWithProvider(<TestComponent />);
    
    fireEvent.click(screen.getByText('Success Toast'));
    
    await waitFor(() => {
      expect(screen.getByText('Success Title')).toBeInTheDocument();
    });

    // Fast-forward time to trigger auto-dismiss
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(screen.queryByText('Success Title')).not.toBeInTheDocument();
    });
  });

  it('should dismiss toast when close button is clicked', async () => {
    renderWithProvider(<TestComponent />);
    
    fireEvent.click(screen.getByText('Success Toast'));
    
    await waitFor(() => {
      expect(screen.getByText('Success Title')).toBeInTheDocument();
    });

    // Find and click the close button
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText('Success Title')).not.toBeInTheDocument();
    });
  });

  it('should dismiss all toasts', async () => {
    renderWithProvider(<TestComponent />);
    
    // Add multiple toasts
    fireEvent.click(screen.getByText('Success Toast'));
    fireEvent.click(screen.getByText('Error Toast'));
    fireEvent.click(screen.getByText('Info Toast'));
    
    await waitFor(() => {
      expect(screen.getByText('Success Title')).toBeInTheDocument();
      expect(screen.getByText('Error Title')).toBeInTheDocument();
      expect(screen.getByText('Info Title')).toBeInTheDocument();
    });

    // Dismiss all
    fireEvent.click(screen.getByText('Dismiss All'));

    await waitFor(() => {
      expect(screen.queryByText('Success Title')).not.toBeInTheDocument();
      expect(screen.queryByText('Error Title')).not.toBeInTheDocument();
      expect(screen.queryByText('Info Title')).not.toBeInTheDocument();
    });
  });

  it('should limit number of toasts based on maxToasts prop', async () => {
    const TestComponentWithManyToasts = () => {
      const toast = useToast();

      return (
        <div>
          {Array.from({ length: 10 }, (_, i) => (
            <button
              key={i}
              onClick={() => toast.info(`Message ${i}`, `Title ${i}`)}
            >
              Toast {i}
            </button>
          ))}
        </div>
      );
    };

    render(
      <ToastProvider maxToasts={3}>
        <TestComponentWithManyToasts />
      </ToastProvider>
    );

    // Add 5 toasts
    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByText(`Toast ${i}`));
    }

    await waitFor(() => {
      // Should only show the last 3 toasts (maxToasts = 3)
      expect(screen.getByText('Title 4')).toBeInTheDocument();
      expect(screen.getByText('Title 3')).toBeInTheDocument();
      expect(screen.getByText('Title 2')).toBeInTheDocument();
      expect(screen.queryByText('Title 1')).not.toBeInTheDocument();
      expect(screen.queryByText('Title 0')).not.toBeInTheDocument();
    });
  });

  it('should handle persistent toasts', async () => {
    const TestComponentWithPersistent = () => {
      const toast = useToast();

      return (
        <button
          onClick={() => toast.toast({
            type: 'info',
            title: 'Persistent Toast',
            description: 'This toast will not auto-dismiss',
            persistent: true,
          })}
        >
          Persistent Toast
        </button>
      );
    };

    renderWithProvider(<TestComponentWithPersistent />);
    
    fireEvent.click(screen.getByText('Persistent Toast'));
    
    await waitFor(() => {
      expect(screen.getByText('Persistent Toast')).toBeInTheDocument();
    });

    // Fast-forward time - persistent toast should not dismiss
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(screen.getByText('Persistent Toast')).toBeInTheDocument();
  });

  it('should handle toast with action button', async () => {
    const actionSpy = vi.fn();
    
    const TestComponentWithAction = () => {
      const toast = useToast();

      return (
        <button
          onClick={() => toast.toast({
            type: 'info',
            title: 'Action Toast',
            description: 'Toast with action',
            action: {
              label: 'Click me',
              onClick: actionSpy,
            },
          })}
        >
          Action Toast
        </button>
      );
    };

    renderWithProvider(<TestComponentWithAction />);
    
    fireEvent.click(screen.getByText('Action Toast'));
    
    await waitFor(() => {
      expect(screen.getByText('Action Toast')).toBeInTheDocument();
      expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Click me'));
    expect(actionSpy).toHaveBeenCalled();
  });

  it('should throw error when useToast is used outside provider', () => {
    const TestComponentOutsideProvider = () => {
      const toast = useToast();
      return <div>Should not render</div>;
    };

    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponentOutsideProvider />);
    }).toThrow('useToast must be used within a ToastProvider');

    consoleSpy.mockRestore();
  });

  it('should update existing toast', async () => {
    const TestComponentWithUpdate = () => {
      const toast = useToast();
      let toastId: string;

      return (
        <div>
          <button
            onClick={() => {
              toastId = toast.info('Original message', 'Original Title');
            }}
          >
            Create Toast
          </button>
          <button
            onClick={() => {
              toast.update(toastId, {
                title: 'Updated Title',
                description: 'Updated message',
                type: 'success',
              });
            }}
          >
            Update Toast
          </button>
        </div>
      );
    };

    renderWithProvider(<TestComponentWithUpdate />);
    
    fireEvent.click(screen.getByText('Create Toast'));
    
    await waitFor(() => {
      expect(screen.getByText('Original Title')).toBeInTheDocument();
      expect(screen.getByText('Original message')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Update Toast'));

    await waitFor(() => {
      expect(screen.getByText('Updated Title')).toBeInTheDocument();
      expect(screen.getByText('Updated message')).toBeInTheDocument();
      expect(screen.queryByText('Original Title')).not.toBeInTheDocument();
    });
  });
});