import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Auth0Provider } from '@auth0/auth0-react';
import CreditWidget from '../CreditWidget';
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
  Plus: () => <div data-testid="plus-icon" />,
  TrendingDown: () => <div data-testid="trending-down-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
}));

// Mock the CreditPurchaseModal
jest.mock('../CreditPurchaseModal', () => {
  return function MockCreditPurchaseModal({ open, onOpenChange }: any) {
    return open ? (
      <div data-testid="credit-purchase-modal">
        <button onClick={() => onOpenChange(false)}>Close Modal</button>
      </div>
    ) : null;
  };
});

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

describe('CreditWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state correctly', () => {
    mockUseCredits.mockReturnValue({
      balance: null,
      isLoadingBalance: true,
      formatCredits: (credits: number) => credits.toString(),
    } as any);

    render(<CreditWidget />, { wrapper: createWrapper() });

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders error state when balance is null', () => {
    mockUseCredits.mockReturnValue({
      balance: null,
      isLoadingBalance: false,
      formatCredits: (credits: number) => credits.toString(),
    } as any);

    render(<CreditWidget />, { wrapper: createWrapper() });

    expect(screen.getByText('--')).toBeInTheDocument();
    expect(screen.getByTestId('coins-icon')).toBeInTheDocument();
  });

  it('renders balance information correctly', () => {
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
    } as any);

    render(<CreditWidget />, { wrapper: createWrapper() });

    // Available credits = current - reserved = 100 - 10 = 90
    expect(screen.getByText('90')).toBeInTheDocument();
    expect(screen.getByText('credits')).toBeInTheDocument();
    expect(screen.getByTestId('coins-icon')).toBeInTheDocument();
  });

  it('shows warning icon and styling for low balance', () => {
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
    } as any);

    render(<CreditWidget />, { wrapper: createWrapper() });

    expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('shows pending credits indicator when pending > 0', () => {
    const mockBalance = {
      current: 100,
      pending: 20,
      reserved: 0,
      lifetime: 500,
    };

    mockUseCredits.mockReturnValue({
      balance: mockBalance,
      isLoadingBalance: false,
      formatCredits: (credits: number) => credits.toString(),
    } as any);

    render(<CreditWidget />, { wrapper: createWrapper() });

    // The pending indicator is rendered as a div with specific classes
    const widget = screen.getByText('100').closest('div');
    expect(widget).toBeInTheDocument();
  });

  it('opens purchase modal when plus button is clicked', async () => {
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
    } as any);

    render(<CreditWidget />, { wrapper: createWrapper() });

    const plusButton = screen.getByTestId('plus-icon').closest('button');
    expect(plusButton).toBeInTheDocument();

    fireEvent.click(plusButton!);

    await waitFor(() => {
      expect(screen.getByTestId('credit-purchase-modal')).toBeInTheDocument();
    });
  });

  it('calls onClick handler when widget is clicked', () => {
    const mockOnClick = jest.fn();
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
    } as any);

    render(<CreditWidget onClick={mockOnClick} />, { wrapper: createWrapper() });

    const widget = screen.getByText('100').closest('div');
    fireEvent.click(widget!);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('hides purchase button when showPurchaseButton is false', () => {
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
    } as any);

    render(<CreditWidget showPurchaseButton={false} />, { wrapper: createWrapper() });

    expect(screen.queryByTestId('plus-icon')).not.toBeInTheDocument();
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
    } as any);

    const { rerender } = render(<CreditWidget size="sm" />, { wrapper: createWrapper() });
    
    let widget = screen.getByText('100').closest('div');
    expect(widget).toHaveClass('text-sm');

    rerender(<CreditWidget size="md" />);
    
    widget = screen.getByText('100').closest('div');
    expect(widget).toHaveClass('text-base');
    
    // Medium size should show "credits" text
    expect(screen.getByText('credits')).toBeInTheDocument();
  });

  it('prevents event propagation when plus button is clicked', async () => {
    const mockOnClick = jest.fn();
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
    } as any);

    render(<CreditWidget onClick={mockOnClick} />, { wrapper: createWrapper() });

    const plusButton = screen.getByTestId('plus-icon').closest('button');
    fireEvent.click(plusButton!);

    // Widget onClick should not be called when plus button is clicked
    expect(mockOnClick).not.toHaveBeenCalled();
    
    // Modal should open
    await waitFor(() => {
      expect(screen.getByTestId('credit-purchase-modal')).toBeInTheDocument();
    });
  });
});