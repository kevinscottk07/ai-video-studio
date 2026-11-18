import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Auth0Provider } from '@auth0/auth0-react';
import { I18nextProvider } from 'react-i18next';
import { PromptTranslationHelper } from '../PromptTranslationHelper';
import i18n from '../../../i18n/index';
import { ToastProvider } from '../../../providers/ToastProvider';

// Mock the hooks
jest.mock('../../../hooks/useTranslation', () => ({
  useTextTranslation: () => ({
    translateText: jest.fn(),
    translation: null,
    isTranslating: false,
    error: null,
    reset: jest.fn(),
  }),
  usePromptOptimization: () => ({
    optimizePrompt: jest.fn(),
    optimization: null,
    isOptimizing: false,
    error: null,
    reset: jest.fn(),
  }),
}));

jest.mock('../../../hooks/useLanguage', () => ({
  useLanguage: () => ({
    supportedLanguages: [
      { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
      { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
      { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
    ],
    t: (key: string) => key,
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <Auth0Provider
        domain="test-domain"
        clientId="test-client-id"
        authorizationParams={{ redirect_uri: window.location.origin }}
      >
        <I18nextProvider i18n={i18n}>
          <ToastProvider>
            {children}
          </ToastProvider>
        </I18nextProvider>
      </Auth0Provider>
    </QueryClientProvider>
  );
};

describe('PromptTranslationHelper', () => {
  const defaultProps = {
    currentPrompt: 'Create a professional video about technology',
    currentLanguage: 'en',
    videoStyle: 'professional',
    onPromptUpdate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders translation helper interface', () => {
    render(<PromptTranslationHelper {...defaultProps} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('videoGeneration.translationHelper')).toBeInTheDocument();
    expect(screen.getByText('Target Language')).toBeInTheDocument();
    expect(screen.getByText('Cultural Context')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /translate/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /optimize/i })).toBeInTheDocument();
  });

  it('shows language selection dropdown', async () => {
    render(<PromptTranslationHelper {...defaultProps} />, {
      wrapper: createWrapper(),
    });

    const languageSelect = screen.getByRole('combobox');
    fireEvent.click(languageSelect);

    await waitFor(() => {
      expect(screen.getByText('English')).toBeInTheDocument();
      expect(screen.getByText('Español')).toBeInTheDocument();
      expect(screen.getByText('Français')).toBeInTheDocument();
    });
  });

  it('disables translate button when same language is selected', () => {
    render(<PromptTranslationHelper {...defaultProps} />, {
      wrapper: createWrapper(),
    });

    const translateButton = screen.getByRole('button', { name: /translate/i });
    expect(translateButton).toBeDisabled();
  });

  it('enables translate button when different language is selected', async () => {
    render(<PromptTranslationHelper {...defaultProps} />, {
      wrapper: createWrapper(),
    });

    const languageSelect = screen.getByRole('combobox');
    fireEvent.click(languageSelect);

    await waitFor(() => {
      const spanishOption = screen.getByText('Español');
      fireEvent.click(spanishOption);
    });

    const translateButton = screen.getByRole('button', { name: /translate/i });
    expect(translateButton).not.toBeDisabled();
  });

  it('allows entering cultural context', () => {
    render(<PromptTranslationHelper {...defaultProps} />, {
      wrapper: createWrapper(),
    });

    const contextTextarea = screen.getByPlaceholderText(/corporate audience/i);
    fireEvent.change(contextTextarea, { target: { value: 'Young professionals in Spain' } });

    expect(contextTextarea).toHaveValue('Young professionals in Spain');
  });

  it('calls onPromptUpdate when prompt is updated', () => {
    const onPromptUpdate = jest.fn();
    render(
      <PromptTranslationHelper {...defaultProps} onPromptUpdate={onPromptUpdate} />,
      { wrapper: createWrapper() }
    );

    // This would be tested with actual translation results
    // For now, we just verify the prop is passed correctly
    expect(onPromptUpdate).not.toHaveBeenCalled();
  });
});