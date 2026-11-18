import React from 'react'
import { ThemeToggle, ThemeSelector } from '../theme/theme-provider'
import { cn, buttonVariants, badgeVariants, cardVariants, textVariants } from '../../lib/component-variants'

/**
 * Design System Showcase Component
 * 
 * This component demonstrates all the design system elements and can be used
 * for testing and documentation purposes.
 */
export function DesignSystemShowcase() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between py-4">
          <div>
            <h1 className="text-display-md font-bold gradient-text">
              AI Video Studio
            </h1>
            <p className="text-muted-foreground">Design System Showcase</p>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <ThemeSelector />
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-12">
        {/* Colors Section */}
        <section className="space-y-6">
          <div>
            <h2 className="text-display-sm font-semibold mb-2">Color Palette</h2>
            <p className="text-muted-foreground">
              Our carefully crafted color system for AI Video Studio
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Primary Colors */}
            <div className="card p-6">
              <h3 className="font-semibold mb-4">Primary</h3>
              <div className="space-y-2">
                {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((shade) => (
                  <div key={shade} className="flex items-center gap-3">
                    <div 
                      className={`w-8 h-8 rounded-md border`}
                      style={{ backgroundColor: `hsl(var(--primary-${shade}))` }}
                    />
                    <span className="text-sm font-mono">primary-{shade}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Semantic Colors */}
            <div className="card p-6">
              <h3 className="font-semibold mb-4">Semantic</h3>
              <div className="space-y-2">
                {[
                  { name: 'success', color: 'hsl(var(--success))' },
                  { name: 'warning', color: 'hsl(var(--warning))' },
                  { name: 'destructive', color: 'hsl(var(--destructive))' },
                  { name: 'info', color: 'hsl(var(--info))' },
                ].map((item) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-md border"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-mono">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI/Video Colors */}
            <div className="card p-6">
              <h3 className="font-semibold mb-4">AI/Video</h3>
              <div className="space-y-2">
                {[
                  { name: 'ai', color: 'hsl(var(--ai))' },
                  { name: 'video', color: 'hsl(var(--video))' },
                  { name: 'generation', color: 'hsl(var(--generation))' },
                ].map((item) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-md border"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-mono">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Typography Section */}
        <section className="space-y-6">
          <div>
            <h2 className="text-display-sm font-semibold mb-2">Typography</h2>
            <p className="text-muted-foreground">
              Consistent typography scale for all text elements
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Display Text */}
            <div className="card p-6">
              <h3 className="font-semibold mb-4">Display Text</h3>
              <div className="space-y-4">
                <div className="text-display-2xl">Display 2XL</div>
                <div className="text-display-xl">Display XL</div>
                <div className="text-display-lg">Display Large</div>
                <div className="text-display-md">Display Medium</div>
                <div className="text-display-sm">Display Small</div>
                <div className="text-display-xs">Display XS</div>
              </div>
            </div>

            {/* Body Text */}
            <div className="card p-6">
              <h3 className="font-semibold mb-4">Body Text</h3>
              <div className="space-y-4">
                <div className="text-6xl">Heading 6XL</div>
                <div className="text-4xl">Heading 4XL</div>
                <div className="text-2xl">Heading 2XL</div>
                <div className="text-xl">Heading XL</div>
                <div className="text-lg">Large Text</div>
                <div className="text-base">Base Text</div>
                <div className="text-sm">Small Text</div>
                <div className="text-xs">Extra Small</div>
              </div>
            </div>
          </div>

          {/* Font Weights */}
          <div className="card p-6">
            <h3 className="font-semibold mb-4">Font Weights</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="font-light">Light (300)</div>
              <div className="font-normal">Normal (400)</div>
              <div className="font-medium">Medium (500)</div>
              <div className="font-semibold">Semibold (600)</div>
              <div className="font-bold">Bold (700)</div>
              <div className="font-extrabold">Extrabold (800)</div>
              <div className="font-black">Black (900)</div>
            </div>
          </div>
        </section>

        {/* Buttons Section */}
        <section className="space-y-6">
          <div>
            <h2 className="text-display-sm font-semibold mb-2">Buttons</h2>
            <p className="text-muted-foreground">
              Interactive button components with various styles and states
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Button Variants */}
            <div className="card p-6">
              <h3 className="font-semibold mb-4">Variants</h3>
              <div className="flex flex-wrap gap-3">
                <button className="btn btn-primary">Primary</button>
                <button className="btn btn-secondary">Secondary</button>
                <button className="btn btn-outline">Outline</button>
                <button className="btn btn-ghost">Ghost</button>
                <button className="btn btn-destructive">Destructive</button>
                <button className="btn btn-success">Success</button>
                <button className="btn btn-warning">Warning</button>
                <button className="btn btn-info">Info</button>
              </div>
            </div>

            {/* AI/Video Buttons */}
            <div className="card p-6">
              <h3 className="font-semibold mb-4">AI/Video Themed</h3>
              <div className="flex flex-wrap gap-3">
                <button className="btn bg-ai text-ai-foreground hover:bg-ai/90 shadow-glow hover:shadow-glow-lg transition-all duration-300">
                  AI Generate
                </button>
                <button className="btn bg-video text-video-foreground hover:bg-video/90 shadow-glow hover:shadow-glow-lg transition-all duration-300">
                  Create Video
                </button>
                <button className="btn bg-generation text-generation-foreground hover:bg-generation/90 shadow-glow hover:shadow-glow-lg transition-all duration-300">
                  Generate
                </button>
                <button className="btn bg-gradient-to-r from-primary via-ai to-video text-white hover:shadow-glow-lg transition-all duration-300">
                  Gradient
                </button>
              </div>
            </div>

            {/* Button Sizes */}
            <div className="card p-6">
              <h3 className="font-semibold mb-4">Sizes</h3>
              <div className="flex flex-wrap items-center gap-3">
                <button className="btn btn-primary btn-sm">Small</button>
                <button className="btn btn-primary btn-md">Medium</button>
                <button className="btn btn-primary btn-lg">Large</button>
                <button className="btn btn-primary btn-xl">Extra Large</button>
              </div>
            </div>

            {/* Button States */}
            <div className="card p-6">
              <h3 className="font-semibold mb-4">States</h3>
              <div className="flex flex-wrap gap-3">
                <button className="btn btn-primary">Normal</button>
                <button className="btn btn-primary opacity-75">Hover</button>
                <button className="btn btn-primary scale-95">Active</button>
                <button className="btn btn-primary opacity-50 cursor-not-allowed" disabled>
                  Disabled
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Cards Section */}
        <section className="space-y-6">
          <div>
            <h2 className="text-display-sm font-semibold mb-2">Cards</h2>
            <p className="text-muted-foreground">
              Flexible card components for content organization
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Default Card */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Default Card</h3>
                <p className="card-description">
                  A simple card with header and content
                </p>
              </div>
              <div className="card-content">
                <p className="text-sm text-muted-foreground">
                  This is the card content area where you can place any content.
                </p>
              </div>
            </div>

            {/* Elevated Card */}
            <div className="card shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="card-header">
                <h3 className="card-title">Elevated Card</h3>
                <p className="card-description">
                  Card with enhanced shadow
                </p>
              </div>
              <div className="card-content">
                <p className="text-sm text-muted-foreground">
                  This card has a more prominent shadow for emphasis.
                </p>
              </div>
            </div>

            {/* Interactive Card */}
            <div className="card-hover">
              <div className="card-header">
                <h3 className="card-title">Interactive Card</h3>
                <p className="card-description">
                  Hover for interaction
                </p>
              </div>
              <div className="card-content">
                <p className="text-sm text-muted-foreground">
                  This card responds to hover with smooth animations.
                </p>
              </div>
            </div>

            {/* Glass Card */}
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-2">Glass Card</h3>
              <p className="text-sm text-muted-foreground">
                A card with glass morphism effect for modern aesthetics.
              </p>
            </div>

            {/* Gradient Card */}
            <div className="card bg-gradient-to-br from-card via-card to-muted/50 p-6">
              <h3 className="font-semibold mb-2">Gradient Card</h3>
              <p className="text-sm text-muted-foreground">
                A card with subtle gradient background.
              </p>
            </div>

            {/* AI Themed Card */}
            <div className="card border-ai/20 bg-ai/5 p-6">
              <h3 className="font-semibold mb-2 text-ai">AI Card</h3>
              <p className="text-sm text-muted-foreground">
                A card themed for AI-related content.
              </p>
            </div>
          </div>
        </section>

        {/* Badges Section */}
        <section className="space-y-6">
          <div>
            <h2 className="text-display-sm font-semibold mb-2">Badges</h2>
            <p className="text-muted-foreground">
              Status indicators and labels
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Badge Variants */}
            <div className="card p-6">
              <h3 className="font-semibold mb-4">Variants</h3>
              <div className="flex flex-wrap gap-2">
                <span className="badge-default">Default</span>
                <span className="badge-secondary">Secondary</span>
                <span className="badge-destructive">Destructive</span>
                <span className="badge-outline">Outline</span>
                <span className="badge-success">Success</span>
                <span className="badge-warning">Warning</span>
                <span className="badge-info">Info</span>
              </div>
            </div>

            {/* AI/Video Badges */}
            <div className="card p-6">
              <h3 className="font-semibold mb-4">AI/Video Themed</h3>
              <div className="flex flex-wrap gap-2">
                <span className="badge border-transparent bg-ai text-ai-foreground">AI</span>
                <span className="badge border-transparent bg-video text-video-foreground">Video</span>
                <span className="badge border-transparent bg-generation text-generation-foreground">Generation</span>
                <span className="badge bg-gradient-to-r from-primary to-ai text-white">Gradient</span>
              </div>
            </div>
          </div>
        </section>

        {/* Form Elements Section */}
        <section className="space-y-6">
          <div>
            <h2 className="text-display-sm font-semibold mb-2">Form Elements</h2>
            <p className="text-muted-foreground">
              Input fields and form components
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Variants */}
            <div className="card p-6">
              <h3 className="font-semibold mb-4">Input Fields</h3>
              <div className="space-y-4">
                <div>
                  <label className="form-label">Default Input</label>
                  <input 
                    type="text" 
                    className="form-input mt-1" 
                    placeholder="Enter text..."
                  />
                </div>
                <div>
                  <label className="form-label">Large Input</label>
                  <input 
                    type="text" 
                    className="form-input h-12 px-4 text-base mt-1" 
                    placeholder="Large input field..."
                  />
                </div>
                <div>
                  <label className="form-label">Textarea</label>
                  <textarea 
                    className="form-textarea mt-1" 
                    placeholder="Enter description..."
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Form States */}
            <div className="card p-6">
              <h3 className="font-semibold mb-4">Form States</h3>
              <div className="space-y-4">
                <div>
                  <label className="form-label">Success State</label>
                  <input 
                    type="text" 
                    className="form-input border-success focus:ring-success mt-1" 
                    placeholder="Valid input"
                    defaultValue="Valid input"
                  />
                  <p className="text-sm text-success mt-1">This field is valid</p>
                </div>
                <div>
                  <label className="form-label">Error State</label>
                  <input 
                    type="text" 
                    className="form-input border-destructive focus:ring-destructive mt-1" 
                    placeholder="Invalid input"
                  />
                  <p className="form-error mt-1">This field is required</p>
                </div>
                <div>
                  <label className="form-label">Disabled State</label>
                  <input 
                    type="text" 
                    className="form-input mt-1" 
                    placeholder="Disabled input"
                    disabled
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Animations Section */}
        <section className="space-y-6">
          <div>
            <h2 className="text-display-sm font-semibold mb-2">Animations</h2>
            <p className="text-muted-foreground">
              Smooth animations and micro-interactions
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Entrance Animations */}
            <div className="card p-6">
              <h3 className="font-semibold mb-4">Entrance</h3>
              <div className="space-y-3">
                <div className="p-3 bg-muted rounded animate-fade-in">Fade In</div>
                <div className="p-3 bg-muted rounded animate-slide-up">Slide Up</div>
                <div className="p-3 bg-muted rounded animate-scale-in">Scale In</div>
                <div className="p-3 bg-muted rounded animate-bounce-in">Bounce In</div>
              </div>
            </div>

            {/* Continuous Animations */}
            <div className="card p-6">
              <h3 className="font-semibold mb-4">Continuous</h3>
              <div className="space-y-3">
                <div className="p-3 bg-muted rounded animate-float">Float</div>
                <div className="p-3 bg-muted rounded animate-glow">Glow</div>
                <div className="p-3 bg-muted rounded animate-pulse-slow">Pulse</div>
                <div className="p-3 bg-gradient-to-r from-primary to-ai rounded animate-gradient-x">
                  Gradient
                </div>
              </div>
            </div>

            {/* Loading States */}
            <div className="card p-6">
              <h3 className="font-semibold mb-4">Loading</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span>Spinner</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-primary rounded-full animate-ping" />
                  <span>Ping</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-primary rounded-full animate-bounce" />
                  <span>Bounce</span>
                </div>
                <div className="skeleton h-4 w-24" />
              </div>
            </div>
          </div>
        </section>

        {/* Spacing Section */}
        <section className="space-y-6">
          <div>
            <h2 className="text-display-sm font-semibold mb-2">Spacing System</h2>
            <p className="text-muted-foreground">
              Consistent spacing scale for layouts
            </p>
          </div>

          <div className="card p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              {[1, 2, 3, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64].map((size) => (
                <div key={size} className="text-center">
                  <div 
                    className="bg-primary/20 border border-primary/40 mb-2"
                    style={{ height: `${size * 0.25}rem`, width: `${size * 0.25}rem` }}
                  />
                  <span className="text-xs font-mono">{size}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}