/**
 * Premium Login Form Tests
 * 
 * Unit tests for the premium authentication components
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PremiumLoginForm } from '../PremiumLoginForm';

// Mock Auth0
vi.mock('@auth0/auth0-react', () => ({
  useAuth0: () => ({
    loginWithRedirect: vi.fn(),
    isLoading: false,
  }),
}));

// Mock Framer Motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

describe('PremiumLoginForm', () => {
  it('renders login form with social login options', () => {
    render(<PremiumLoginForm />);
    
    expect(screen.getByText('AI Video Studio')).toBeInTheDocument();
    expect(screen.getByText('Continue with Google')).toBeInTheDocument();
    expect(screen.getByText('Continue with GitHub')).toBeInTheDocument();
    expect(screen.getByText('Sign In with Email')).toBeInTheDocument();
  });

  it('switches between login and signup modes', () => {
    const mockOnModeChange = vi.fn();
    render(<PremiumLoginForm onModeChange={mockOnModeChange} />);
    
    const signUpButton = screen.getByText('Sign up');
    fireEvent.click(signUpButton);
    
    expect(mockOnModeChange).toHaveBeenCalledWith('signup');
    expect(screen.getByText('Create Account with Email')).toBeInTheDocument();
  });

  it('displays features showcase', () => {
    render(<PremiumLoginForm />);
    
    expect(screen.getByText('AI-powered video generation')).toBeInTheDocument();
    expect(screen.getByText('Community sharing & collaboration')).toBeInTheDocument();
    expect(screen.getByText('Enterprise-grade security')).toBeInTheDocument();
    expect(screen.getByText('Lightning-fast processing')).toBeInTheDocument();
  });

  it('shows loading state when Auth0 is loading', () => {
    vi.mocked(require('@auth0/auth0-react').useAuth0).mockReturnValue({
      loginWithRedirect: vi.fn(),
      isLoading: true,
    });

    render(<PremiumLoginForm />);
    
    expect(screen.getByText('Connecting...')).toBeInTheDocument();
  });
});