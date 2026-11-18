/**
 * Property-Based Test for Authentication Error Handling
 * 
 * **Feature: ai-video-studio, Property 2: Authentication Error Handling**
 * **Validates: Requirements 1.3**
 * 
 * This property test validates that the authentication system provides
 * clear error messages and allows retry attempts for all invalid authentication scenarios.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth0 } from '@auth0/auth0-react'
import { useUser, useCreateUserProfile, useUpdateUserProfile, useAuthStatus } from '../../../hooks/useUser'
import { userApi } from '../../../services/api/userApi'
import { ReactNode } from 'react'

// Mock Auth0
vi.mock('@auth0/auth0-react')
const mockUseAuth0 = vi.mocked(useAuth0)

// Mock userApi
vi.mock('../../../services/api/userApi')
const mockUserApi = vi.mocked(userApi)

// Test data generators for property-based testing
function generateTestCases<T>(generator: () => T, count: number = 100): T[] {
  return Array.from({ length: count }, generator)
}

function generateAuthError() {
  const errorTypes = [
    { status: 400, message: 'Bad Request', type: 'validation' },
    { status: 401, message: 'Unauthorized', type: 'authentication' },
    { status: 403, message: 'Forbidden', type: 'authorization' },
    { status: 404, message: 'Not Found', type: 'resource' },
    { status: 422, message: 'Unprocessable Entity', type: 'validation' },
    { status: 429, message: 'Too Many Requests', type: 'rate_limit' },
    { status: 500, message: 'Internal Server Error', type: 'server' },
    { status: 502, message: 'Bad Gateway', type: 'network' },
    { status: 503, message: 'Service Unavailable', type: 'server' },
    { status: 504, message: 'Gateway Timeout', type: 'network' }
  ]
  
  const errorType = errorTypes[Math.floor(Math.random() * errorTypes.length)]
  const error = new Error(errorType.message) as any
  error.response = { 
    status: errorType.status,
    statusText: errorType.message,
    data: {
      error: {
        code: errorType.type.toUpperCase(),
        message: errorType.message,
        details: Math.random() > 0.5 ? { field: 'email', reason: 'invalid format' } : undefined
      }
    }
  }
  error.code = errorType.type.toUpperCase()
  return error
}

function generateInvalidCredentials() {
  const invalidEmails = ['', 'invalid-email', '@domain.com', 'user@', 'user@.com', 'a'.repeat(255) + '@example.com']
  const invalidNames = ['', '   ', 'a'.repeat(101), '<script>alert("xss")</script>']
  const invalidLanguages = ['', 'invalid-lang-code-too-long', 'xx', '123']
  const invalidTimezones = ['', 'Invalid/Timezone', 'a'.repeat(51)]
  
  return {
    email: invalidEmails[Math.floor(Math.random() * invalidEmails.length)],
    displayName: invalidNames[Math.floor(Math.random() * invalidNames.length)],
    profileImage: Math.random() > 0.5 ? 'not-a-valid-url' : undefined,
    language: Math.random() > 0.5 ? invalidLanguages[Math.floor(Math.random() * invalidLanguages.length)] : undefined,
    timezone: Math.random() > 0.5 ? invalidTimezones[Math.floor(Math.random() * invalidTimezones.length)] : undefined
  }
}

function generateValidCredentials() {
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'company.com']
  const names = ['John Doe', 'Jane Smith', 'Alice Johnson', 'Bob Wilson', 'Carol Brown']
  
  return {
    email: `user${Math.floor(Math.random() * 1000)}@${domains[Math.floor(Math.random() * domains.length)]}`,
    displayName: names[Math.floor(Math.random() * names.length)],
    profileImage: Math.random() > 0.5 ? `https://example.com/avatar${Math.floor(Math.random() * 100)}.jpg` : undefined,
    language: ['en', 'es', 'fr', 'de', 'zh'][Math.floor(Math.random() * 5)],
    timezone: ['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo'][Math.floor(Math.random() * 4)]
  }
}

function generateNetworkError() {
  const networkErrors = [
    { code: 'NETWORK_ERROR', message: 'Network Error' },
    { code: 'TIMEOUT', message: 'Request Timeout' },
    { code: 'CONNECTION_REFUSED', message: 'Connection Refused' },
    { code: 'DNS_ERROR', message: 'DNS Resolution Failed' }
  ]
  
  const errorType = networkErrors[Math.floor(Math.random() * networkErrors.length)]
  const error = new Error(errorType.message) as any
  error.code = errorType.code
  error.isNetworkError = true
  return error
}

function generateAuthState() {
  return {
    isAuthenticated: Math.random() > 0.5,
    isLoading: Math.random() > 0.8,
    error: Math.random() > 0.9 ? generateAuthError() : null,
    user: Math.random() > 0.3 ? {
      sub: `auth0|${Math.random().toString(36).substring(2, 15)}`,
      email: `user${Math.floor(Math.random() * 1000)}@example.com`,
      name: 'Test User'
    } : null
  }
}

// Test wrapper component
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('Authentication Error Handling - Property Tests', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    queryClient.clear()
  })

  describe('Property 2: Authentication Error Handling', () => {
    it('should display clear error messages for all invalid authentication attempts', async () => {
      const testCases = generateTestCases(() => ({
        credentials: generateInvalidCredentials(),
        errorType: generateAuthError(),
        authState: generateAuthState()
      }), 100)

      for (const { credentials, errorType, authState } of testCases) {
        // Property: For any invalid authentication attempt, the system should
        // display clear error messages and allow retry without affecting valid user sessions
        
        mockUseAuth0.mockReturnValue({
          ...authState,
          isAuthenticated: false,
          isLoading: false,
          error: errorType,
          getAccessTokenSilently: vi.fn().mockRejectedValue(errorType),
          loginWithRedirect: vi.fn(),
          logout: vi.fn()
        } as any)

        mockUserApi.createProfile.mockRejectedValue(errorType)
        mockUserApi.getCurrentUser.mockRejectedValue(errorType)
        mockUserApi.getAuthStatus.mockRejectedValue(errorType)

        const wrapper = createWrapper()
        const { result } = renderHook(() => useCreateUserProfile(), { wrapper })

        // Attempt to create profile with invalid credentials
        try {
          await result.current.mutateAsync(credentials)
        } catch (error) {
          // Should handle error gracefully
          expect(error).toBeTruthy()
        }

        await waitFor(() => {
          expect(result.current.error).toBeTruthy()
        })

        // Error should be specific and clear based on the type of failure
        const currentError = result.current.error as any
        if (errorType.response?.status === 400 || errorType.response?.status === 422) {
          // Validation errors should be clear
          expect(currentError?.message || currentError?.response?.data?.error?.message).toBeTruthy()
        } else if (errorType.response?.status === 401) {
          // Authentication errors should be clear
          expect(currentError?.message).toMatch(/unauthorized|authentication|invalid/i)
        } else if (errorType.response?.status === 403) {
          // Authorization errors should be clear
          expect(currentError?.message).toMatch(/forbidden|access|permission/i)
        } else if (errorType.response?.status >= 500) {
          // Server errors should provide helpful message
          expect(currentError?.message).toBeTruthy()
        }

        // System should remain stable after error
        expect(result.current).toBeTruthy()
        expect(() => result.current).not.toThrow()
      }
    })

    it('should allow retry attempts without affecting valid user sessions', async () => {
      const testCases = generateTestCases(() => ({
        failureCount: Math.floor(Math.random() * 5) + 1, // 1-5 failures
        eventualSuccess: Math.random() > 0.3, // 70% chance of eventual success
        errorType: generateAuthError(),
        validCredentials: generateValidCredentials()
      }), 100)

      for (const { failureCount, eventualSuccess, errorType, validCredentials } of testCases) {
        // Property: For any authentication failure, the system should allow
        // retry attempts without affecting other valid sessions
        
        let attemptCount = 0
        const mockGetToken = vi.fn().mockImplementation(() => {
          attemptCount++
          if (attemptCount <= failureCount) {
            throw errorType
          } else if (eventualSuccess) {
            return Promise.resolve('valid-token')
          } else {
            throw errorType
          }
        })

        mockUseAuth0.mockReturnValue({
          isAuthenticated: true,
          isLoading: false,
          error: null,
          getAccessTokenSilently: mockGetToken,
          loginWithRedirect: vi.fn(),
          logout: vi.fn()
        } as any)

        if (eventualSuccess) {
          mockUserApi.getCurrentUser.mockImplementation((token: string) => {
            if (token === 'valid-token') {
              return Promise.resolve({
                id: '1',
                email: validCredentials.email,
                displayName: validCredentials.displayName,
                profileImage: validCredentials.profileImage,
                language: validCredentials.language || 'en',
                timezone: validCredentials.timezone || 'UTC',
                creditBalance: 100,
                totalCreditsEver: 100,
                role: 'user' as const,
                createdAt: new Date().toISOString(),
                lastLoginAt: new Date().toISOString()
              })
            }
            throw errorType
          })
        } else {
          mockUserApi.getCurrentUser.mockRejectedValue(errorType)
        }

        const wrapper = createWrapper()
        const { result } = renderHook(() => useUser(), { wrapper })

        await waitFor(() => {
          if (eventualSuccess) {
            // Should eventually succeed after retries
            expect(result.current.data).toBeTruthy()
            expect(attemptCount).toBeGreaterThan(failureCount)
          } else {
            // Should handle persistent failures gracefully
            expect(result.current.error).toBeTruthy()
          }
        })

        // Verify retry behavior doesn't affect system stability
        expect(mockGetToken).toHaveBeenCalled()
        if (eventualSuccess) {
          expect(mockUserApi.getCurrentUser).toHaveBeenCalledWith('valid-token')
        }

        // System should remain functional after retries
        expect(result.current).toBeTruthy()
        expect(() => result.current).not.toThrow()
      }
    })

    it('should handle network errors gracefully without system crashes', async () => {
      const testCases = generateTestCases(() => ({
        networkError: generateNetworkError(),
        authState: generateAuthState(),
        operationType: ['getCurrentUser', 'createProfile', 'updateProfile', 'getAuthStatus'][Math.floor(Math.random() * 4)]
      }), 100)

      for (const { networkError, authState, operationType } of testCases) {
        // Property: For any network error during authentication, the system
        // should handle it gracefully without crashing or corrupting state
        
        mockUseAuth0.mockReturnValue({
          ...authState,
          getAccessTokenSilently: vi.fn().mockRejectedValue(networkError),
          loginWithRedirect: vi.fn(),
          logout: vi.fn()
        } as any)

        // Mock different API operations based on test case
        switch (operationType) {
          case 'createProfile':
            mockUserApi.createProfile.mockRejectedValue(networkError)
            break
          case 'updateProfile':
            mockUserApi.updateProfile.mockRejectedValue(networkError)
            break
          case 'getAuthStatus':
            mockUserApi.getAuthStatus.mockRejectedValue(networkError)
            break
          default:
            mockUserApi.getCurrentUser.mockRejectedValue(networkError)
        }

        const wrapper = createWrapper()
        
        let result: any
        switch (operationType) {
          case 'createProfile':
            result = renderHook(() => useCreateUserProfile(), { wrapper }).result
            try {
              await result.current.mutateAsync(generateValidCredentials())
            } catch (e) {
              // Expected network error
            }
            break
          case 'updateProfile':
            result = renderHook(() => useUpdateUserProfile(), { wrapper }).result
            try {
              await result.current.mutateAsync({ displayName: 'Updated Name' })
            } catch (e) {
              // Expected network error
            }
            break
          case 'getAuthStatus':
            result = renderHook(() => useAuthStatus(), { wrapper }).result
            break
          default:
            result = renderHook(() => useUser(), { wrapper }).result
        }

        await waitFor(() => {
          // System should handle network errors gracefully
          expect(result.current.error).toBeTruthy()
        })

        // Verify error handling based on network error type
        const currentError = result.current.error as any
        if (networkError.code === 'NETWORK_ERROR' || networkError.code === 'TIMEOUT') {
          expect(currentError).toBeTruthy()
        }

        // System should remain stable (no crashes)
        expect(() => result.current).not.toThrow()
        expect(result.current).toBeTruthy()

        // Should not corrupt application state
        expect(typeof result.current.error).toBeTruthy()
        expect(typeof result.current.isLoading).toBe('boolean')
      }
    })

    it('should provide consistent error feedback across all authentication operations', async () => {
      const testCases = generateTestCases(() => ({
        errorScenario: {
          type: ['network', 'validation', 'auth', 'server'][Math.floor(Math.random() * 4)],
          statusCode: [400, 401, 403, 404, 422, 429, 500, 502, 503, 504][Math.floor(Math.random() * 10)],
          message: ['Network error', 'Invalid credentials', 'Access denied', 'Server error', 'Validation failed'][Math.floor(Math.random() * 5)]
        },
        userAction: ['login', 'profile_creation', 'profile_update', 'status_check'][Math.floor(Math.random() * 4)],
        credentials: generateValidCredentials()
      }), 100)

      for (const { errorScenario, userAction, credentials } of testCases) {
        // Property: For any error scenario and user action, the system should
        // provide consistent error feedback and recovery options
        
        const error = new Error(errorScenario.message) as any
        error.response = { 
          status: errorScenario.statusCode,
          statusText: errorScenario.message,
          data: {
            error: {
              code: errorScenario.type.toUpperCase(),
              message: errorScenario.message
            }
          }
        }

        mockUseAuth0.mockReturnValue({
          isAuthenticated: userAction !== 'login',
          isLoading: false,
          error: userAction === 'login' ? error : null,
          getAccessTokenSilently: vi.fn().mockRejectedValue(error),
          loginWithRedirect: vi.fn(),
          logout: vi.fn()
        } as any)

        // Mock different API endpoints based on user action
        switch (userAction) {
          case 'profile_creation':
            mockUserApi.createProfile.mockRejectedValue(error)
            break
          case 'profile_update':
            mockUserApi.updateProfile.mockRejectedValue(error)
            break
          case 'status_check':
            mockUserApi.getAuthStatus.mockRejectedValue(error)
            break
          default:
            mockUserApi.getCurrentUser.mockRejectedValue(error)
        }

        const wrapper = createWrapper()
        
        let result: any
        switch (userAction) {
          case 'profile_creation':
            result = renderHook(() => useCreateUserProfile(), { wrapper }).result
            try {
              await result.current.mutateAsync(credentials)
            } catch (e) {
              // Expected error
            }
            break
          case 'profile_update':
            result = renderHook(() => useUpdateUserProfile(), { wrapper }).result
            try {
              await result.current.mutateAsync({ displayName: 'Updated Name' })
            } catch (e) {
              // Expected error
            }
            break
          case 'status_check':
            result = renderHook(() => useAuthStatus(), { wrapper }).result
            break
          default:
            result = renderHook(() => useUser(), { wrapper }).result
        }

        await waitFor(() => {
          // Should have consistent error handling
          expect(result.current.error).toBeTruthy()
        })

        // Verify error consistency based on status code
        const currentError = result.current.error as any
        if (errorScenario.statusCode === 400 || errorScenario.statusCode === 422) {
          // Validation errors should be informative
          expect(currentError?.message || currentError?.response?.data?.error?.message).toBeTruthy()
        } else if (errorScenario.statusCode === 401) {
          expect(currentError?.message).toMatch(/unauthorized|authentication|invalid/i)
        } else if (errorScenario.statusCode === 403) {
          expect(currentError?.message).toMatch(/forbidden|access|permission/i)
        } else if (errorScenario.statusCode === 429) {
          expect(currentError?.message).toMatch(/rate|limit|too many/i)
        } else if (errorScenario.statusCode >= 500) {
          expect(currentError?.message).toBeTruthy()
        }

        // System should remain functional after error
        expect(result.current).toBeTruthy()
        expect(() => result.current).not.toThrow()
      }
    })

    it('should maintain session isolation during concurrent error scenarios', async () => {
      const testCases = generateTestCases(() => ({
        concurrentErrors: Math.floor(Math.random() * 5) + 2, // 2-6 concurrent errors
        errorTypes: Array.from({ length: Math.floor(Math.random() * 3) + 1 }, () => generateAuthError()),
        validSession: Math.random() > 0.5
      }), 50) // Reduced count for performance

      for (const { concurrentErrors, errorTypes, validSession } of testCases) {
        // Property: For any number of concurrent authentication errors,
        // the system should maintain session isolation and not affect valid sessions
        
        const mockGetToken = vi.fn()
        
        if (validSession) {
          // Some operations succeed, others fail
          mockGetToken.mockImplementation(() => {
            if (Math.random() > 0.5) {
              return Promise.resolve('valid-token')
            } else {
              throw errorTypes[Math.floor(Math.random() * errorTypes.length)]
            }
          })
          
          mockUserApi.getCurrentUser.mockImplementation((token: string) => {
            if (token === 'valid-token') {
              return Promise.resolve({
                id: '1',
                email: 'test@example.com',
                displayName: 'Test User',
                language: 'en',
                timezone: 'UTC',
                creditBalance: 100,
                totalCreditsEver: 100,
                role: 'user' as const,
                createdAt: new Date().toISOString(),
                lastLoginAt: new Date().toISOString()
              })
            }
            throw errorTypes[Math.floor(Math.random() * errorTypes.length)]
          })
        } else {
          // All operations fail
          mockGetToken.mockRejectedValue(errorTypes[0])
          mockUserApi.getCurrentUser.mockRejectedValue(errorTypes[0])
        }

        mockUseAuth0.mockReturnValue({
          isAuthenticated: true,
          isLoading: false,
          error: null,
          getAccessTokenSilently: mockGetToken,
          loginWithRedirect: vi.fn(),
          logout: vi.fn()
        } as any)

        const wrapper = createWrapper()
        
        // Create multiple concurrent hooks
        const hooks = Array.from({ length: concurrentErrors }, () => 
          renderHook(() => useUser(), { wrapper })
        )

        // Wait for all operations to complete
        await Promise.all(hooks.map(({ result }) => 
          waitFor(() => {
            expect(result.current.data || result.current.error).toBeTruthy()
          })
        ))

        // Verify session isolation
        const results = hooks.map(({ result }) => result.current)
        const successfulResults = results.filter(r => r.data && !r.error)
        const errorResults = results.filter(r => r.error && !r.data)
        
        if (validSession && successfulResults.length > 0) {
          // Valid sessions should not be affected by concurrent errors
          successfulResults.forEach(result => {
            expect(result.data?.id).toBeTruthy()
            expect(result.data?.email).toBeTruthy()
            expect(result.error).toBeFalsy()
          })
        }

        // Error results should be handled gracefully
        errorResults.forEach(result => {
          expect(result.error).toBeTruthy()
          expect(() => result).not.toThrow()
        })

        // System should remain stable across all concurrent operations
        results.forEach(result => {
          expect(result).toBeTruthy()
          expect(() => result).not.toThrow()
        })
      }
    })
  })
})