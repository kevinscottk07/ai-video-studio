import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Auth0Provider } from '@auth0/auth0-react';
import CreditBalanceDisplay from '../CreditBalanceDisplay';
import { useCredits } from '../../../hooks/useCredits';

// Mock the useCredits hook
jest.mock('../../../hooks/useCredits');
const mockUseCredits = useCredits as jest.MockedFunction<typeof useCredits>;

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  Coins: () => <div data-testid="coins-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  Lock: () => <div data-testid="lock-icon" />,
  Sparkles: () => <div data-testid="sparkles-icon" />,
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <Auth0Provider
      domain="test-domain"
      clientId="test-client-id"
      authorizationParams={{ redirectUri: window.location.origin }}
    >
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </Auth0Provider>
  );
};

describe('CreditBalanceDisplay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state correctly', () => {
    mockUseCredits.mockReturnValue({
      balance: null,
      isLoadingBalance: true,
      formatCredits: (credits: number) => credits.toString(),
      formatCreditValue: (credits: number) => `$${(credits * 0.05).toFixed(2)}`,
    } as any);

    render(<CreditBalanceDisplay />, { wrapper: createWrapper() });

    expect(screen.getByText('Loading balance...')).toBeInTheDocument();
  });

  it('renders error state when balance is null', () => {
    mockUseCredits.mockReturnValue({
      balance: null,
      isLoadingBalance: false,
      formatCredits: (credits: number) => credits.toString(),
      formatCreditValue: (credits: number) => `$${(credits * 0.05).toFixed(2)}`,
    } as any);

    render(<CreditBalanceDisplay />, { wrapper: createWrapper() });

    expect(screen.getByText('Unable to load credit balance')).toBeInTheDocument();
  });

  it('renders balance information correctly', () => {
    const mockBalance = {
      current: 100,
      pending: 20,
      reserved: 10,
      lifetime: 500,
    };

    mockUseCredits.mockReturnValue({
      balance: mockBalance,
      isLoadingBalance: false,
      formatCredits: (credits: number) => credits.toString(),
      formatCreditValue: (credits: number) => `$${(credits * 0.05).toFixed(2)}`,
    } as any);

    render(<CreditBalanceDisplay />, { wrapper: createWrapper() });

    // Check available credits (current - reserved)
    expect(screen.getByText('90')).toBeInTheDocument(); // 100 - 10
    expect(screen.getByText('$4.50')).toBeInTheDocument(); // 90 * 0.05

    // Check details section
    expect(screen.getByText('100')).toBeInTheDocument(); // Total
    expect(screen.getByText('10')).toBeInTheDocument(); // Reserved
    expect(screen.getByText('20')).toBeInTheDocument(); // Pending
    expect(screen.getByText('500')).toBeInTheDocument(); // Lifetime
  });

  it('shows low balance warning when credits are low', () => {
    const mockBalance = {
      current: 5,
      pending: 0,
      reserved: 0,
      lifetime: 100,
    };

    mockUseCredits.mockReturnValue({
      balance: mockBalance,
      isLoadingBalance: false,
      formatCredits: (credits: number) => credits.toString(),
      formatCreditValue: (credits: number) => `$${(credits * 0.05).toFixed(2)}`,
    } as any);

    render(<CreditBalanceDisplay />, { wrapper: createWrapper() });

    expect(screen.getByText('Low credit balance. Consider purchasing more credits.')).toBeInTheDocument();
  });

  it('hides details when showDetails is false', () => {
    const mockBalance = {
      current: 100,
      pending: 20,
      reserved: 10,
      lifetime: 500,
    };

    mockUseCredits.mockReturnValue({
      balance: mockBalance,
      isLoadingBalance: false,
      formatCredits: (credits: number) => credits.toString(),
      formatCreditValue: (credits: number) => `$${(credits * 0.05).toFixed(2)}`,
    } as any);

    render(<CreditBalanceDisplay showDetails={false} />, { wrapper: createWrapper() });

    // Main balance should be visible
    expect(screen.getByText('90')).toBeInTheDocument();
    
    // Details should not be visible
    expect(screen.queryByText('Total')).not.toBeInTheDocument();
    expect(screen.queryByText('Lifetime Credits')).not.toBeInTheDocument();
  });

  it('applies correct size classes', () => {
    const mockBalance = {
      current: 100,
      pending: 0,
      reserved: 0,
      lifetime: 500,
    };

    mockUseCredits.mockReturnValue({
      balance: mockBalance,
      isLoadingBalance: false,
      formatCredits: (credits: number) => credits.toString(),
      formatCreditValue: (credits: number) => `$${(credits * 0.05).toFixed(2)}`,
    } as any);

    const { rerender } = render(<CreditBalanceDisplay size="sm" />, { wrapper: createWrapper() });
    
    let container = screen.getByText('Available Credits').closest('div');
    expect(container).toHaveClass('text-sm');

    rerender(<CreditBalanceDisplay size="lg" />);
    
    container = screen.getByText('Available Credits').closest('div');
    expect(container).toHaveClass('text-lg');
  });

  it('applies correct variant classes', () => {
    const mockBalance = {
      current: 100,
      pending: 0,
      reserved: 0,
      lifetime: 500,
    };

    mockUseCredits.mockReturnValue({
      balance: mockBalance,
      isLoadingBalance: false,
      formatCredits: (credits: number) => credits.toString(),
      formatCreditValue: (credits: number) => `$${(credits * 0.05).toFixed(2)}`,
    } as any);

    const { rerender } = render(<CreditBalanceDisplay variant="card" />, { wrapper: createWrapper() });
    
    let container = screen.getByText('Available Credits').closest('div');
    expect(container).toHaveClass('bg-card');

    rerender(<CreditBalanceDisplay variant="minimal" />);
    
    container = screen.getByText('Available Credits').closest('div');
    expect(container).toHaveClass('bg-transparent');
  });

  it('does not show reserved credits section when reserved is 0', () => {
    const mockBalance = {
      current: 100,
      pending: 0,
      reserved: 0,
      lifetime: 500,
    };

    mockUseCredits.mockReturnValue({
      balance: mockBalance,
      isLoadingBalance: false,
      formatCredits: (credits: number) => credits.toString(),
      formatCreditValue: (credits: number) => `$${(credits * 0.05).toFixed(2)}`,
    } as any);

    render(<CreditBalanceDisplay />, { wrapper: createWrapper() });

    expect(screen.queryByText('Reserved')).not.toBeInTheDocument();
  });

  it('does not show pending credits section when pending is 0', () => {
    const mockBalance = {
      current: 100,
      pending: 0,
      reserved: 10,
      lifetime: 500,
    };

    mockUseCredits.mockReturnValue({
      balance: mockBalance,
      isLoadingBalance: false,
      formatCredits: (credits: number) => credits.toString(),
      formatCreditValue: (credits: number) => `$${(credits * 0.05).toFixed(2)}`,
    } as any);

    render(<CreditBalanceDisplay />, { wrapper: createWrapper() });

    expect(screen.queryByText('Pending')).not.toBeInTheDocument();
  });
});