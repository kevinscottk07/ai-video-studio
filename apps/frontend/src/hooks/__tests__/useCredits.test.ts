import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Auth0Provider } from '@auth0/auth0-react';
import { useCredits, useCreditCheck } from '../useCredits';
import { creditApi } from '../../services/api/creditApi';
import { useRealTime } from '../useRealTime';
import { useToast } from '../../providers/ToastProvider';

// Mock dependencies
jest.mock('../../services/api/creditApi');
jest.mock('../useRealTime');
jest.mock('../../providers/ToastProvider');
jest.mock('@auth0/auth0-react');

const mockCreditApi = creditApi as jest.Mocked<typeof creditApi>;
const mockUseRealTime = useRealTime as jest.MockedFunction<typeof useRealTime>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;
const mockUseAuth0 = require('@auth0/auth0-react').useAuth0 as jest.MockedFunction<any>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useCredits', () => {
  const mockToast = jest.fn();
  const mockSubscribe = jest.fn();
  const mockUnsubscribe = jest.fn();
  const mockGetAccessTokenSilently = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseAuth0.mockReturnValue({
      isAuthenticated: true,
      getAccessTokenSilently: mockGetAccessTokenSilently,
    });

    mockUseRealTime.mockReturnValue({
      subscribe: mockSubscribe,
      unsubscribe: mockUnsubscribe,
    } as any);

    mockUseToast.mockReturnValue({
      toast: mockToast,
    } as any);

    mockGetAccessTokenSilently.mockResolvedValue('mock-token');
  });

  it('fetches credit balance when authenticated', async () => {
    const mockBalance = {
      current: 100,
      pending: 20,
      reserved: 10,
      lifetime: 500,
    };

    mockCreditApi.getCreditBalance.mockResolvedValue(mockBalance);

    const { result } = renderHook(() => useCredits(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.balance).toEqual(mockBalance);
    });

    expect(mockCreditApi.getCreditBalance).toHaveBeenCalledWith('mock-token');
  });

  it('does not fetch balance when not authenticated', () => {
    mockUseAuth0.mockReturnValue({
      isAuthenticated: false,
      getAccessTokenSilently: mockGetAccessTokenSilently,
    });

    renderHook(() => useCredits(), { wrapper: createWrapper() });

    expect(mockCreditApi.getCreditBalance).not.toHaveBeenCalled();
  });

  it('formats credits correctly', () => {
    const { result } = renderHook(() => useCredits(), { wrapper: createWrapper() });

    expect(result.current.formatCredits(500)).toBe('500');
    expect(result.current.formatCredits(1500)).toBe('1.5K');
    expect(result.current.formatCredits(1500000)).toBe('1.5M');
  });

  it('formats credit value correctly', () => {
    const { result } = renderHook(() => useCredits(), { wrapper: createWrapper() });

    expect(result.current.formatCreditValue(100)).toBe('$5.00');
    expect(result.current.formatCreditValue(200, 0.1)).toBe('$20.00');
  });

  it('returns correct transaction type colors', () => {
    const { result } = renderHook(() => useCredits(), { wrapper: createWrapper() });

    expect(result.current.getTransactionTypeColor('purchase')).toBe('text-success');
    expect(result.current.getTransactionTypeColor('subscription_grant')).toBe('text-success');
    expect(result.current.getTransactionTypeColor('refund')).toBe('text-success');
    expect(result.current.getTransactionTypeColor('deduction')).toBe('text-muted-foreground');
  });

  it('returns correct transaction type icons', () => {
    const { result } = renderHook(() => useCredits(), { wrapper: createWrapper() });

    expect(result.current.getTransactionTypeIcon('purchase')).toBe('plus');
    expect(result.current.getTransactionTypeIcon('subscription_grant')).toBe('plus');
    expect(result.current.getTransactionTypeIcon('deduction')).toBe('minus');
    expect(result.current.getTransactionTypeIcon('refund')).toBe('rotate-ccw');
  });

  it('subscribes to real-time credit updates', () => {
    renderHook(() => useCredits(), { wrapper: createWrapper() });

    expect(mockSubscribe).toHaveBeenCalledWith('credits:updated', expect.any(Function));
  });

  it('handles real-time credit updates with toast notifications', async () => {
    let creditUpdateHandler: any;
    mockSubscribe.mockImplementation((event, handler) => {
      if (event === 'credits:updated') {
        creditUpdateHandler = handler;
      }
    });

    renderHook(() => useCredits(), { wrapper: createWrapper() });

    const updateData = {
      balance: { current: 150, pending: 0, reserved: 0, lifetime: 600 },
      transaction: {
        type: 'purchase',
        amount: 50,
        description: 'Credit purchase',
      },
    };

    creditUpdateHandler(updateData);

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Credits Added',
      description: '50 credits - Credit purchase',
      variant: 'success',
    });
  });

  it('handles purchase credits mutation success with checkout URL', async () => {
    const mockPurchaseResponse = {
      checkoutUrl: 'https://checkout.example.com',
    };

    mockCreditApi.purchaseCredits.mockResolvedValue(mockPurchaseResponse);

    // Mock window.location.href
    delete (window as any).location;
    (window as any).location = { href: '' };

    const { result } = renderHook(() => useCredits(), { wrapper: createWrapper() });

    const purchaseRequest = {
      amount: 100,
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
    };

    result.current.purchaseCredits(purchaseRequest);

    await waitFor(() => {
      expect(window.location.href).toBe('https://checkout.example.com');
    });
  });

  it('handles purchase credits mutation error', async () => {
    const mockError = {
      response: {
        data: {
          message: 'Payment failed',
        },
      },
    };

    mockCreditApi.purchaseCredits.mockRejectedValue(mockError);

    const { result } = renderHook(() => useCredits(), { wrapper: createWrapper() });

    const purchaseRequest = {
      amount: 100,
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
    };

    result.current.purchaseCredits(purchaseRequest);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Purchase Failed',
        description: 'Payment failed',
        variant: 'destructive',
      });
    });
  });
});

describe('useCreditCheck', () => {
  const mockGetAccessTokenSilently = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseAuth0.mockReturnValue({
      isAuthenticated: true,
      getAccessTokenSilently: mockGetAccessTokenSilently,
    });

    mockUseRealTime.mockReturnValue({
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    } as any);

    mockUseToast.mockReturnValue({
      toast: jest.fn(),
    } as any);

    mockGetAccessTokenSilently.mockResolvedValue('mock-token');
  });

  it('checks sufficient credits correctly', async () => {
    const mockBalance = {
      current: 100,
      pending: 20,
      reserved: 10,
      lifetime: 500,
    };

    mockCreditApi.getCreditBalance.mockResolvedValue(mockBalance);

    const { result } = renderHook(() => useCreditCheck(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.balance).toEqual(mockBalance);
    });

    // Available credits = 100 - 10 = 90
    expect(result.current.checkSufficientCredits(50)).toBe(true);
    expect(result.current.checkSufficientCredits(100)).toBe(false);
  });

  it('returns available credits correctly', async () => {
    const mockBalance = {
      current: 100,
      pending: 20,
      reserved: 10,
      lifetime: 500,
    };

    mockCreditApi.getCreditBalance.mockResolvedValue(mockBalance);

    const { result } = renderHook(() => useCreditCheck(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.balance).toEqual(mockBalance);
    });

    // Available credits = 100 - 10 = 90
    expect(result.current.getAvailableCredits()).toBe(90);
  });

  it('handles null balance gracefully', () => {
    mockCreditApi.getCreditBalance.mockResolvedValue(null as any);

    const { result } = renderHook(() => useCreditCheck(), { wrapper: createWrapper() });

    expect(result.current.checkSufficientCredits(50)).toBe(false);
    expect(result.current.getAvailableCredits()).toBe(0);
  });
});