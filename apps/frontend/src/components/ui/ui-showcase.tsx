/**
 * UI Components Showcase
 * 
 * A comprehensive showcase of all UI components in the design system.
 * This component demonstrates the usage, variants, and states of each component.
 */

import React from 'react'
import { motion } from 'framer-motion'
import { 
  Search, 
  User, 
  Settings, 
  ChevronDown, 
  Plus,
  Mail,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react'
import { z } from 'zod'

import {
  Button,
  Input,
  Modal,
  ModalTrigger,
  ModalBody,
  ModalFooter,
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
  DropdownCheckboxItem,
  DropdownRadioGroup,
  DropdownRadioItem,
  Form,
  FormInput,
  FormTextarea,
  FormSubmit,
  useFormWithValidation,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectGroup,
  ToastManager,
  useToast,
} from './index'

// Form validation schema
const showcaseFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  role: z.string().min(1, 'Please select a role'),
})

type ShowcaseFormData = z.infer<typeof showcaseFormSchema>

const UIShowcase: React.FC = () => {
  const [modalOpen, setModalOpen] = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)
  const [selectedRole, setSelectedRole] = React.useState('')
  const [checkedItems, setCheckedItems] = React.useState({
    notifications: false,
    marketing: false,
    updates: false,
  })
  const [radioValue, setRadioValue] = React.useState('option1')

  const { addToast } = useToast()
  
  const form = useFormWithValidation(showcaseFormSchema, {
    name: '',
    email: '',
    password: '',
    bio: '',
    role: '',
  })

  const onSubmit = async (data: ShowcaseFormData) => {
    console.log('Form submitted:', data)
    addToast({
      title: 'Form Submitted!',
      description: 'Your form has been successfully submitted.',
      variant: 'success',
    })
  }

  const showToast = (variant: 'success' | 'error' | 'warning' | 'info') => {
    const messages = {
      success: { title: 'Success!', description: 'Operation completed successfully.' },
      error: { title: 'Error!', description: 'Something went wrong. Please try again.' },
      warning: { title: 'Warning!', description: 'Please review your input.' },
      info: { title: 'Info', description: 'Here is some useful information.' },
    }
    
    addToast({
      ...messages[variant],
      variant,
    })
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-6xl space-y-12">
        {/* Header */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold gradient-text mb-4">
            AI Video Studio UI Components
          </h1>
          <p className="text-lg text-muted-foreground">
            A comprehensive showcase of our design system components
          </p>
        </motion.div>

        {/* Buttons Section */}
        <motion.section
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h2 className="text-2xl font-semibold">Buttons</h2>
          
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <Button variant="default">Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="ai">AI</Button>
              <Button variant="video">Video</Button>
              <Button variant="generation">Generation</Button>
              <Button variant="gradient">Gradient</Button>
            </div>
            
            <div className="flex flex-wrap gap-4">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button size="xl">Extra Large</Button>
            </div>
            
            <div className="flex flex-wrap gap-4">
              <Button loading>Loading</Button>
              <Button disabled>Disabled</Button>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                With Icon
              </Button>
            </div>
          </div>
        </motion.section>

        {/* Inputs Section */}
        <motion.section
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 className="text-2xl font-semibold">Inputs</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input placeholder="Default input" />
            <Input 
              placeholder="Search..." 
              leftIcon={<Search className="h-4 w-4" />}
            />
            <Input 
              type="password"
              placeholder="Password"
              leftIcon={<Lock className="h-4 w-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />
            <Input 
              placeholder="Error state" 
              error 
              errorText="This field is required"
            />
            <Input 
              placeholder="Success state" 
              success 
              helperText="Looks good!"
            />
            <Input 
              placeholder="Disabled input" 
              disabled 
            />
          </div>
        </motion.section>

        {/* Select Section */}
        <motion.section
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h2 className="text-2xl font-semibold">Select</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger placeholder="Select a role">
                <span>{selectedRole || 'Select a role'}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Roles</SelectLabel>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="guest" disabled>Guest (Disabled)</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </motion.section>

        {/* Dropdown Section */}
        <motion.section
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <h2 className="text-2xl font-semibold">Dropdown Menu</h2>
          
          <div className="flex gap-4">
            <Dropdown>
              <DropdownTrigger asChild>
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownTrigger>
              <DropdownContent>
                <DropdownLabel>My Account</DropdownLabel>
                <DropdownSeparator />
                <DropdownItem>
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </DropdownItem>
                <DropdownItem>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownItem>
                <DropdownSeparator />
                <DropdownCheckboxItem
                  checked={checkedItems.notifications}
                  onCheckedChange={(checked) => 
                    setCheckedItems(prev => ({ ...prev, notifications: checked }))
                  }
                >
                  Notifications
                </DropdownCheckboxItem>
                <DropdownCheckboxItem
                  checked={checkedItems.marketing}
                  onCheckedChange={(checked) => 
                    setCheckedItems(prev => ({ ...prev, marketing: checked }))
                  }
                >
                  Marketing emails
                </DropdownCheckboxItem>
                <DropdownSeparator />
                <DropdownRadioGroup value={radioValue} onValueChange={setRadioValue}>
                  <DropdownRadioItem value="option1">Option 1</DropdownRadioItem>
                  <DropdownRadioItem value="option2">Option 2</DropdownRadioItem>
                  <DropdownRadioItem value="option3">Option 3</DropdownRadioItem>
                </DropdownRadioGroup>
              </DropdownContent>
            </Dropdown>
          </div>
        </motion.section>

        {/* Modal Section */}
        <motion.section
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <h2 className="text-2xl font-semibold">Modal</h2>
          
          <div className="flex gap-4">
            <Modal 
              open={modalOpen} 
              onOpenChange={setModalOpen}
              title="Example Modal"
              description="This is a modal dialog example with smooth animations."
            >
              <ModalBody>
                <p className="text-muted-foreground">
                  This modal demonstrates the smooth animations and focus management
                  provided by our modal component. It includes proper accessibility
                  features and keyboard navigation.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button variant="outline" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setModalOpen(false)}>
                  Confirm
                </Button>
              </ModalFooter>
            </Modal>
            
            <Button onClick={() => setModalOpen(true)}>
              Open Modal
            </Button>
          </div>
        </motion.section>

        {/* Toast Section */}
        <motion.section
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <h2 className="text-2xl font-semibold">Toast Notifications</h2>
          
          <div className="flex flex-wrap gap-4">
            <Button onClick={() => showToast('success')} variant="outline">
              Success Toast
            </Button>
            <Button onClick={() => showToast('error')} variant="outline">
              Error Toast
            </Button>
            <Button onClick={() => showToast('warning')} variant="outline">
              Warning Toast
            </Button>
            <Button onClick={() => showToast('info')} variant="outline">
              Info Toast
            </Button>
          </div>
        </motion.section>

        {/* Form Section */}
        <motion.section
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <h2 className="text-2xl font-semibold">Form Components</h2>
          
          <div className="max-w-md">
            <Form form={form} onSubmit={onSubmit}>
              <FormInput
                name="name"
                label="Full Name"
                placeholder="Enter your full name"
                required
                leftIcon={<User className="h-4 w-4" />}
              />
              
              <FormInput
                name="email"
                type="email"
                label="Email Address"
                placeholder="Enter your email"
                required
                leftIcon={<Mail className="h-4 w-4" />}
              />
              
              <FormInput
                name="password"
                type="password"
                label="Password"
                placeholder="Enter your password"
                required
                leftIcon={<Lock className="h-4 w-4" />}
                description="Password must be at least 8 characters long"
              />
              
              <FormTextarea
                name="bio"
                label="Bio"
                placeholder="Tell us about yourself..."
                description="Optional field, maximum 500 characters"
              />
              
              <FormSubmit>
                Create Account
              </FormSubmit>
            </Form>
          </div>
        </motion.section>
      </div>
    </div>
  )
}

// Wrapper component with ToastManager
const UIShowcaseWithToasts: React.FC = () => {
  return (
    <ToastManager>
      <UIShowcase />
    </ToastManager>
  )
}

export { UIShowcaseWithToasts as UIShowcase }