/**
 * Performance Monitoring Service
 * Tracks Core Web Vitals and provides real user monitoring (RUM)
 */

interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  url: string;
  userId?: string;
}

interface WebVitalsThresholds {
  CLS: { good: number; poor: number };
  FID: { good: number; poor: number };
  FCP: { good: number; poor: number };
  LCP: { good: number; poor: number };
  TTFB: { good: number; poor: number };
}

class PerformanceMonitoringService {
  private metrics: PerformanceMetric[] = [];
  private isEnabled: boolean = true;
  private apiEndpoint: string = '/api/analytics/performance';
  
  // Core Web Vitals thresholds (in milliseconds)
  private readonly thresholds: WebVitalsThresholds = {
    CLS: { good: 0.1, poor: 0.25 },
    FID: { good: 100, poor: 300 },
    FCP: { good: 1800, poor: 3000 },
    LCP: { good: 2500, poor: 4000 },
    TTFB: { good: 800, poor: 1800 }
  };

  constructor() {
    this.initializeWebVitals();
    this.initializeNavigationTiming();
    this.initializeResourceTiming();
  }

  /**
   * Initialize Core Web Vitals monitoring
   */
  private initializeWebVitals(): void {
    if (typeof window === 'undefined') return;

    // Dynamically import web-vitals to avoid SSR issues
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(this.onVitalMetric.bind(this));
      getFID(this.onVitalMetric.bind(this));
      getFCP(this.onVitalMetric.bind(this));
      getLCP(this.onVitalMetric.bind(this));
      getTTFB(this.onVitalMetric.bind(this));
    }).catch(() => {
      // Fallback if web-vitals is not available
      console.warn('Web Vitals library not available, using fallback metrics');
      this.initializeFallbackMetrics();
    });
  }

  /**
   * Fallback metrics when web-vitals library is not available
   */
  private initializeFallbackMetrics(): void {
    // Measure First Contentful Paint
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          this.recordMetric('FCP', entry.startTime);
        }
      }
    });
    
    try {
      observer.observe({ entryTypes: ['paint'] });
    } catch (e) {
      console.warn('Performance Observer not supported');
    }

    // Measure Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.recordMetric('LCP', lastEntry.startTime);
    });

    try {
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      console.warn('LCP observer not supported');
    }
  }

  /**
   * Handle web vitals metrics
   */
  private onVitalMetric(metric: any): void {
    this.recordMetric(metric.name, metric.value, metric.rating);
  }

  /**
   * Initialize Navigation Timing monitoring
   */
  private initializeNavigationTiming(): void {
    if (typeof window === 'undefined' || !window.performance) return;

    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (navigation) {
          // Time to First Byte
          const ttfb = navigation.responseStart - navigation.requestStart;
          this.recordMetric('TTFB', ttfb);

          // DOM Content Loaded
          const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.navigationStart;
          this.recordMetric('DOM_CONTENT_LOADED', domContentLoaded);

          // Page Load Time
          const pageLoadTime = navigation.loadEventEnd - navigation.navigationStart;
          this.recordMetric('PAGE_LOAD_TIME', pageLoadTime);
        }
      }, 0);
    });
  }

  /**
   * Initialize Resource Timing monitoring
   */
  private initializeResourceTiming(): void {
    if (typeof window === 'undefined' || !window.performance) return;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          const resource = entry as PerformanceResourceTiming;
          
          // Track slow resources (> 1 second)
          if (resource.duration > 1000) {
            this.recordMetric('SLOW_RESOURCE', resource.duration, 'poor', {
              url: resource.name,
              type: this.getResourceType(resource.name)
            });
          }
        }
      }
    });

    try {
      observer.observe({ entryTypes: ['resource'] });
    } catch (e) {
      console.warn('Resource timing observer not supported');
    }
  }

  /**
   * Record a performance metric
   */
  public recordMetric(
    name: string, 
    value: number, 
    rating?: 'good' | 'needs-improvement' | 'poor',
    metadata?: Record<string, any>
  ): void {
    if (!this.isEnabled) return;

    const metric: PerformanceMetric = {
      name,
      value,
      rating: rating || this.calculateRating(name, value),
      timestamp: Date.now(),
      url: window.location.href,
      userId: this.getCurrentUserId(),
      ...metadata
    };

    this.metrics.push(metric);
    this.sendMetricToServer(metric);

    // Log poor performance in development
    if (process.env.NODE_ENV === 'development' && metric.rating === 'poor') {
      console.warn(`Poor performance detected: ${name} = ${value}ms`, metric);
    }
  }

  /**
   * Calculate performance rating based on thresholds
   */
  private calculateRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const threshold = this.thresholds[name as keyof WebVitalsThresholds];
    if (!threshold) return 'good';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Get resource type from URL
   */
  private getResourceType(url: string): string {
    if (url.match(/\.(js|mjs)$/)) return 'script';
    if (url.match(/\.css$/)) return 'stylesheet';
    if (url.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)) return 'image';
    if (url.match(/\.(woff|woff2|ttf|otf)$/)) return 'font';
    return 'other';
  }

  /**
   * Get current user ID (implement based on your auth system)
   */
  private getCurrentUserId(): string | undefined {
    // This should be implemented based on your authentication system
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.id;
    } catch {
      return undefined;
    }
  }

  /**
   * Send metric to server for aggregation
   */
  private async sendMetricToServer(metric: PerformanceMetric): Promise<void> {
    try {
      // Batch metrics to reduce server load
      if (this.metrics.length >= 10) {
        await fetch(this.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            metrics: this.metrics.splice(0, 10)
          })
        });
      }
    } catch (error) {
      console.warn('Failed to send performance metrics:', error);
    }
  }

  /**
   * Measure custom timing
   */
  public measureTiming(name: string, startTime: number): void {
    const duration = performance.now() - startTime;
    this.recordMetric(`CUSTOM_${name.toUpperCase()}`, duration);
  }

  /**
   * Start a custom measurement
   */
  public startMeasurement(name: string): () => void {
    const startTime = performance.now();
    return () => this.measureTiming(name, startTime);
  }

  /**
   * Track user interactions
   */
  public trackInteraction(action: string, element?: string): void {
    const startTime = performance.now();
    
    // Measure interaction response time
    requestAnimationFrame(() => {
      const responseTime = performance.now() - startTime;
      this.recordMetric('INTERACTION_RESPONSE', responseTime, undefined, {
        action,
        element
      });
    });
  }

  /**
   * Get performance summary
   */
  public getPerformanceSummary(): {
    metrics: PerformanceMetric[];
    summary: Record<string, { avg: number; count: number; rating: string }>;
  } {
    const summary: Record<string, { avg: number; count: number; rating: string }> = {};
    
    this.metrics.forEach(metric => {
      if (!summary[metric.name]) {
        summary[metric.name] = { avg: 0, count: 0, rating: 'good' };
      }
      
      summary[metric.name].avg = 
        (summary[metric.name].avg * summary[metric.name].count + metric.value) / 
        (summary[metric.name].count + 1);
      summary[metric.name].count++;
      
      // Use worst rating
      if (metric.rating === 'poor' || 
          (metric.rating === 'needs-improvement' && summary[metric.name].rating === 'good')) {
        summary[metric.name].rating = metric.rating;
      }
    });

    return { metrics: this.metrics, summary };
  }

  /**
   * Enable/disable monitoring
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Clear stored metrics
   */
  public clearMetrics(): void {
    this.metrics = [];
  }
}

// Export singleton instance
export const performanceMonitoring = new PerformanceMonitoringService();

// Export types
export type { PerformanceMetric, WebVitalsThresholds };