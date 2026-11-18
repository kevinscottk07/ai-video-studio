/**
 * Input Component Tests
 * 
 * Unit tests for the Input component to verify functionality,
 * accessibility, and different states.
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Search, User } from 'lucide-react'
import { Input } from '../input'

describe('Input Component', () => {
  it('renders with default props', () => {
    render(<Input placeholder="Enter text" />)
    const input = screen.getByPlaceholderText('Enter text')
    expect(input).toBeInTheDocument()
  })

  it('renders different variants correctly', () => {
    const { rerender } = render(<Input variant="default" />)
    expect(screen.getByRole('textbox')).toHaveClass('form-input')

    rerender(<Input variant="ghost" />)
    expect(screen.getByRole('textbox')).toHaveClass('border-none', 'bg-transparent')
  })

  it('renders different sizes correctly', () => {
    const { rerender } = render(<Input size="sm" />)
    expect(screen.getByRole('textbox')).toHaveClass('h-8')

    rerender(<Input size="lg" />)
    expect(screen.getByRole('textbox')).toHaveClass('h-12')
  })

  it('handles input changes', () => {
    const handleChange = vi.fn()
    render(<Input onChange={handleChange} />)
    
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'test input' } })
    
    expect(handleChange).toHaveBeenCalled()
    expect(input).toHaveValue('test input')
  })

  it('shows error state correctly', () => {
    render(<Input error errorText="This field is required" />)
    
    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('border-destructive')
    expect(screen.getByText('This field is required')).toBeInTheDocument()
  })

  it('shows success state correctly', () => {
    render(<Input success helperText="Looks good!" />)
    
    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('border-success')
    expect(screen.getByText('Looks good!')).toBeInTheDocument()
  })

  it('renders with label', () => {
    render(<Input label="Username" />)
    expect(screen.getByText('Username')).toBeInTheDocument()
  })

  it('renders with left icon', () => {
    render(<Input leftIcon={<Search data-testid="search-icon" />} />)
    expect(screen.getByTestId('search-icon')).toBeInTheDocument()
  })

  it('renders with right icon', () => {
    render(<Input rightIcon={<User data-testid="user-icon" />} />)
    expect(screen.getByTestId('user-icon')).toBeInTheDocument()
  })

  it('is disabled when disabled prop is true', () => {
    render(<Input disabled />)
    const input = screen.getByRole('textbox')
    expect(input).toBeDisabled()
  })

  it('applies custom className', () => {
    render(<Input className="custom-input" />)
    expect(screen.getByRole('textbox')).toHaveClass('custom-input')
  })

  it('has proper focus styles', () => {
    render(<Input />)
    const input = screen.getByRole('textbox')
    
    expect(input).toHaveClass('focus-visible:outline-none')
    expect(input).toHaveClass('focus-visible:ring-2')
  })

  it('supports different input types', () => {
    const { rerender } = render(<Input type="email" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email')

    rerender(<Input type="password" />)
    expect(screen.getByDisplayValue('')).toHaveAttribute('type', 'password')
  })

  it('shows helper text when provided', () => {
    render(<Input helperText="This is helper text" />)
    expect(screen.getByText('This is helper text')).toBeInTheDocument()
  })
})