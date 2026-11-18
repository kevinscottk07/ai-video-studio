import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Globe, Lock, Eye, MessageCircle, Download, Users, Link2, Copy, Check } from 'lucide-react';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Project, ShareSettings } from '../../services/api/projectApi';
import { useToast } from '../../providers/ToastProvider';

interface ShareProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onSubmit: (settings: ShareSettings) => Promise<void>;
  loading?: boolean;
}

export const ShareProjectModal: React.FC<ShareProjectModalProps> = ({
  isOpen,
  onClose,
  project,
  onSubmit,
  loading = false,
}) => {
  const toast = useToast();
  const [settings, setSettings] = useState<ShareSettings>({
    isPublic: false,
    allowComments: true,
    allowDownloads: false,
    collaborators: [],
  });
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // Initialize settings when project changes
  useEffect(() => {
    if (project) {
      setSettings({
        isPublic: project.isPublic,
        allowComments: true,
        allowDownloads: false,
        collaborators: [],
      });
      setShareUrl(`${window.location.origin}/projects/${project.id}`);
    }
  }, [project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!project) return;

    try {
      await onSubmit(settings);
    } catch (error) {
      // Error handling is done in the parent component
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: 'Copied!',
        description: 'Share URL copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy URL',
        variant: 'destructive',
      });
    }
  };

  if (!project) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center">
              {settings.isPublic ? (
                <Globe className="w-5 h-5 text-white" />
              ) : (
                <Lock className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Share Project
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {project.title}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="rounded-full"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Privacy Setting */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Privacy Settings
            </h3>
            
            <div className="space-y-3">
              {/* Public Option */}
              <div
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  settings.isPublic
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => setSettings(prev => ({ ...prev, isPublic: true }))}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      settings.isPublic
                        ? 'border-green-500 bg-green-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      {settings.isPublic && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Globe className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-gray-900 dark:text-white">
                        Public
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Anyone can view this project in the community feed and search results.
                      Perfect for showcasing your work and getting feedback.
                    </p>
                  </div>
                </div>
              </div>

              {/* Private Option */}
              <div
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  !settings.isPublic
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => setSettings(prev => ({ ...prev, isPublic: false }))}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      !settings.isPublic
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      {!settings.isPublic && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Lock className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-gray-900 dark:text-white">
                        Private
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Only you can view this project. Share the direct link with specific people
                      to give them access.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Public Settings */}
          {settings.isPublic && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Community Settings
              </h3>
              
              <div className="space-y-3">
                {/* Allow Comments */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        Allow Comments
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Let community members comment on your project
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant={settings.allowComments ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSettings(prev => ({ ...prev, allowComments: !prev.allowComments }))}
                  >
                    {settings.allowComments ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>

                {/* Allow Downloads */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Download className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        Allow Downloads
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Let others download your video file
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant={settings.allowDownloads ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSettings(prev => ({ ...prev, allowDownloads: !prev.allowDownloads }))}
                  >
                    {settings.allowDownloads ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Share URL */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Share Link
            </h3>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Link2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={shareUrl}
                  readOnly
                  className="pl-10 pr-12 bg-gray-50 dark:bg-gray-800"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleCopyUrl}
                className="flex items-center gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-600" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {settings.isPublic
                ? 'This link will be publicly accessible and discoverable in search results.'
                : 'Only people with this link can view your project.'
              }
            </p>
          </div>

          {/* Current Status */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <span className="font-medium text-gray-900 dark:text-white">
                Current Status
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600 dark:text-gray-400">Views</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {project.communityMetrics.views}
                </p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Likes</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {project.communityMetrics.likes}
                </p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Comments</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {project.communityMetrics.comments}
                </p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Shares</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {project.communityMetrics.shares}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={loading}
              className={`${
                settings.isPublic
                  ? 'bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700'
                  : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
              }`}
            >
              {settings.isPublic ? 'Share Publicly' : 'Make Private'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};