/**
 * Share Modal Component
 * 
 * Social sharing modal with platform-specific sharing options and copy link functionality.
 * Features smooth animations and professional design.
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Copy, 
  Check, 
  ExternalLink,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  Youtube
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Modal } from '../ui/modal';
import { CommunityPost } from './CommunityFeed';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShare: (platform: string) => void;
  post: CommunityPost;
}

interface SharePlatform {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  url: (post: CommunityPost) => string;
}

const SHARE_PLATFORMS: SharePlatform[] = [
  {
    id: 'twitter',
    name: 'Twitter',
    icon: <Twitter className="w-5 h-5" />,
    color: 'bg-blue-500 hover:bg-blue-600',
    url: (post) => {
      const text = `Check out this amazing AI-generated video: "${post.title}" by ${post.user.displayName}`;
      const url = `${window.location.origin}/community/posts/${post.id}`;
      return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    },
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: <Facebook className="w-5 h-5" />,
    color: 'bg-blue-600 hover:bg-blue-700',
    url: (post) => {
      const url = `${window.location.origin}/community/posts/${post.id}`;
      return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    },
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: <Linkedin className="w-5 h-5" />,
    color: 'bg-blue-700 hover:bg-blue-800',
    url: (post) => {
      const url = `${window.location.origin}/community/posts/${post.id}`;
      const title = `${post.title} - AI Video Studio`;
      const summary = post.description || `Amazing AI-generated video by ${post.user.displayName}`;
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&summary=${encodeURIComponent(summary)}`;
    },
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: <Instagram className="w-5 h-5" />,
    color: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600',
    url: () => '#', // Instagram doesn't support direct URL sharing
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: <Youtube className="w-5 h-5" />,
    color: 'bg-red-600 hover:bg-red-700',
    url: () => '#', // Custom sharing logic needed
  },
  {
    id: 'other',
    name: 'Other',
    icon: <ExternalLink className="w-5 h-5" />,
    color: 'bg-gray-600 hover:bg-gray-700',
    url: () => '#',
  },
];

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  onShare,
  post,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSharing, setIsSharing] = useState<string | null>(null);

  const postUrl = `${window.location.origin}/community/posts/${post.id}`;

  // Handle copy link
  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = postUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  }, [postUrl]);

  // Handle platform share
  const handlePlatformShare = useCallback(async (platform: SharePlatform) => {
    setIsSharing(platform.id);

    try {
      if (platform.id === 'instagram' || platform.id === 'youtube' || platform.id === 'other') {
        // For platforms that don't support direct URL sharing, just track the share
        await onShare(platform.id);
      } else {
        // Open sharing URL in new window
        const shareUrl = platform.url(post);
        window.open(shareUrl, '_blank', 'width=600,height=400');
        await onShare(platform.id);
      }
    } catch (error) {
      console.error(`Failed to share on ${platform.name}:`, error);
    } finally {
      setIsSharing(null);
    }
  }, [onShare, post]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Share Post
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Post Preview */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <img
              src={post.user.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.user.displayName)}&background=6366f1&color=fff`}
              alt={post.user.displayName}
              className="w-8 h-8 rounded-full"
            />
            <div>
              <p className="font-medium text-sm text-gray-900 dark:text-white">
                {post.user.displayName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {post.project.title}
              </p>
            </div>
          </div>
          
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
            {post.title}
          </h3>
          
          {post.description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 mb-3">
              {post.description}
            </p>
          )}

          <div className="aspect-video bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
            <img
              src={post.thumbnailUrl}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Copy Link */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Copy Link
          </label>
          <div className="flex gap-2">
            <Input
              type="text"
              value={postUrl}
              readOnly
              className="flex-1 text-sm"
            />
            <Button
              onClick={handleCopyLink}
              variant="outline"
              className="flex items-center gap-2"
            >
              <AnimatePresence mode="wait">
                {copiedLink ? (
                  <motion.div
                    key="check"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="text-green-500"
                  >
                    <Check className="w-4 h-4" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="copy"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <Copy className="w-4 h-4" />
                  </motion.div>
                )}
              </AnimatePresence>
              {copiedLink ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>

        {/* Share Platforms */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Share on Social Media
          </label>
          <div className="grid grid-cols-2 gap-3">
            {SHARE_PLATFORMS.map((platform) => (
              <motion.button
                key={platform.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handlePlatformShare(platform)}
                disabled={isSharing === platform.id}
                className={`
                  ${platform.color} text-white rounded-lg p-3 flex items-center gap-3 
                  transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                <div className="flex-shrink-0">
                  {isSharing === platform.id ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    platform.icon
                  )}
                </div>
                <span className="font-medium text-sm">{platform.name}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Share Stats */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <span>Total shares: {post.metrics.shares}</span>
            <span>Views: {post.metrics.views}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};