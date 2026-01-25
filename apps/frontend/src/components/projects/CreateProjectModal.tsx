import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Wand2, Settings, Globe, Lock } from 'lucide-react';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select } from '../ui/select';
import { Form } from '../ui/form';
import { CreateProjectRequest } from '../../services/api/projectApi';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProjectRequest) => Promise<void>;
  loading?: boolean;
}

const resolutionOptions = [
  { value: 'standard', label: 'Standard (720p)', description: 'Good for social media' },
  { value: 'hd', label: 'HD (1080p)', description: 'High quality for most uses' },
  { value: 'ultra', label: 'Ultra (4K)', description: 'Premium quality' },
];

const styleOptions = [
  { value: 'cinematic', label: 'Cinematic', description: 'Movie-like quality' },
  { value: 'advertisement', label: 'Advertisement', description: 'Commercial style' },
  { value: 'social_media', label: 'Social Media', description: 'Optimized for platforms' },
  { value: 'educational', label: 'Educational', description: 'Clear and informative' },
  { value: 'vr', label: 'VR/360°', description: 'Virtual reality format' },
];

const languageOptions = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ru', label: 'Russian' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'zh', label: 'Chinese' },
];

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  loading = false,
}) => {
  const [formData, setFormData] = useState<CreateProjectRequest>({
    title: '',
    description: '',
    settings: {
      resolution: 'hd',
      duration: 30,
      language: 'en',
      style: 'cinematic',
      musicEnabled: true,
    },
    isPublic: false,
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      return;
    }

    try {
      await onSubmit(formData);
      // Reset form
      setFormData({
        title: '',
        description: '',
        settings: {
          resolution: 'hd',
          duration: 30,
          language: 'en',
          style: 'cinematic',
          musicEnabled: true,
        },
        isPublic: false,
      });
      setShowAdvanced(false);
      onClose();
    } catch (error) {
      // Error handling is done in the parent component
    }
  };

  const handleInputChange = (field: string, value: any) => {
    if (field.startsWith('settings.')) {
      const settingField = field.replace('settings.', '');
      setFormData(prev => ({
        ...prev,
        settings: {
          ...prev.settings!,
          [settingField]: value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Wand2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Create New Project
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Start your AI video creation journey
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

        {/* Form */}
        <Form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Project Title *
              </label>
              <Input
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter your project title..."
                className="w-full"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe your video project..."
                rows={3}
                className="w-full"
              />
            </div>

            {/* Privacy Setting */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                {formData.isPublic ? (
                  <Globe className="w-5 h-5 text-green-600" />
                ) : (
                  <Lock className="w-5 h-5 text-gray-600" />
                )}
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formData.isPublic ? 'Public Project' : 'Private Project'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {formData.isPublic 
                      ? 'Visible in community feed and search results'
                      : 'Only visible to you'
                    }
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant={formData.isPublic ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleInputChange('isPublic', !formData.isPublic)}
              >
                {formData.isPublic ? 'Public' : 'Private'}
              </Button>
            </div>
          </div>

          {/* Advanced Settings Toggle */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <Settings className="w-4 h-4" />
              {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
            </Button>
          </div>

          {/* Advanced Settings */}
          {showAdvanced && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Resolution
                  </label>
                  <Select
                    value={formData.settings?.resolution}
                    onValueChange={(value) => handleInputChange('settings.resolution', value)}
                    options={resolutionOptions}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Duration (seconds)
                  </label>
                  <Input
                    type="number"
                    value={formData.settings?.duration}
                    onChange={(e) => handleInputChange('settings.duration', parseInt(e.target.value))}
                    min={1}
                    max={7200}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Language
                  </label>
                  <Select
                    value={formData.settings?.language}
                    onValueChange={(value) => handleInputChange('settings.language', value)}
                    options={languageOptions}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Style
                  </label>
                  <Select
                    value={formData.settings?.style}
                    onValueChange={(value) => handleInputChange('settings.style', value)}
                    options={styleOptions}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Background Music
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Add AI-generated background music to your video
                  </p>
                </div>
                <Button
                  type="button"
                  variant={formData.settings?.musicEnabled ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleInputChange('settings.musicEnabled', !formData.settings?.musicEnabled)}
                >
                  {formData.settings?.musicEnabled ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
            </motion.div>
          )}

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
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              Create Project
            </Button>
          </div>
        </Form>
      </div>
    </Modal>
  );
};