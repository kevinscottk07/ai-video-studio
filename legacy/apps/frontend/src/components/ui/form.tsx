/**
 * Form Components
 * 
 * A comprehensive form system built with React Hook Form and Zod validation.
 * Includes form fields, validation, error handling, and accessibility features.
 */

import React from 'react'
import { motion } from 'framer-motion'
import { 
  useForm, 
  FormProvider, 
  useFormContext, 
  Controller,
  type FieldPath,
  type FieldValues,
  type UseFormReturn,
  type ControllerProps,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { type ZodSchema } from 'zod'
import { cn, focusRing } from '../../lib/component-variants'
import { Input } from './input'

// Form Context
export interface FormProps<T extends FieldValues = FieldValues> {
  children: React.ReactNode
  form: UseFormReturn<T>
  onSubmit: (data: T) => void | Promise<void>
  className?: string
}

const Form = <T extends FieldValues = FieldValues>({
  children,
  form,
  onSubmit,
  className,
}: FormProps<T>) => {
  return (
    <FormProvider {...form}>
      <form 
        onSubmit={form.handleSubmit(onSubmit)} 
        className={cn('space-y-6', className)}
      >
        {children}
      </form>
    </FormProvider>
  )
}

// Form Field Context
interface FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
  name: TName
}

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue
)

// Form Field Component
export interface FormFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
  name: TName
  children: React.ReactNode
}

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  name,
  children,
}: FormFieldProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name }}>
      {children}
    </FormFieldContext.Provider>
  )
}

// Form Item Component
export interface FormItemProps {
  children: React.ReactNode
  className?: string
}

const FormItem: React.FC<FormItemProps> = ({ children, className }) => {
  return (
    <div className={cn('space-y-2', className)}>
      {children}
    </div>
  )
}

// Form Label Component
export interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode
  required?: boolean
}

const FormLabel: React.FC<FormLabelProps> = ({ 
  children, 
  required = false,
  className,
  ...props 
}) => {
  return (
    <label
      className={cn(
        'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className
      )}
      {...props}
    >
      {children}
      {required && <span className="ml-1 text-destructive">*</span>}
    </label>
  )
}

// Form Control Component
export interface FormControlProps {
  children: React.ReactNode
}

const FormControl: React.FC<FormControlProps> = ({ children }) => {
  const { name } = React.useContext(FormFieldContext)
  const { formState } = useFormContext()
  const error = formState.errors[name]

  return (
    <div className="relative">
      {React.cloneElement(children as React.ReactElement, {
        'aria-invalid': !!error,
        'aria-describedby': error ? `${name}-error` : undefined,
      })}
    </div>
  )
}

// Form Description Component
export interface FormDescriptionProps {
  children: React.ReactNode
  className?: string
}

const FormDescription: React.FC<FormDescriptionProps> = ({ 
  children, 
  className 
}) => {
  return (
    <p className={cn('text-sm text-muted-foreground', className)}>
      {children}
    </p>
  )
}

// Form Message Component (for errors)
export interface FormMessageProps {
  className?: string
}

const FormMessage: React.FC<FormMessageProps> = ({ className }) => {
  const { name } = React.useContext(FormFieldContext)
  const { formState } = useFormContext()
  const error = formState.errors[name]

  if (!error) return null

  return (
    <motion.p
      id={`${name}-error`}
      className={cn('text-sm font-medium text-destructive', className)}
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={{ duration: 0.2 }}
    >
      {error.message as string}
    </motion.p>
  )
}

// Form Input Component (combines Input with form integration)
export interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  name: string
  label?: string
  description?: string
  required?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const FormInput: React.FC<FormInputProps> = ({
  name,
  label,
  description,
  required = false,
  leftIcon,
  rightIcon,
  className,
  ...props
}) => {
  const { control, formState } = useFormContext()
  const error = formState.errors[name]

  return (
    <FormField name={name}>
      <FormItem>
        {label && (
          <FormLabel required={required}>
            {label}
          </FormLabel>
        )}
        
        <FormControl>
          <Controller
            name={name}
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                {...props}
                error={!!error}
                leftIcon={leftIcon}
                rightIcon={rightIcon}
                className={className}
              />
            )}
          />
        </FormControl>
        
        {description && (
          <FormDescription>
            {description}
          </FormDescription>
        )}
        
        <FormMessage />
      </FormItem>
    </FormField>
  )
}

// Form Textarea Component
export interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  name: string
  label?: string
  description?: string
  required?: boolean
}

const FormTextarea: React.FC<FormTextareaProps> = ({
  name,
  label,
  description,
  required = false,
  className,
  ...props
}) => {
  const { control, formState } = useFormContext()
  const error = formState.errors[name]

  return (
    <FormField name={name}>
      <FormItem>
        {label && (
          <FormLabel required={required}>
            {label}
          </FormLabel>
        )}
        
        <FormControl>
          <Controller
            name={name}
            control={control}
            render={({ field }) => (
              <motion.textarea
                {...field}
                {...props}
                className={cn(
                  'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
                  'placeholder:text-muted-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  error && 'border-destructive focus-visible:ring-destructive',
                  className
                )}
                whileFocus={{ scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              />
            )}
          />
        </FormControl>
        
        {description && (
          <FormDescription>
            {description}
          </FormDescription>
        )}
        
        <FormMessage />
      </FormItem>
    </FormField>
  )
}

// Form Submit Button
export interface FormSubmitProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  loading?: boolean
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
}

const FormSubmit: React.FC<FormSubmitProps> = ({
  children,
  loading = false,
  variant = 'default',
  className,
  disabled,
  ...props
}) => {
  const { formState } = useFormContext()
  const isSubmitting = formState.isSubmitting || loading

  return (
    <motion.button
      type="submit"
      disabled={disabled || isSubmitting}
      className={cn(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        'h-10 px-4 py-2',
        variant === 'default' && 'bg-primary text-primary-foreground hover:bg-primary/90',
        variant === 'destructive' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        variant === 'outline' && 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        variant === 'secondary' && 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        variant === 'ghost' && 'hover:bg-accent hover:text-accent-foreground',
        variant === 'link' && 'text-primary underline-offset-4 hover:underline',
        className
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      {...props}
    >
      {isSubmitting && (
        <motion.div
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        />
      )}
      {children}
    </motion.button>
  )
}

// Hook for creating forms with validation
export function useFormWithValidation<T extends FieldValues>(
  schema: ZodSchema<T>,
  defaultValues?: Partial<T>
) {
  return useForm<T>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onChange',
  })
}

export {
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
}