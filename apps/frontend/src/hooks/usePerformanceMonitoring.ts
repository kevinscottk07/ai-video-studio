import { useEffect, useRef, useCallback } from 'react';
import { performanceMonitoring } from '../services/performanceMonitoring';

/**
 * Hook for monitoring component performance
 */
export function usePerformanceMonitoring(componentName: string) {
  const mountTimeRef = useRef<number>();
  const renderCountRef = useRef(0);

  useEffect(() => {
    // Track component mount time
    mountTimeRef.current = performance.now();
    
    return () => {
      // Track component unmount and total lifetime
      if (mountTimeRef.current) {
        const lifetime = performance.now() - mountTimeRef.current;
        performanceMonitoring.recordMetric(
          'COMPONENT_LIFETIME',
          lifetime,
          undefined,
          { component: componentName, renderCount: renderCountRef.current }
        );
      }
    };
  }, [componentName]);

  // Track render count
  useEffect(() => {
    renderCountRef.current++;
    
    if (renderCountRef.current > 10) {
      // Warn about excessive re-renders
      performanceMonitoring.recordMetric(
        'EXCESSIVE_RENDERS',
        renderCountRef.current,
        'poor',
        { component: componentName }
      );
    }
  });

  const measureOperation = useCallback((operationName: string) => {
    return performanceMonitoring.startMeasurement(`${componentName}_${operationName}`);
  }, [componentName]);

  const trackInteraction = useCallback((action: string, element?: string) => {
    performanceMonitoring.trackInteraction(action, element || componentName);
  }, [componentName]);

  return {
    measureOperation,
    trackInteraction,
    renderCount: renderCountRef.current
  };
}

/**
 * Hook for measuring async operations
 */
export function useAsyncPerformance() {
  const measureAsync = useCallback(async <T>(
    operationName: string,
    asyncOperation: () => Promise<T>
  ): Promise<T> => {
    const startTime = performance.now();
    
    try {
      const result = await asyncOperation();
      const duration = performance.now() - startTime;
      
      performanceMonitoring.recordMetric(
        `ASYNC_${operationName.toUpperCase()}`,
        duration,
        undefined,
        { success: true }
      );
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      performanceMonitoring.recordMetric(
        `ASYNC_${operationName.toUpperCase()}`,
        duration,
        'poor',
        { 
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      );
      
      throw error;
    }
  }, []);

  return { measureAsync };
}

/**
 * Hook for monitoring route changes
 */
export function useRoutePerformance(routeName: string) {
  const routeStartTime = useRef<number>();

  useEffect(() => {
    // Track route navigation start
    routeStartTime.current = performance.now();

    // Track route load time after component mounts
    const timeoutId = setTimeout(() => {
      if (routeStartTime.current) {
        const loadTime = performance.now() - routeStartTime.current;
        performanceMonitoring.recordMetric(
          'ROUTE_LOAD_TIME',
          loadTime,
          undefined,
          { route: routeName }
        );
      }
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [routeName]);
}

/**
 * Hook for monitoring API calls
 */
export function useApiPerformance() {
  const measureApiCall = useCallback(async <T>(
    endpoint: string,
    apiCall: () => Promise<T>
  ): Promise<T> => {
    const startTime = performance.now();
    
    try {
      const result = await apiCall();
      const duration = performance.now() - startTime;
      
      performanceMonitoring.recordMetric(
        'API_RESPONSE_TIME',
        duration,
        duration > 2000 ? 'poor' : duration > 1000 ? 'needs-improvement' : 'good',
        { endpoint, success: true }
      );
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      performanceMonitoring.recordMetric(
        'API_ERROR',
        duration,
        'poor',
        { 
          endpoint,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      );
      
      throw error;
    }
  }, []);

  return { measureApiCall };
}

/**
 * Hook for monitoring user interactions
 */
export function useInteractionTracking() {
  const trackClick = useCallback((element: string, metadata?: Record<string, any>) => {
    performanceMonitoring.trackInteraction('click', element);
    
    if (metadata) {
      performanceMonitoring.recordMetric(
        'USER_INTERACTION',
        1,
        'good',
        { action: 'click', element, ...metadata }
      );
    }
  }, []);

  const trackFormSubmit = useCallback((formName: string, success: boolean) => {
    performanceMonitoring.recordMetric(
      'FORM_SUBMIT',
      1,
      success ? 'good' : 'poor',
      { form: formName, success }
    );
  }, []);

  const trackSearch = useCallback((query: string, resultCount: number, duration: number) => {
    performanceMonitoring.recordMetric(
      'SEARCH_PERFORMANCE',
      duration,
      duration > 1000 ? 'poor' : 'good',
      { query: query.length, resultCount }
    );
  }, []);

  return {
    trackClick,
    trackFormSubmit,
    trackSearch
  };
}