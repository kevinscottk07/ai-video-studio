import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, Settings, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Modal } from '../ui/modal';

interface ConsentPreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
}

export const ConsentBanner: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<ConsentPreferences>({
    necessary: true, // Always required
    analytics: false,
    marketing: false,
    functional: false,
  });

  useEffect(() => {
    // Check if user has already given consent
    const consentGiven = localStorage.getItem('cookie-consent');
    if (!consentGiven) {
      // Show banner after a short delay
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = async () => {
    const allConsents = {
      necessary: true,
      analytics: true,
      marketing: true,
      functional: true,
    };

    await recordConsents(allConsents);
    setShowBanner(false);
  };

  const handleAcceptSelected = async () => {
    await recordConsents(preferences);
    setShowBanner(false);
    setShowPreferences(false);
  };

  const handleRejectAll = async () => {
    const minimalConsents = {
      necessary: true,
      analytics: false,
      marketing: false,
      functional: false,
    };

    await recordConsents(minimalConsents);
    setShowBanner(false);
  };

  const recordConsents = async (consents: ConsentPreferences) => {
    try {
      // Record consent in localStorage
      localStorage.setItem('cookie-consent', JSON.stringify({
        consents,
        timestamp: new Date().toISOString(),
        version: '1.0'
      }));

      // If user is authenticated, also record in backend
      const token = localStorage.getItem('token');
      if (token) {
        const consentTypes = [
          { type: 'data_processing', granted: consents.necessary },
          { type: 'analytics', granted: consents.analytics },
          { type: 'marketing', granted: consents.marketing },
          { type: 'cookies', granted: consents.functional },
        ];

        for (const consent of consentTypes) {
          await fetch('/api/v1/privacy/consent', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              consentType: consent.type,
              granted: consent.granted,
              policyVersion: '1.0'
            })
          });
        }
      }

      // Initialize analytics and other services based on consent
      if (consents.analytics) {
        // Initialize analytics (e.g., Google Analytics)
        console.log('Analytics consent granted - initializing tracking');
      }

      if (consents.marketing) {
        // Initialize marketing tools
        console.log('Marketing consent granted - enabling marketing features');
      }

      if (consents.functional) {
        // Enable functional cookies
        console.log('Functional cookies enabled');
      }

    } catch (error) {
      console.error('Error recording consent:', error);
    }
  };

  const handlePreferenceChange = (type: keyof ConsentPreferences, value: boolean) => {
    if (type === 'necessary') return; // Cannot disable necessary cookies
    
    setPreferences(prev => ({
      ...prev,
      [type]: value
    }));
  };

  if (!showBanner) return null;

  return (
    <>
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg"
          >
            <div className="max-w-7xl mx-auto px-4 py-4">
              <div className="flex items-start gap-4">
                <Cookie className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    We value your privacy
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    We use cookies and similar technologies to enhance your experience, analyze usage, 
                    and provide personalized content. You can manage your preferences or learn more in our{' '}
                    <a 
                      href="/privacy-policy" 
                      className="text-primary hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Privacy Policy
                    </a>.
                  </p>
                  
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={handleAcceptAll}
                      className="bg-primary hover:bg-primary/90 text-white"
                    >
                      Accept All
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={handleRejectAll}
                    >
                      Reject All
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => setShowPreferences(true)}
                      className="flex items-center gap-2"
                    >
                      <Settings className="h-4 w-4" />
                      Customize
                    </Button>
                  </div>
                </div>

                <button
                  onClick={() => setShowBanner(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                  aria-label="Close banner"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preferences Modal */}
      <Modal
        isOpen={showPreferences}
        onClose={() => setShowPreferences(false)}
        title="Cookie Preferences"
        size="lg"
      >
        <div className="space-y-6">
          <p className="text-gray-600 dark:text-gray-400">
            Choose which cookies you want to allow. You can change these settings at any time.
          </p>

          <div className="space-y-4">
            {/* Necessary Cookies */}
            <div className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Necessary Cookies
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Essential for the website to function properly. These cannot be disabled.
                </p>
              </div>
              <div className="ml-4">
                <div className="w-12 h-6 bg-primary rounded-full flex items-center justify-end px-1">
                  <div className="w-4 h-4 bg-white rounded-full"></div>
                </div>
              </div>
            </div>

            {/* Analytics Cookies */}
            <div className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Analytics Cookies
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Help us understand how visitors interact with our website by collecting anonymous information.
                </p>
              </div>
              <div className="ml-4">
                <button
                  onClick={() => handlePreferenceChange('analytics', !preferences.analytics)}
                  className={`w-12 h-6 rounded-full flex items-center transition-colors ${
                    preferences.analytics ? 'bg-primary justify-end' : 'bg-gray-300 dark:bg-gray-600 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 bg-white rounded-full mx-1"></div>
                </button>
              </div>
            </div>

            {/* Marketing Cookies */}
            <div className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Marketing Cookies
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Used to deliver personalized advertisements and measure their effectiveness.
                </p>
              </div>
              <div className="ml-4">
                <button
                  onClick={() => handlePreferenceChange('marketing', !preferences.marketing)}
                  className={`w-12 h-6 rounded-full flex items-center transition-colors ${
                    preferences.marketing ? 'bg-primary justify-end' : 'bg-gray-300 dark:bg-gray-600 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 bg-white rounded-full mx-1"></div>
                </button>
              </div>
            </div>

            {/* Functional Cookies */}
            <div className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Functional Cookies
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Enable enhanced functionality and personalization, such as remembering your preferences.
                </p>
              </div>
              <div className="ml-4">
                <button
                  onClick={() => handlePreferenceChange('functional', !preferences.functional)}
                  className={`w-12 h-6 rounded-full flex items-center transition-colors ${
                    preferences.functional ? 'bg-primary justify-end' : 'bg-gray-300 dark:bg-gray-600 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 bg-white rounded-full mx-1"></div>
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowPreferences(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAcceptSelected}
              className="flex-1"
            >
              Save Preferences
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};