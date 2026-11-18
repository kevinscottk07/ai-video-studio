import { useState, useEffect } from 'react'

/**
 * Custom hook for media query detection
 * Useful for responsive design and system preference detection
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return
    }

    const mediaQuery = window.matchMedia(query)
    
    // Set initial value
    setMatches(mediaQuery.matches)

    // Create event listener
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // Add listener
    mediaQuery.addEventListener('change', handleChange)

    // Cleanup
    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [query])

  return matches
}

/**
 * Hook for detecting dark mode preference
 */
export function usePrefersDarkMode(): boolean {
  return useMediaQuery('(prefers-color-scheme: dark)')
}

/**
 * Hook for detecting reduced motion preference
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}

/**
 * Hook for detecting high contrast preference
 */
export function usePrefersHighContrast(): boolean {
  return useMediaQuery('(prefers-contrast: high)')
}

/**
 * Hook for responsive breakpoint detection
 */
export function useBreakpoint() {
  const isSm = useMediaQuery('(min-width: 640px)')
  const isMd = useMediaQuery('(min-width: 768px)')
  const isLg = useMediaQuery('(min-width: 1024px)')
  const isXl = useMediaQuery('(min-width: 1280px)')
  const is2Xl = useMediaQuery('(min-width: 1536px)')

  return {
    isSm,
    isMd,
    isLg,
    isXl,
    is2Xl,
    isBase: !isSm,
    current: is2Xl ? '2xl' : isXl ? 'xl' : isLg ? 'lg' : isMd ? 'md' : isSm ? 'sm' : 'base',
  }
}

/**
 * Hook for detecting mobile devices
 */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)')
}

/**
 * Hook for detecting tablet devices
 */
export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 768px) and (max-width: 1023px)')
}

/**
 * Hook for detecting desktop devices
 */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)')
}

/**
 * Hook for detecting touch devices
 */
export function useIsTouchDevice(): boolean {
  return useMediaQuery('(pointer: coarse)')
}

/**
 * Hook for detecting hover capability
 */
export function useCanHover(): boolean {
  return useMediaQuery('(hover: hover)')
}

/**
 * Hook for comprehensive device detection
 */
export function useDeviceType() {
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()
  const isDesktop = useIsDesktop()
  const isTouchDevice = useIsTouchDevice()
  const canHover = useCanHover()

  return {
    isMobile,
    isTablet,
    isDesktop,
    isTouchDevice,
    canHover,
    deviceType: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
  }
}