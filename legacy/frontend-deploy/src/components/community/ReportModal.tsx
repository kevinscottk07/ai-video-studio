/**
 * Report Modal Component
 * 
 * Allows users to report inappropriate content or users.
 * Features form validation, reason selection, and submission handling.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Flag, AlertTriangle, Shield } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { useToast } from '../../providers/ToastProvider';
import { moderationApi, CreateReportRequest } from '../../services/api/moderationApi';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentType?: 'post' | 'comment' | 'user_profile';
  contentId?: string;
  reportedUserId?: string;
  reportedUserName?: string;
  contentPreview?: string;
}

const REPORT_REASONS = [
  { value: 'inappropriate_content', label: 'Inappropriate Content', description: 'Sexual, violent, or disturbing content' },
  { value: 'spam', label: 'Spam', description: 'Repetitive or promotional content' },
  { value: 'harassment', label: 'Harassment', description: 'Bullying, threats, or personal attacks' },
  { value: 'copyright_violation', label: 'Copyright Violation', description: 'Unauthorized use of copyrighted material' },
  { value: 'violence', label: 'Violence', description: 'Content promoting or depicting violence' },
  { value: 'hate_speech', label: 'Hate Speech', description: 'Discriminatory or hateful language' },
  { value: 'nudity', label: 'Nudity', description: 'Explicit or sexual imagery' },
  { value: 'misinformation', label: 'Misinformation', description: 'False or misleading information' },
  { value: 'other', label: 'Other', description: 'Other policy violations' },
];

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  contentType,
  contentId,
  reportedUserId,
  reportedUserName,
  contentPreview,
}) => {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Submit report mutation
  const submitReportMutation = useMutation({
    mutationFn: (data: CreateReportRequest) => moderationApi.createReport(data),
    onSuccess: () => {
      toast({
        title: 'Report Submitted',
        description: 'Thank you for helping keep our community safe. We\'ll review your report shortly.',
        variant: 'default',
      });
      
      // Reset form and close modal
      setReason('');
      setDescription('');
      onClose();
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['moderation-queue'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to submit report. Please try again.';
      toast({
        title: 'Report Failed',
        description: message,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason || !description.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please select a reason and provide a description.',
        variant: 'destructive',
      });
      return;
    }

    if (description.trim().length < 10) {
      toast({
        title: 'Description Too Short',
        description: 'Please provide a more detailed description (at least 10 characters).',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    
    submitReportMutation.mutate({
      contentType,
      contentId,
      reportedUserId,
      reason,
      description: description.trim(),
    });
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setReason('');
      setDescription('');
      onClose();
    }
  };

  const selectedReasonData = REPORT_REASONS.find(r => r.value === reason);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md mx-4 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <Flag className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Report {contentType === 'user_profile' ? 'User' : 'Content'}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Help us maintain community standards
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                disabled={isSubmitting}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* What's being reported */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Reporting:
                </h3>
                {reportedUserName && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    User: <span className="font-medium">{reportedUserName}</span>
                  </p>
                )}
                {contentPreview && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    "{contentPreview.length > 100 ? contentPreview.substring(0, 100) + '...' : contentPreview}"
                  </p>
                )}
                {contentType && !contentPreview && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {contentType === 'post' ? 'Community Post' : 
                     contentType === 'comment' ? 'Comment' : 'User Profile'}
                  </p>
                )}
              </div>

              {/* Reason Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900 dark:text-white">
                  Reason for Report *
                </label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger>
                    <span>{selectedReasonData?.label || 'Select a reason...'}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_REASONS.map(reasonOption => (
                      <SelectItem key={reasonOption.value} value={reasonOption.value}>
                        <div>
                          <div className="font-medium">{reasonOption.label}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {reasonOption.description}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedReasonData && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {selectedReasonData.description}
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900 dark:text-white">
                  Additional Details *
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please provide specific details about why you're reporting this content or user. The more information you provide, the better we can review your report."
                  rows={4}
                  maxLength={1000}
                  className="resize-none"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Minimum 10 characters required</span>
                  <span>{description.length}/1000</span>
                </div>
              </div>

              {/* Warning */}
              <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="text-amber-800 dark:text-amber-200 font-medium mb-1">
                    Important Notice
                  </p>
                  <p className="text-amber-700 dark:text-amber-300">
                    False reports may result in action against your account. Please only report content that genuinely violates our community guidelines.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!reason || !description.trim() || description.trim().length < 10 || isSubmitting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Submitting...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Submit Report
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};