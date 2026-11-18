import React, { lazy, Suspense, ComponentType } from 'react';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { performanceMonitoring } from '../services/performanceMonitoring';

interface LazyLoadOptions {
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  preload?: boolean;
  chunkName?: string;
}

/**
 * Enhanced lazy loading with performance monitoring and error boundaries
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
): ComponentType<React.ComponentProps<T>> {
  const {
    fallback = <LoadingSpinner size="lg" />,
    errorFallback,
    preload = false,
    chunkName
  } = options;

  // Create lazy component with performance tracking
  const LazyComponent = lazy(async () => {
    const startTime = performance.now();
    
    try {
      const module = await importFn();
      
      // Track chunk load time
      const loadTime = performance.now() - startTime;
      performanceMonitoring.recordMetric?.('CHUNK_LOAD_TIME', loadTime, undefined, {
        chunkName: chunkName || 'unknown'
      });

      return module;
    } catch (error) {
      // Track chunk load errors
      performanceMonitoring.recordMetric?.('CHUNK_LOAD_ERROR', 1, 'poor', {
        chunkName: chunkName || 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  });

  // Preload the component if requested
  if (preload && typeof window !== 'undefined') {
    // Preload after a short delay to not block initial render
    setTimeout(() => {
      importFn().catch(() => {
        // Ignore preload errors
      });
    }, 100);
  }

  // Return wrapped component with Suspense and Error Boundary
  const WrappedComponent = (props: React.ComponentProps<T>) => (
    <ErrorBoundary fallback={errorFallback}>
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `LazyComponent(${chunkName || 'Unknown'})`;

  return WrappedComponent;
}

/**
 * Preload a lazy component
 */
export function preloadComponent(importFn: () => Promise<any>): Promise<any> {
  const startTime = performance.now();
  
  return importFn().then(
    (module) => {
      const loadTime = performance.now() - startTime;
      performanceMonitoring.recordMetric?.('PRELOAD_TIME', loadTime);
      return module;
    },
    (error) => {
      performanceMonitoring.recordMetric?.('PRELOAD_ERROR', 1, 'poor', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  );
}

/**
 * Route-based code splitting helper
 */
export function createLazyRoute<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  routeName: string
): ComponentType<React.ComponentProps<T>> {
  return createLazyComponent(importFn, {
    chunkName: `route-${routeName}`,
    fallback: (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    ),
    errorFallback: (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Failed to load page
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Please refresh the page to try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          >
            Refresh Page
          </button>
        </div>
      </div>
    )
  });
}

/**
 * Component-based code splitting helper
 */
export function createLazyModal<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  modalName: string
): ComponentType<React.ComponentProps<T>> {
  return createLazyComponent(importFn, {
    chunkName: `modal-${modalName}`,
    fallback: (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <LoadingSpinner size="md" />
        </div>
      </div>
    )
  });
}

/**
 * Intersection Observer based lazy loading for components
 */
export function createIntersectionLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyLoadOptions & { rootMargin?: string; threshold?: number } = {}
): ComponentType<React.ComponentProps<T> & { className?: string }> {
  const {
    rootMargin = '50px',
    threshold = 0.1,
    ...lazyOptions
  } = options;

  return function IntersectionLazyComponent(props: React.ComponentProps<T> & { className?: string }) {
    const [isVisible, setIsVisible] = React.useState(false);
    const ref = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        },
        { rootMargin, threshold }
      );

      if (ref.current) {
        observer.observe(ref.current);
      }

      return () => observer.disconnect();
    }, []);

    if (!isVisible) {
      return (
        <div 
          ref={ref} 
          className={props.className}
          style={{ minHeight: '200px' }}
        >
          {lazyOptions.fallback || <LoadingSpinner size="md" />}
        </div>
      );
    }

    const LazyComponent = createLazyComponent(importFn, lazyOptions);
    return <LazyComponent {...props} />;
  };
}