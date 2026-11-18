import { useTranslation } from 'react-i18next';
import { useCallback, useEffect } from 'react';

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
  },
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
  },
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
  },
  {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
  },
  {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文',
    flag: '🇨🇳',
  },
];

export const useLanguage = () => {
  const { i18n, t } = useTranslation();

  const currentLanguage = SUPPORTED_LANGUAGES.find(
    (lang) => lang.code === i18n.language
  ) || SUPPORTED_LANGUAGES[0];

  const changeLanguage = useCallback(
    async (languageCode: string) => {
      try {
        await i18n.changeLanguage(languageCode);
        
        // Store the language preference
        localStorage.setItem('preferred-language', languageCode);
        
        // Update document language attribute
        document.documentElement.lang = languageCode;
        
        // Dispatch custom event for other components to react to language change
        window.dispatchEvent(
          new CustomEvent('languageChanged', {
            detail: { language: languageCode },
          })
        );
      } catch (error) {
        console.error('Failed to change language:', error);
      }
    },
    [i18n]
  );

  const getLanguageForContent = useCallback((contentLanguage?: string) => {
    // If content has a specific language, use it; otherwise use current UI language
    return contentLanguage || i18n.language;
  }, [i18n.language]);

  const isRTL = useCallback((languageCode?: string) => {
    const lang = languageCode || i18n.language;
    // Add RTL languages as needed
    const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
    return rtlLanguages.includes(lang);
  }, [i18n.language]);

  // Initialize language on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('preferred-language');
    if (savedLanguage && savedLanguage !== i18n.language) {
      changeLanguage(savedLanguage);
    }
  }, [changeLanguage, i18n.language]);

  return {
    currentLanguage,
    supportedLanguages: SUPPORTED_LANGUAGES,
    changeLanguage,
    getLanguageForContent,
    isRTL,
    t,
  };
};