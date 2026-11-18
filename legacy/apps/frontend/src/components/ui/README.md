# AI Video Studio UI Component Library

A comprehensive UI component library built with Radix UI primitives, Framer Motion animations, and consistent design system integration.

## Components

### Core Components

#### Button (`button.tsx`)
- **Variants**: default, secondary, outline, ghost, destructive, ai, video, generation, gradient
- **Sizes**: sm, default, lg, xl, icon
- **Features**: Loading states, disabled states, Framer Motion animations, focus management
- **Accessibility**: Full keyboard navigation, ARIA attributes, focus indicators

#### Input (`input.tsx`)
- **Variants**: default, ghost, filled
- **Sizes**: sm, default, lg
- **Features**: Left/right icons, error/success states, helper text, labels
- **Accessibility**: Proper labeling, error announcements, keyboard navigation

#### Modal (`modal.tsx`)
- **Sizes**: sm, md, lg, xl, full
- **Features**: Smooth animations, backdrop blur, focus trapping, ESC key handling
- **Components**: Modal, ModalTrigger, ModalBody, ModalFooter
- **Accessibility**: Focus management, ARIA attributes, keyboard navigation

#### Dropdown (`dropdown.tsx`)
- **Components**: Dropdown, DropdownTrigger, DropdownContent, DropdownItem
- **Features**: Checkbox items, radio groups, separators, labels, sub-menus
- **Accessibility**: Full keyboard navigation, ARIA attributes, focus management

#### Form (`form.tsx`)
- **Integration**: React Hook Form + Zod validation
- **Components**: Form, FormField, FormInput, FormTextarea, FormSubmit
- **Features**: Real-time validation, error handling, loading states
- **Accessibility**: Proper form labeling, error announcements

#### Select (`select.tsx`)
- **Features**: Searchable options, keyboard navigation, custom styling
- **Components**: Select, SelectTrigger, SelectContent, SelectItem
- **Accessibility**: Full keyboard support, ARIA attributes

#### Toast (`toast.tsx`)
- **Variants**: default, success, error, warning, info
- **Features**: Auto-dismiss, swipe gestures, programmatic API
- **Components**: ToastProvider, Toast, ToastManager
- **Accessibility**: Screen reader announcements, focus management

## Design System Integration

### Consistent Styling
- All components use the design system tokens
- Consistent spacing, typography, and color schemes
- Dark/light mode support
- Responsive design patterns

### Animation System
- Framer Motion integration for smooth interactions
- Consistent animation timing and easing
- Reduced motion support for accessibility
- Performance-optimized animations

### Focus Management
- Consistent focus ring styles across all components
- Keyboard navigation support
- Focus trapping in modals and dropdowns
- Skip links and accessibility shortcuts

## Usage Examples

### Basic Button
```tsx
import { Button } from '@/components/ui'

<Button variant="primary" size="lg" onClick={handleClick}>
  Click me
</Button>
```

### Form with Validation
```tsx
import { Form, FormInput, FormSubmit, useFormWithValidation } from '@/components/ui'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

const MyForm = () => {
  const form = useFormWithValidation(schema)
  
  return (
    <Form form={form} onSubmit={handleSubmit}>
      <FormInput name="email" label="Email" type="email" required />
      <FormInput name="password" label="Password" type="password" required />
      <FormSubmit>Submit</FormSubmit>
    </Form>
  )
}
```

### Modal Dialog
```tsx
import { Modal, ModalBody, ModalFooter, Button } from '@/components/ui'

<Modal open={isOpen} onOpenChange={setIsOpen} title="Confirm Action">
  <ModalBody>
    <p>Are you sure you want to continue?</p>
  </ModalBody>
  <ModalFooter>
    <Button variant="outline" onClick={() => setIsOpen(false)}>
      Cancel
    </Button>
    <Button onClick={handleConfirm}>
      Confirm
    </Button>
  </ModalFooter>
</Modal>
```

## Testing

### Unit Tests
- Comprehensive test coverage for all components
- Accessibility testing with @testing-library
- Keyboard navigation testing
- State management testing

### Test Files
- `__tests__/button.test.tsx` - Button component tests
- `__tests__/input.test.tsx` - Input component tests
- Additional test files for other components

## Showcase

The `ui-showcase.tsx` component provides a comprehensive demonstration of all UI components with various states and configurations. Use this for:
- Visual testing during development
- Documentation and examples
- Design system validation

## Requirements Fulfilled

✅ **Requirements 11.3**: Accessibility features with WCAG 2.1 AA compliance
- Full keyboard navigation support
- Screen reader compatibility
- Focus management and indicators
- ARIA attributes and semantic HTML

✅ **Requirements 12.1**: Performance optimization
- Framer Motion animations with performance optimization
- Code splitting and lazy loading support
- Efficient re-rendering with React best practices
- Responsive design for all screen sizes

## Architecture

### Component Structure
```
components/ui/
├── button.tsx          # Button component with variants
├── input.tsx           # Input component with states
├── modal.tsx           # Modal dialog system
├── dropdown.tsx        # Dropdown menu system
├── form.tsx            # Form components with validation
├── select.tsx          # Select dropdown component
├── toast.tsx           # Toast notification system
├── ui-showcase.tsx     # Component showcase
├── index.ts            # Main export file
├── __tests__/          # Unit tests
└── README.md           # This documentation
```

### Dependencies
- **@radix-ui/react-*** - Accessible UI primitives
- **framer-motion** - Animation library
- **react-hook-form** - Form state management
- **@hookform/resolvers** - Form validation
- **zod** - Schema validation
- **lucide-react** - Icon library
- **clsx** & **tailwind-merge** - Utility functions

This component library provides a solid foundation for building the AI Video Studio interface with consistent design, excellent accessibility, and smooth user interactions.