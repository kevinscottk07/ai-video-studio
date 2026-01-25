# Credit Management UI Components

This directory contains the premium credit management UI components for the AI Video Studio platform. These components provide a world-class user experience for managing credits with smooth animations, real-time updates, and comprehensive functionality.

## Components

### CreditBalanceDisplay

A premium animated credit balance display component that shows current balance, pending credits, reserved credits, and lifetime statistics.

**Features:**
- Real-time balance updates via WebSocket
- Smooth animations for balance changes
- Low balance warnings with animated alerts
- Detailed breakdown of credit allocation
- Multiple size and variant options
- Responsive design

**Usage:**
```tsx
import { CreditBalanceDisplay } from '../components/credits';

<CreditBalanceDisplay 
  size="lg" 
  variant="card"
  showDetails={true}
  className="max-w-2xl mx-auto"
/>
```

**Props:**
- `className?: string` - Additional CSS classes
- `showDetails?: boolean` - Show detailed breakdown (default: true)
- `size?: 'sm' | 'md' | 'lg'` - Component size (default: 'md')
- `variant?: 'default' | 'card' | 'minimal'` - Visual variant (default: 'default')

### CreditPurchaseModal

An elegant modal for purchasing credits with animated pricing tiers, popular badges, and smooth checkout flow.

**Features:**
- Interactive pricing tier selection
- Animated tier cards with hover effects
- Popular and savings badges
- Bonus credit calculations
- Secure payment integration
- Mobile-responsive design

**Usage:**
```tsx
import { CreditPurchaseModal } from '../components/credits';

<CreditPurchaseModal
  open={showModal}
  onOpenChange={setShowModal}
/>
```

**Props:**
- `open: boolean` - Modal visibility state
- `onOpenChange: (open: boolean) => void` - Modal state change handler
- `className?: string` - Additional CSS classes

### CreditUsageHistory

Interactive credit usage history with charts, filters, and transaction details.

**Features:**
- Transaction list with search and filtering
- Interactive bar charts for usage visualization
- Date range and transaction type filters
- Summary statistics with spending analytics
- Export functionality
- Pagination support

**Usage:**
```tsx
import { CreditUsageHistory } from '../components/credits';

<CreditUsageHistory 
  showCharts={true}
  maxTransactions={50}
/>
```

**Props:**
- `className?: string` - Additional CSS classes
- `showCharts?: boolean` - Enable chart view (default: true)
- `maxTransactions?: number` - Maximum transactions to load (default: 50)

### CreditWidget

A compact credit display widget for headers, sidebars, or dashboards.

**Features:**
- Compact design for space-constrained areas
- Quick purchase button integration
- Low balance warnings
- Pending credits indicator
- Click handler support

**Usage:**
```tsx
import { CreditWidget } from '../components/credits';

<CreditWidget 
  size="md"
  showPurchaseButton={true}
  onClick={() => navigate('/credits')}
/>
```

**Props:**
- `className?: string` - Additional CSS classes
- `size?: 'sm' | 'md'` - Widget size (default: 'md')
- `showPurchaseButton?: boolean` - Show quick purchase button (default: true)
- `onClick?: () => void` - Click handler for widget

## Hooks

### useCredits

Main hook for credit management functionality.

**Features:**
- Credit balance queries with real-time updates
- Credit purchase mutations
- Credit estimation
- Transaction history queries
- Real-time WebSocket integration
- Toast notifications for credit events

**Usage:**
```tsx
import { useCredits } from '../../hooks/useCredits';

const {
  balance,
  isLoadingBalance,
  purchaseCredits,
  isPurchasing,
  useCreditHistory,
  estimateCredits,
  formatCredits,
  formatCreditValue,
} = useCredits();
```

### useCreditCheck

Utility hook for checking credit sufficiency.

**Features:**
- Check if user has sufficient credits
- Get available credits calculation
- Balance validation utilities

**Usage:**
```tsx
import { useCreditCheck } from '../../hooks/useCredits';

const {
  checkSufficientCredits,
  getAvailableCredits,
  balance,
} = useCreditCheck();

const canGenerate = checkSufficientCredits(50);
```

## API Service

### creditApi

Service for credit-related API calls.

**Methods:**
- `getCreditBalance(token)` - Get user's credit balance
- `purchaseCredits(token, request)` - Initiate credit purchase
- `getCreditHistory(token, request)` - Get transaction history
- `estimateCredits(token, request)` - Estimate operation costs
- `deductCredits(token, ...)` - Deduct credits (internal)
- `refundCredits(token, ...)` - Refund credits (internal)

## Pages

### CreditsPage

Comprehensive credit management page that combines all components.

**Features:**
- Tabbed interface (Overview, History, Settings)
- Quick actions for purchasing credits
- Statistics dashboard
- Settings management
- Responsive layout

**Usage:**
```tsx
import CreditsPage from '../pages/CreditsPage';

// Route configuration
<Route path="/credits" element={<CreditsPage />} />
```

## Real-time Integration

The credit system integrates with the real-time WebSocket service to provide live updates:

**Events:**
- `credits:updated` - Fired when credit balance changes
- Includes updated balance and transaction details
- Automatically updates UI and shows toast notifications

**Implementation:**
```tsx
// Real-time updates are handled automatically by useCredits hook
useEffect(() => {
  const handleCreditUpdate = (data) => {
    // Update balance in cache
    queryClient.setQueryData(['credits', 'balance'], data.balance);
    
    // Show notification
    toast({
      title: 'Credits Updated',
      description: `${data.transaction.amount} credits - ${data.transaction.description}`,
    });
  };

  subscribe('credits:updated', handleCreditUpdate);
  return () => unsubscribe('credits:updated', handleCreditUpdate);
}, []);
```

## Styling and Animations

The components use:
- **Framer Motion** for smooth animations and transitions
- **Tailwind CSS** with custom design system tokens
- **Radix UI** primitives for accessibility
- **Lucide React** icons for consistent iconography

**Animation Features:**
- Smooth balance updates with number transitions
- Hover effects on interactive elements
- Loading states with skeleton animations
- Modal entrance/exit animations
- Chart animations for data visualization

## Testing

Comprehensive test coverage includes:
- Component rendering tests
- User interaction tests
- Hook functionality tests
- API integration tests
- Real-time update tests

**Test Files:**
- `__tests__/CreditBalanceDisplay.test.tsx`
- `__tests__/CreditWidget.test.tsx`
- `../hooks/__tests__/useCredits.test.ts`

## Requirements Validation

This implementation satisfies the following requirements:

**Requirement 3.1**: Credit cost display before processing
- ✅ `estimateCredits` function provides accurate cost estimates
- ✅ Purchase modal shows exact credit amounts and costs

**Requirement 3.2**: Insufficient credits prevention and purchase options
- ✅ `useCreditCheck` hook validates sufficient credits
- ✅ Purchase modal accessible from multiple components
- ✅ Low balance warnings with purchase prompts

**Requirement 3.5**: Credit usage history with detailed breakdowns
- ✅ `CreditUsageHistory` component with comprehensive filtering
- ✅ Transaction details with operation links
- ✅ Visual charts and analytics

## Performance Considerations

- **Query Caching**: React Query caches balance and history data
- **Real-time Updates**: WebSocket integration for live updates
- **Lazy Loading**: Components use code splitting where appropriate
- **Optimistic Updates**: UI updates immediately for better UX
- **Debounced Searches**: Search inputs are debounced to reduce API calls

## Accessibility

All components follow WCAG 2.1 AA guidelines:
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support
- Focus management
- Semantic HTML structure

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Future Enhancements

Potential improvements for future versions:
- Credit gifting between users
- Bulk purchase discounts
- Credit expiration management
- Advanced analytics dashboard
- Mobile app integration
- Subscription credit management