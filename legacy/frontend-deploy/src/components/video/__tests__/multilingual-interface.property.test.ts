/**
 * Property-Based Tests for Multilingual Interface and Content
 * 
 * **Feature: ai-video-studio, Property 6: Multilingual Interface and Content**
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.5**
 * 
 * For any language selection, the system should display the interface in that language,
 * generate content in the specified language, and preserve all user data during language switches.
 */

import fc from 'fast-check';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { useLanguage, SUPPORTED_LANGUAGES } from '../../../hooks/useLanguage';
import React from 'react';
import { useVideoGenerationParams } from '../../../hooks/useVideoGeneration';
import i18n from '../../../i18n/index';

// Test data generators
const generateLanguageCode = () => fc.constantFrom(...SUPPORTED_LANGUAGES.map(lang => lang.code));

const generateUserData = () => fc.record({
  prompt: fc.string({ minLength: 10, maxLength: 500 }),
  duration: fc.integer({ min: 15, max: 300 }),
  style: fc.constantFrom('cinematic', 'advertisement', 'social_media', 'educational'),
  resolution: fc.constantFrom('standard', 'hd', 'ultra'),
  aspectRatio: fc.constantFrom('16:9', '9:16', '1:1', '4:3'),
});

const generateLanguageSwitch = () => fc.record({
  fromLanguage: generateLanguageCode(),
  toLanguage: generateLanguageCode(),
  userData: generateUserData(),
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock document.documentElement
Object.defineProperty(document.documentElement, 'lang', {
  writable: true,
  value: 'en',
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => {
    return React.createElement(QueryClientProvider, { client: queryClient },
      React.createElement(I18nextProvider, { i18n: i18n }, children)
    )
  }
};

describe('Property 6: Multilingual Interface and Content', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    document.documentElement.lang = 'en';
  });

  /**
   * Property: Language Interface Display
   * For any supported language selection, the interface should display in that language
   */
  it('should display interface in selected language for all supported languages', async () => {
    await fc.assert(
      fc.asyncProperty(generateLanguageCode(), async (languageCode) => {
        const { result } = renderHook(() => useLanguage(), {
          wrapper: createWrapper(),
        });

        // Change to the selected language
        await act(async () => {
          await result.current.changeLanguage(languageCode);
        });

        // Verify the interface language changed
        const currentLanguage = result.current.currentLanguage;
        expect(currentLanguage.code).toBe(languageCode);

        // Verify translation function works for the selected language
        const translatedText = result.current.t('common.loading');
        expect(typeof translatedText).toBe('string');
        expect(translatedText.length).toBeGreaterThan(0);

        // Verify document language attribute is updated
        expect(document.documentElement.lang).toBe(languageCode);

        // Verify language preference is stored
        expect(localStorageMock.setItem).toHaveBeenCalledWith('preferred-language', languageCode);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Content Language Generation
   * For any language selection, content generation should use the specified language
   */
  it('should generate content in specified language for all supported languages', async () => {
    await fc.assert(
      fc.asyncProperty(
        generateLanguageCode(),
        generateUserData(),
        async (languageCode, userData) => {
          const { result: languageResult } = renderHook(() => useLanguage(), {
            wrapper: createWrapper(),
          });

          const { result: paramsResult } = renderHook(() => useVideoGenerationParams({
            language: languageCode,
          }), {
            wrapper: createWrapper(),
          });

          // Set the language
          await act(async () => {
            await languageResult.current.changeLanguage(languageCode);
          });

          // Set user data
          act(() => {
            paramsResult.current.updateParam('prompt', userData.prompt);
            paramsResult.current.updateParam('duration', userData.duration);
            paramsResult.current.updateParam('style', userData.style);
            paramsResult.current.updateParam('resolution', userData.resolution);
            paramsResult.current.updateParam('aspectRatio', userData.aspectRatio);
          });

          // Verify the video generation parameters include the correct language
          expect(paramsResult.current.params.language).toBe(languageCode);

          // Verify content language detection works
          const contentLanguage = languageResult.current.getLanguageForContent();
          expect(contentLanguage).toBe(languageCode);

          // Verify all user data is preserved
          expect(paramsResult.current.params.prompt).toBe(userData.prompt);
          expect(paramsResult.current.params.duration).toBe(userData.duration);
          expect(paramsResult.current.params.style).toBe(userData.style);
          expect(paramsResult.current.params.resolution).toBe(userData.resolution);
          expect(paramsResult.current.params.aspectRatio).toBe(userData.aspectRatio);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Data Preservation During Language Switches
   * For any language switch, all user project data and settings should be preserved
   */
  it('should preserve all user data during language switches', async () => {
    await fc.assert(
      fc.asyncProperty(generateLanguageSwitch(), async (switchData) => {
        const { fromLanguage, toLanguage, userData } = switchData;

        const { result: languageResult } = renderHook(() => useLanguage(), {
          wrapper: createWrapper(),
        });

        const { result: paramsResult } = renderHook(() => useVideoGenerationParams({
          language: fromLanguage,
        }), {
          wrapper: createWrapper(),
        });

        // Set initial language
        await act(async () => {
          await languageResult.current.changeLanguage(fromLanguage);
        });

        // Set user data in the initial language
        act(() => {
          paramsResult.current.updateParam('prompt', userData.prompt);
          paramsResult.current.updateParam('duration', userData.duration);
          paramsResult.current.updateParam('style', userData.style);
          paramsResult.current.updateParam('resolution', userData.resolution);
          paramsResult.current.updateParam('aspectRatio', userData.aspectRatio);
        });

        // Capture initial state
        const initialParams = { ...paramsResult.current.params };

        // Switch to target language
        await act(async () => {
          await languageResult.current.changeLanguage(toLanguage);
        });

        // Update language in params to match new UI language
        act(() => {
          paramsResult.current.updateParam('language', toLanguage);
        });

        // Verify language changed
        expect(languageResult.current.currentLanguage.code).toBe(toLanguage);
        expect(paramsResult.current.params.language).toBe(toLanguage);

        // Verify all other user data is preserved
        expect(paramsResult.current.params.prompt).toBe(initialParams.prompt);
        expect(paramsResult.current.params.duration).toBe(initialParams.duration);
        expect(paramsResult.current.params.style).toBe(initialParams.style);
        expect(paramsResult.current.params.resolution).toBe(initialParams.resolution);
        expect(paramsResult.current.params.aspectRatio).toBe(initialParams.aspectRatio);

        // Verify interface still works in new language
        const translatedText = languageResult.current.t('common.loading');
        expect(typeof translatedText).toBe('string');
        expect(translatedText.length).toBeGreaterThan(0);

        // Verify system state consistency
        expect(document.documentElement.lang).toBe(toLanguage);
        expect(localStorageMock.setItem).toHaveBeenCalledWith('preferred-language', toLanguage);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Language-Specific Content Suggestions
   * For any language, the system should provide appropriate content suggestions and templates
   */
  it('should provide language-appropriate content suggestions for all supported languages', async () => {
    await fc.assert(
      fc.asyncProperty(generateLanguageCode(), async (languageCode) => {
        const { result } = renderHook(() => useLanguage(), {
          wrapper: createWrapper(),
        });

        // Change to the selected language
        await act(async () => {
          await result.current.changeLanguage(languageCode);
        });

        // Verify language-specific functionality
        const currentLanguage = result.current.currentLanguage;
        expect(currentLanguage.code).toBe(languageCode);

        // Verify the language has proper metadata
        expect(currentLanguage.name).toBeTruthy();
        expect(currentLanguage.nativeName).toBeTruthy();
        expect(currentLanguage.flag).toBeTruthy();

        // Verify RTL detection works correctly
        const isRTL = result.current.isRTL(languageCode);
        expect(typeof isRTL).toBe('boolean');

        // Verify content language detection
        const contentLanguage = result.current.getLanguageForContent();
        expect(contentLanguage).toBe(languageCode);

        // Verify translation keys exist for the language
        const commonKeys = ['loading', 'error', 'success', 'cancel', 'save'];
        for (const key of commonKeys) {
          const translation = result.current.t(`common.${key}`);
          expect(typeof translation).toBe('string');
          expect(translation.length).toBeGreaterThan(0);
          // Should not return the key itself (indicating missing translation)
          expect(translation).not.toBe(`common.${key}`);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Consistent Language State Management
   * For any sequence of language operations, the system should maintain consistent state
   */
  it('should maintain consistent language state across all operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(generateLanguageCode(), { minLength: 1, maxLength: 5 }),
        async (languageSequence) => {
          const { result } = renderHook(() => useLanguage(), {
            wrapper: createWrapper(),
          });

          let previousLanguage = 'en';

          for (const targetLanguage of languageSequence) {
            // Change language
            await act(async () => {
              await result.current.changeLanguage(targetLanguage);
            });

            // Verify state consistency
            expect(result.current.currentLanguage.code).toBe(targetLanguage);
            expect(document.documentElement.lang).toBe(targetLanguage);

            // Verify localStorage was updated
            expect(localStorageMock.setItem).toHaveBeenCalledWith('preferred-language', targetLanguage);

            // Verify translation function works
            const translation = result.current.t('common.loading');
            expect(typeof translation).toBe('string');
            expect(translation.length).toBeGreaterThan(0);

            // Verify language metadata is correct
            const languageInfo = SUPPORTED_LANGUAGES.find(lang => lang.code === targetLanguage);
            expect(result.current.currentLanguage).toEqual(languageInfo);

            previousLanguage = targetLanguage;
          }

          // Final consistency check
          const finalLanguage = languageSequence[languageSequence.length - 1];
          expect(result.current.currentLanguage.code).toBe(finalLanguage);
          expect(document.documentElement.lang).toBe(finalLanguage);
        }
      ),
      { numRuns: 50 }
    );
  });
});