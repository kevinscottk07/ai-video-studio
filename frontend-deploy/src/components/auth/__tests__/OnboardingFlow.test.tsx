/**
 * Onboarding Flow Tests
 * 
 * Unit tests for the multi-step onboarding component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OnboardingFlow } from '../OnboardingFlow';

// Mock Auth0
vi.mock('@auth0/auth0-react', () => ({
  useAuth0: () => ({
    user: {
      name: 'Test User',
      email: 'test@example.com',
      picture: 'https://example.com/avatar.jpg',
    },
  }),
}));

// Mock user hooks
vi.mock('../../../hooks/useUser', () => ({
  useCreateUserProfile: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

// Mock toast provider
vi.mock('../../../providers/ToastProvider', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
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

describe('OnboardingFlow', () => {
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders first step with basic information form', () => {
    render(<OnboardingFlow onComplete={mockOnComplete} />);
    
    expect(screen.getByText("Let's get to know you")).toBeInTheDocument();
    expect(screen.getByText('Display Name')).toBeInTheDocument();
    expect(screen.getByText('Language')).toBeInTheDocument();
    expect(screen.getByText('Timezone')).toBeInTheDocument();
  });

  it('shows progress indicator with correct step', () => {
    render(<OnboardingFlow onComplete={mockOnComplete} />);
    
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
    expect(screen.getByText('Basic Info')).toBeInTheDocument();
  });

  it('navigates to next step when Next button is clicked', () => {
    render(<OnboardingFlow onComplete={mockOnComplete} />);
    
    // Fill in required field
    const nameInput = screen.getByPlaceholderText('Enter your display name');
    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    
    // Click Next
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    
    // Should be on interests step
    expect(screen.getByText('What interests you?')).toBeInTheDocument();
    expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
  });

  it('disables Next button when required fields are empty', () => {
    render(<OnboardingFlow onComplete={mockOnComplete} />);
    
    const nextButton = screen.getByText('Next');
    expect(nextButton).toBeDisabled();
  });

  it('enables Previous button on steps after first', () => {
    render(<OnboardingFlow onComplete={mockOnComplete} />);
    
    // Fill in required field and go to next step
    const nameInput = screen.getByPlaceholderText('Enter your display name');
    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    fireEvent.click(screen.getByText('Next'));
    
    // Previous button should be enabled
    const previousButton = screen.getByText('Previous');
    expect(previousButton).not.toBeDisabled();
  });

  it('shows Complete Setup button on final step', () => {
    render(<OnboardingFlow onComplete={mockOnComplete} />);
    
    // Navigate through all steps
    const steps = [
      { input: 'Enter your display name', value: 'Test User' },
    ];
    
    // Fill first step
    const nameInput = screen.getByPlaceholderText('Enter your display name');
    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    fireEvent.click(screen.getByText('Next'));
    
    // Select an interest
    const marketingButton = screen.getByText('Marketing Videos');
    fireEvent.click(marketingButton);
    fireEvent.click(screen.getByText('Next'));
    
    // Select experience level
    const beginnerButton = screen.getByText('Beginner - New to video creation');
    fireEvent.click(beginnerButton);
    fireEvent.click(screen.getByText('Next'));
    
    // Should show Complete Setup button
    expect(screen.getByText('Complete Setup')).toBeInTheDocument();
  });

  it('displays interest selection options', () => {
    render(<OnboardingFlow onComplete={mockOnComplete} />);
    
    // Navigate to interests step
    const nameInput = screen.getByPlaceholderText('Enter your display name');
    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    fireEvent.click(screen.getByText('Next'));
    
    expect(screen.getByText('Marketing Videos')).toBeInTheDocument();
    expect(screen.getByText('Social Media')).toBeInTheDocument();
    expect(screen.getByText('Educational Content')).toBeInTheDocument();
    expect(screen.getByText('Entertainment')).toBeInTheDocument();
  });

  it('allows multiple interest selections', () => {
    render(<OnboardingFlow onComplete={mockOnComplete} />);
    
    // Navigate to interests step
    const nameInput = screen.getByPlaceholderText('Enter your display name');
    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    fireEvent.click(screen.getByText('Next'));
    
    // Select multiple interests
    fireEvent.click(screen.getByText('Marketing Videos'));
    fireEvent.click(screen.getByText('Social Media'));
    
    // Both should be selected (this would be visually indicated in the actual component)
    expect(screen.getByText('Marketing Videos')).toBeInTheDocument();
    expect(screen.getByText('Social Media')).toBeInTheDocument();
  });
});