/**
 * Demo Banner Component
 * 
 * Shows a banner when the app is running in demo mode
 */

import React from 'react';
import { Info, X } from 'lucide-react';
import { DEMO_MODE } from '../../config/demo';

interface DemoBannerProps {
  onDismiss?: () => void;
}

export const DemoBanner: React.FC<DemoBannerProps> = ({ onDismiss }) => {
  const [dismissed, setDismissed] = React.useState(false);

  if (!DEMO_MODE || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <span className="font-medium">Demo Mode:</span> You're viewing a demonstration of AI Video Studio. 
              Some features use mock data and won't persist.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};