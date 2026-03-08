/**
 * Social Login Button Tests
 * 
 * Unit tests for the social login button components
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { 
  SocialLoginButton, 
  GoogleLoginButton, 
  GitHubLoginButton 
} from '../SocialLoginButton';

// Mock Framer Motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
}));

describe('SocialLoginButton', () => {
  const mockOnClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Google login button with correct styling', () => {
    render(<SocialLoginButton provider="google" onClick={mockOnClick} />);
    
    expect(screen.getByText('Continue with Google')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders GitHub login button with correct styling', () => {
    render(<SocialLoginButton provider="github" onClick={mockOnClick} />);
    
    expect(screen.getByText('Continue with GitHub')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('calls onClick when button is clicked', () => {
    render(<SocialLoginButton provider="google" onClick={mockOnClick} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('shows loading state when loading prop is true', () => {
    render(<SocialLoginButton provider="google" onClick={mockOnClick} loading={true} />);
    
    expect(screen.getByText('Connecting...')).toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    render(<SocialLoginButton provider="google" onClick={mockOnClick} disabled={true} />);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('is disabled when loading is true', () => {
    render(<SocialLoginButton provider="google" onClick={mockOnClick} loading={true} />);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('renders custom children when provided', () => {
    render(
      <SocialLoginButton provider="google" onClick={mockOnClick}>
        Custom Login Text
      </SocialLoginButton>
    );
    
    expect(screen.getByText('Custom Login Text')).toBeInTheDocument();
  });

  it('applies different sizes correctly', () => {
    const { rerender } = render(
      <SocialLoginButton provider="google" onClick={mockOnClick} size="sm" />
    );
    
    let button = screen.getByRole('button');
    expect(button).toHaveClass('px-3', 'py-2', 'text-sm');
    
    rerender(<SocialLoginButton provider="google" onClick={mockOnClick} size="lg" />);
    
    button = screen.getByRole('button');
    expect(button).toHaveClass('px-6', 'py-4', 'text-lg');
  });

  it('hides icon when showIcon is false', () => {
    render(<SocialLoginButton provider="google" onClick={mockOnClick} showIcon={false} />);
    
    // The SVG icon should not be present
    const button = screen.getByRole('button');
    const svg = button.querySelector('svg');
    expect(svg).toBeNull();
  });

  it('hides arrow when showArrow is false', () => {
    render(<SocialLoginButton provider="google" onClick={mockOnClick} showArrow={false} />);
    
    // The arrow icon should not be present
    expect(screen.queryByTestId('arrow-right')).toBeNull();
  });

  it('applies outline variant styling', () => {
    render(<SocialLoginButton provider="google" onClick={mockOnClick} variant="outline" />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-transparent', 'border-gray-200');
  });

  it('applies minimal variant styling', () => {
    render(<SocialLoginButton provider="google" onClick={mockOnClick} variant="minimal" />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-transparent', 'border-transparent');
  });
});

describe('Preset Social Login Buttons', () => {
  const mockOnClick = vi.fn();

  it('GoogleLoginButton renders with Google provider', () => {
    render(<GoogleLoginButton onClick={mockOnClick} />);
    
    expect(screen.getByText('Continue with Google')).toBeInTheDocument();
  });

  it('GitHubLoginButton renders with GitHub provider', () => {
    render(<GitHubLoginButton onClick={mockOnClick} />);
    
    expect(screen.getByText('Continue with GitHub')).toBeInTheDocument();
  });
});