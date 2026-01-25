/**
 * Community Page Component
 * 
 * Main community page that displays the community feed with real-time updates.
 * Features responsive design, infinite scroll, and professional layout.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { CommunityFeed } from '../components/community/CommunityFeed';
import { AppLayout } from '../components/layout/AppLayout';

export const CommunityPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Community - AI Video Studio</title>
        <meta 
          name="description" 
          content="Discover amazing AI-generated videos from our creative community. Share your creations and get inspired by others." 
        />
        <meta name="keywords" content="AI video, community, creative, sharing, inspiration" />
      </Helmet>

      <AppLayout>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-4 py-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <CommunityFeed />
            </motion.div>
          </div>
        </div>
      </AppLayout>
    </>
  );
};