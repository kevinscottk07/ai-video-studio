import { renderHook, act } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { useLanguage, SUPPORTED_LANGUAGES } from '../useLanguage';
import i18n from '../../i18n/index';

const createWrapper = ({ children }: { children: React.ReactNode }) => (
  <I18nextProvider i18n={i18n}>
    {children}
  </I18nextProvider>
);

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

// Mock window.dispatchEvent
const dispatchEventSpy = jest.spyOn(window, 'dispatchEvent');

describe('useLanguage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('returns supported languages', () => {
    const { result } = renderHook(() => useLanguage(), {
      wrapper: createWrapper,
    });

    expect(result.current.supportedLanguages).toEqual(SUPPORTED_LANGUAGES);
    expect(result.current.supportedLanguages).toHaveLength(5);
    expect(result.current.supportedLanguages[0]).toEqual({
      code: 'en',
      name: 'English',
      nativeName: 'English',
      flag: '🇺🇸',
    });
  });

  it('returns current language', () => {
    const { result } = renderHook(() => useLanguage(), {
      wrapper: createWrapper,
    });

    expect(result.current.currentLanguage).toEqual({
      code: 'en',
      name: 'English',
      nativeName: 'English',
      flag: '🇺🇸',
    });
  });

  it('changes language correctly', async () => {
    const { result } = renderHook(() => useLanguage(), {
      wrapper: createWrapper,
    });

    await act(async () => {
      await result.current.changeLanguage('es');
    });

    // Verify localStorage was called
    expect(localStorageMock.setItem).toHaveBeenCalledWith('preferred-language', 'es');
    
    // Verify document.documentElement.lang was set
    expect(document.documentElement.lang).toBe('es');
    
    // Verify custom event was dispatched
    expect(dispatchEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'languageChanged',
        detail: { language: 'es' },
      })
    );
  });

  it('detects RTL languages correctly', () => {
    const { result } = renderHook(() => useLanguage(), {
      wrapper: createWrapper,
    });

    expect(result.current.isRTL('en')).toBe(false);
    expect(result.current.isRTL('es')).toBe(false);
    expect(result.current.isRTL('ar')).toBe(true);
    expect(result.current.isRTL('he')).toBe(true);
  });

  it('gets language for content correctly', () => {
    const { result } = renderHook(() => useLanguage(), {
      wrapper: createWrapper,
    });

    expect(result.current.getLanguageForContent()).toBe('en');
    expect(result.current.getLanguageForContent('fr')).toBe('fr');
  });

  it('provides translation function', () => {
    const { result } = renderHook(() => useLanguage(), {
      wrapper: createWrapper,
    });

    expect(typeof result.current.t).toBe('function');
    expect(result.current.t('common.loading')).toBe('Loading...');
  });

  it('loads saved language preference on mount', () => {
    localStorageMock.getItem.mockReturnValue('fr');
    
    const { result } = renderHook(() => useLanguage(), {
      wrapper: createWrapper,
    });

    // The hook should attempt to change to the saved language
    expect(localStorageMock.getItem).toHaveBeenCalledWith('preferred-language');
  });
});