/**
 * Form Components Unit Tests
 * 
 * Comprehensive tests for the Form components including validation,
 * error handling, accessibility, and React Hook Form integration.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { z } from 'zod'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormInput,
  FormTextarea,
  FormSubmit,
  useFormWithValidation,
} from '../form'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    p: React.forwardRef<HTMLParagraphElement, any>(({ children, ...props }, ref) => (
      <p ref={ref} {...props}>
        {children}
      </p>
    )),
    button: React.forwardRef<HTMLButtonElement, any>(({ children, ...props }, ref) => (
      <button ref={ref} {...props}>
        {children}
      </button>
    )),
    div: React.forwardRef<HTMLDivElement, any>(({ children, ...props }, ref) => (
      <div ref={ref} {...props}>
        {children}
      </div>
    )),
    textarea: React.forwardRef<HTMLTextAreaElement, any>(({ children, ...props }, ref) => (
      <textarea ref={ref} {...props}>
        {children}
      </textarea>
    )),
  },
}))

// Mock the Input component
vi.mock('../input', () => ({
  Input: React.forwardRef<HTMLInputElement, any>(({ error, leftIcon, rightIcon, ...props }, ref) => (
    <input
      ref={ref}
      data-error={error}
      data-left-icon={!!leftIcon}
      data-right-icon={!!rightIcon}
      {...props}
    />
  )),
}))

describe('Form Components', () => {
  describe('useFormWithValidation Hook', () => {
    it('creates form with validation schema', () => {
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(8),
      })

      const TestComponent = () => {
        const form = useFormWithValidation(schema)
        return <div data-testid="form-created">Form created</div>
      }

      render(<TestComponent />)
      expect(screen.getByTestId('form-created')).toBeInTheDocument()
    })

    it('accepts default values', () => {
      const schema = z.object({
        name: z.string(),
      })

      const TestComponent = () => {
        const form = useFormWithValidation(schema, { name: 'John Doe' })
        return <div data-testid="default-value">{form.getValues().name}</div>
      }

      render(<TestComponent />)
      expect(screen.getByTestId('default-value')).toHaveTextContent('John Doe')
    })
  })

  describe('Form Component', () => {
    it('renders form with children', () => {
      const schema = z.object({ name: z.string() })
      
      const TestForm = () => {
        const form = useFormWithValidation(schema)
        const onSubmit = vi.fn()

        return (
          <Form form={form} onSubmit={onSubmit}>
            <div>Form content</div>
          </Form>
        )
      }

      render(<TestForm />)
      
      const formElement = screen.getByRole('form') || screen.getByText('Form content').closest('form')
      expect(formElement).toBeInTheDocument()
      expect(screen.getByText('Form content')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      const schema = z.object({ name: z.string() })
      
      const TestForm = () => {
        const form = useFormWithValidation(schema)
        const onSubmit = vi.fn()

        return (
          <Form form={form} onSubmit={onSubmit} className="custom-form-class">
            <div>Form content</div>
          </Form>
        )
      }

      render(<TestForm />)
      
      const formElement = screen.getByText('Form content').closest('form')
      expect(formElement).toHaveClass('custom-form-class', 'space-y-6')
    })

    it('handles form submission', async () => {
      const schema = z.object({ name: z.string().min(1) })
      const onSubmit = vi.fn()
      const user = userEvent.setup()
      
      const TestForm = () => {
        const form = useFormWithValidation(schema)

        return (
          <Form form={form} onSubmit={onSubmit}>
            <FormInput name="name" label="Name" />
            <FormSubmit>Submit</FormSubmit>
          </Form>
        )
      }

      render(<TestForm />)
      
      const nameInput = screen.getByLabelText('Name')
      const submitButton = screen.getByRole('button', { name: /submit/i })
      
      await user.type(nameInput, 'John Doe')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({ name: 'John Doe' })
      })
    })
  })

  describe('FormField Component', () => {
    it('provides field context to children', () => {
      const schema = z.object({ email: z.string() })
      
      const TestForm = () => {
        const form = useFormWithValidation(schema)
        const onSubmit = vi.fn()

        return (
          <Form form={form} onSubmit={onSubmit}>
            <FormField name="email">
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <input data-testid="email-input" />
                </FormControl>
              </FormItem>
            </FormField>
          </Form>
        )
      }

      render(<TestForm />)
      
      expect(screen.getByTestId('email-input')).toBeInTheDocument()
      expect(screen.getByText('Email')).toBeInTheDocument()
    })
  })

  describe('FormItem Component', () => {
    it('renders with default spacing', () => {
      render(
        <FormItem>
          <div data-testid="form-item-content">Content</div>
        </FormItem>
      )
      
      const item = screen.getByTestId('form-item-content').parentElement
      expect(item).toHaveClass('space-y-2')
    })

    it('applies custom className', () => {
      render(
        <FormItem className="custom-item-class">
          <div data-testid="form-item-content">Content</div>
        </FormItem>
      )
      
      const item = screen.getByTestId('form-item-content').parentElement
      expect(item).toHaveClass('custom-item-class', 'space-y-2')
    })
  })

  describe('FormLabel Component', () => {
    it('renders label text', () => {
      render(<FormLabel>Test Label</FormLabel>)
      
      const label = screen.getByText('Test Label')
      expect(label.tagName).toBe('LABEL')
    })

    it('shows required indicator when required is true', () => {
      render(<FormLabel required>Required Field</FormLabel>)
      
      expect(screen.getByText('Required Field')).toBeInTheDocument()
      expect(screen.getByText('*')).toBeInTheDocument()
      
      const asterisk = screen.getByText('*')
      expect(asterisk).toHaveClass('ml-1', 'text-destructive')
    })

    it('applies default styling classes', () => {
      render(<FormLabel>Styled Label</FormLabel>)
      
      const label = screen.getByText('Styled Label')
      expect(label).toHaveClass(
        'text-sm',
        'font-medium',
        'leading-none',
        'peer-disabled:cursor-not-allowed',
        'peer-disabled:opacity-70'
      )
    })
  })

  describe('FormDescription Component', () => {
    it('renders description text', () => {
      render(<FormDescription>This is a description</FormDescription>)
      
      const description = screen.getByText('This is a description')
      expect(description.tagName).toBe('P')
      expect(description).toHaveClass('text-sm', 'text-muted-foreground')
    })

    it('applies custom className', () => {
      render(
        <FormDescription className="custom-description">
          Custom description
        </FormDescription>
      )
      
      const description = screen.getByText('Custom description')
      expect(description).toHaveClass('custom-description')
    })
  })

  describe('FormMessage Component', () => {
    it('displays error message when field has error', () => {
      const schema = z.object({ 
        email: z.string().email('Invalid email address') 
      })
      
      const TestForm = () => {
        const form = useFormWithValidation(schema)
        const onSubmit = vi.fn()

        // Trigger validation error
        React.useEffect(() => {
          form.setError('email', { 
            type: 'manual', 
            message: 'Invalid email address' 
          })
        }, [form])

        return (
          <Form form={form} onSubmit={onSubmit}>
            <FormField name="email">
              <FormItem>
                <FormMessage />
              </FormItem>
            </FormField>
          </Form>
        )
      }

      render(<TestForm />)
      
      expect(screen.getByText('Invalid email address')).toBeInTheDocument()
    })

    it('does not render when no error', () => {
      const schema = z.object({ email: z.string() })
      
      const TestForm = () => {
        const form = useFormWithValidation(schema)
        const onSubmit = vi.fn()

        return (
          <Form form={form} onSubmit={onSubmit}>
            <FormField name="email">
              <FormItem>
                <FormMessage />
              </FormItem>
            </FormField>
          </Form>
        )
      }

      render(<TestForm />)
      
      // Should not render any error message
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument()
    })

    it('applies error styling classes', () => {
      const schema = z.object({ name: z.string() })
      
      const TestForm = () => {
        const form = useFormWithValidation(schema)
        const onSubmit = vi.fn()

        React.useEffect(() => {
          form.setError('name', { 
            type: 'manual', 
            message: 'Name is required' 
          })
        }, [form])

        return (
          <Form form={form} onSubmit={onSubmit}>
            <FormField name="name">
              <FormItem>
                <FormMessage />
              </FormItem>
            </FormField>
          </Form>
        )
      }

      render(<TestForm />)
      
      const errorMessage = screen.getByText('Name is required')
      expect(errorMessage).toHaveClass('text-sm', 'font-medium', 'text-destructive')
    })
  })

  describe('FormInput Component', () => {
    it('renders input with label', () => {
      const schema = z.object({ username: z.string() })
      
      const TestForm = () => {
        const form = useFormWithValidation(schema)
        const onSubmit = vi.fn()

        return (
          <Form form={form} onSubmit={onSubmit}>
            <FormInput name="username" label="Username" />
          </Form>
        )
      }

      render(<TestForm />)
      
      expect(screen.getByLabelText('Username')).toBeInTheDocument()
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('shows required indicator when required is true', () => {
      const schema = z.object({ email: z.string() })
      
      const TestForm = () => {
        const form = useFormWithValidation(schema)
        const onSubmit = vi.fn()

        return (
          <Form form={form} onSubmit={onSubmit}>
            <FormInput name="email" label="Email" required />
          </Form>
        )
      }

      render(<TestForm />)
      
      expect(screen.getByText('*')).toBeInTheDocument()
    })

    it('displays description when provided', () => {
      const schema = z.object({ password: z.string() })
      
      const TestForm = () => {
        const form = useFormWithValidation(schema)
        const onSubmit = vi.fn()

        return (
          <Form form={form} onSubmit={onSubmit}>
            <FormInput 
              name="password" 
              label="Password" 
              description="Must be at least 8 characters"
            />
          </Form>
        )
      }

      render(<TestForm />)
      
      expect(screen.getByText('Must be at least 8 characters')).toBeInTheDocument()
    })

    it('handles input value changes', async () => {
      const schema = z.object({ message: z.string() })
      const user = userEvent.setup()
      
      const TestForm = () => {
        const form = useFormWithValidation(schema)
        const onSubmit = vi.fn()

        return (
          <Form form={form} onSubmit={onSubmit}>
            <FormInput name="message" label="Message" />
          </Form>
        )
      }

      render(<TestForm />)
      
      const input = screen.getByLabelText('Message')
      await user.type(input, 'Hello World')
      
      expect(input).toHaveValue('Hello World')
    })

    it('supports left and right icons', () => {
      const schema = z.object({ search: z.string() })
      
      const TestForm = () => {
        const form = useFormWithValidation(schema)
        const onSubmit = vi.fn()

        return (
          <Form form={form} onSubmit={onSubmit}>
            <FormInput 
              name="search" 
              label="Search" 
              leftIcon={<span data-testid="left-icon">🔍</span>}
              rightIcon={<span data-testid="right-icon">✨</span>}
            />
          </Form>
        )
      }

      render(<TestForm />)
      
      const input = screen.getByLabelText('Search')
      expect(input).toHaveAttribute('data-left-icon', 'true')
      expect(input).toHaveAttribute('data-right-icon', 'true')
    })
  })

  describe('FormTextarea Component', () => {
    it('renders textarea with label', () => {
      const schema = z.object({ comment: z.string() })
      
      const TestForm = () => {
        const form = useFormWithValidation(schema)
        const onSubmit = vi.fn()

        return (
          <Form form={form} onSubmit={onSubmit}>
            <FormTextarea name="comment" label="Comment" />
          </Form>
        )
      }

      render(<TestForm />)
      
      expect(screen.getByLabelText('Comment')).toBeInTheDocument()
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('applies textarea styling classes', () => {
      const schema = z.object({ description: z.string() })
      
      const TestForm = () => {
        const form = useFormWithValidation(schema)
        const onSubmit = vi.fn()

        return (
          <Form form={form} onSubmit={onSubmit}>
            <FormTextarea name="description" label="Description" />
          </Form>
        )
      }

      render(<TestForm />)
      
      const textarea = screen.getByLabelText('Description')
      expect(textarea).toHaveClass(
        'flex',
        'min-h-[80px]',
        'w-full',
        'rounded-md',
        'border',
        'border-input',
        'bg-background',
        'px-3',
        'py-2',
        'text-sm'
      )
    })

    it('handles textarea value changes', async () => {
      const schema = z.object({ notes: z.string() })
      const user = userEvent.setup()
      
      const TestForm = () => {
        const form = useFormWithValidation(schema)
        const onSubmit = vi.fn()

        return (
          <Form form={form} onSubmit={onSubmit}>
            <FormTextarea name="notes" label="Notes" />
          </Form>
        )
      }

      render(<TestForm />)
      
      const textarea = screen.getByLabelText('Notes')
      await user.type(textarea, 'This is a long note...')
      
      expect(textarea).toHaveValue('This is a long note...')
    })
  })

  describe('FormSubmit Component', () => {
    it('renders submit button', () => {
      const schema = z.object({ name: z.string() })
      
      const TestForm = () => {
        const form = useFormWithValidation(schema)
        const onSubmit = vi.fn()

        return (
          <Form form={form} onSubmit={onSubmit}>
            <FormSubmit>Submit Form</FormSubmit>
          </Form>
        )
      }

      render(<TestForm />)
      
      const submitButton = screen.getByRole('button', { name: /submit form/i })
      expect(submitButton).toHaveAttribute('type', 'submit')
    })

    it('shows loading state when loading is true', () => {
      const schema = z.object({ name: z.string() })
      
      const TestForm = () => {
        const form = useFormWithValidation(schema)
        const onSubmit = vi.fn()

        return (
          <Form form={form} onSubmit={onSubmit}>
            <FormSubmit loading>Submitting...</FormSubmit>
          </Form>
        )
      }

      render(<TestForm />)
      
      const submitButton = screen.getByRole('button')
      expect(submitButton).toBeDisabled()
      
      // Check for loading spinner
      const spinner = submitButton.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('is disabled when form is submitting', () => {
      const schema = z.object({ name: z.string() })
      
      const TestForm = () => {
        const form = useFormWithValidation(schema)
        const onSubmit = vi.fn()

        // Simulate submitting state
        React.useEffect(() => {
          form.formState.isSubmitting = true
        }, [form])

        return (
          <Form form={form} onSubmit={onSubmit}>
            <FormSubmit>Submit</FormSubmit>
          </Form>
        )
      }

      render(<TestForm />)
      
      const submitButton = screen.getByRole('button')
      expect(submitButton).toBeDisabled()
    })

    it('applies variant styling', () => {
      const schema = z.object({ name: z.string() })
      
      const TestForm = () => {
        const form = useFormWithValidation(schema)
        const onSubmit = vi.fn()

        return (
          <Form form={form} onSubmit={onSubmit}>
            <FormSubmit variant="destructive">Delete</FormSubmit>
          </Form>
        )
      }

      render(<TestForm />)
      
      const submitButton = screen.getByRole('button')
      expect(submitButton).toHaveClass('bg-destructive', 'text-destructive-foreground')
    })
  })

  describe('Form Validation Integration', () => {
    it('validates form on submission', async () => {
      const schema = z.object({
        email: z.string().email('Invalid email'),
        password: z.string().min(8, 'Password must be at least 8 characters'),
      })
      
      const onSubmit = vi.fn()
      const user = userEvent.setup()
      
      const TestForm = () => {
        const form = useFormWithValidation(schema)

        return (
          <Form form={form} onSubmit={onSubmit}>
            <FormInput name="email" label="Email" />
            <FormInput name="password" label="Password" type="password" />
            <FormSubmit>Submit</FormSubmit>
          </Form>
        )
      }

      render(<TestForm />)
      
      const submitButton = screen.getByRole('button', { name: /submit/i })
      
      // Submit without filling fields
      await user.click(submitButton)
      
      // Should not call onSubmit due to validation errors
      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('displays validation errors', async () => {
      const schema = z.object({
        email: z.string().email('Invalid email address'),
      })
      
      const onSubmit = vi.fn()
      const user = userEvent.setup()
      
      const TestForm = () => {
        const form = useFormWithValidation(schema)

        return (
          <Form form={form} onSubmit={onSubmit}>
            <FormInput name="email" label="Email" />
            <FormSubmit>Submit</FormSubmit>
          </Form>
        )
      }

      render(<TestForm />)
      
      const emailInput = screen.getByLabelText('Email')
      const submitButton = screen.getByRole('button', { name: /submit/i })
      
      // Enter invalid email
      await user.type(emailInput, 'invalid-email')
      await user.click(submitButton)
      
      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText('Invalid email address')).toBeInTheDocument()
      })
    })

    it('submits valid form data', async () => {
      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
      })
      
      const onSubmit = vi.fn()
      const user = userEvent.setup()
      
      const TestForm = () => {
        const form = useFormWithValidation(schema)

        return (
          <Form form={form} onSubmit={onSubmit}>
            <FormInput name="name" label="Name" />
            <FormInput name="email" label="Email" />
            <FormSubmit>Submit</FormSubmit>
          </Form>
        )
      }

      render(<TestForm />)
      
      const nameInput = screen.getByLabelText('Name')
      const emailInput = screen.getByLabelText('Email')
      const submitButton = screen.getByRole('button', { name: /submit/i })
      
      // Fill valid data
      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'john@example.com')
      await user.click(submitButton)
      
      // Should submit with valid data
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          name: 'John Doe',
          email: 'john@example.com',
        })
      })
    })
  })
})