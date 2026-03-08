import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Auth0Provider } from '@auth0/auth0-react';
import { I18nextProvider } from 'react-i18next';

import App from './App';
import { ThemeProvider } from './providers/ThemeProvider';
import { RealtimeProvider } from './providers/RealtimeProvider';
import { ToastProvider } from './providers/ToastProvider';
import i18n from './i18n/index';

import './styles/globals.css';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
    },
  },
});

// Auth0 configuration
const auth0Config = {
  domain: import.meta.env.VITE_AUTH0_DOMAIN || '',
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID || '',
  authorizationParams: {
    redirect_uri: window.location.origin,
    audience: import.meta.env.VITE_AUTH0_AUDIENCE || '',
    scope: 'openid profile email',
  },
  cacheLocation: 'localstorage' as const,
  useRefreshTokens: true,
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Auth0Provider {...auth0Config}>
        <QueryClientProvider client={queryClient}>
          <I18nextProvider i18n={i18n}>
            <ThemeProvider>
              <RealtimeProvider>
                <ToastProvider>
                  <App />
                </ToastProvider>
              </RealtimeProvider>
            </ThemeProvider>
          </I18nextProvider>
        </QueryClientProvider>
      </Auth0Provider>
    </BrowserRouter>
  </React.StrictMode>
);