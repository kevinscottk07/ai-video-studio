/**
 * Moderation Dashboard Component
 * 
 * Admin interface for reviewing flagged content, managing reports,
 * and taking moderation actions. Features real-time updates and filtering.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Shield, 
  Flag, 
  Eye, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Clock,
  Filter,
  Search,
  MoreHorizontal,
  User,
  MessageSquare,
  Image,
  Calendar,
  TrendingUp,
  Activity
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem } from '../ui/select';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { useToast } from '../ui/use-toast';
import { moderationApi, ModerationFlag, ModerationFilters } from '../../services/api/moderationApi';

interface ModerationDashboardProps {
  className?: string;
}

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  flagged: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  under_review: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

const ACTION_COLORS = {
  no_action: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  content_removal: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  account_suspension: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  account_ban: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const REASON_LABELS = {
  inappropriate_content: 'Inappropriate Content',
  spam: 'Spam',
  harassment: 'Harassment',
  copyright_violation: 'Copyright Violation',
  violence: 'Violence',
  hate_speech: 'Hate Speech',
  nudity: 'Nudity',
  misinformation: 'Misinformation',
  other: 'Other',
};

export const ModerationDashboard: React.FC<ModerationDashboardProps> = ({ className = '' }) => {
  const [filters, setFilters] = useState<ModerationFilters>({
    status: 'pending',
    limit: 20,
    offset: 0,
  });
  const [selectedFlag, setSelectedFlag] = useState<ModerationFlag | null>(null);
  const [reviewAction, setReviewAction] = useState('');
  const [reviewStatus, setReviewStatus] = useState('');
  const [moderatorNotes, setModeratorNotes] = useState('');
  const [actionDuration, setActionDuration] = useState<number | undefined>();
  const [searchQuery, setSearchQuery] = useState('');

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch moderation queue
  const {
    data: queueData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['moderation-queue', filters],
    queryFn: () => moderationApi.getModerationQueue(filters),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch moderation stats
  const { data: statsData } = useQuery({
    queryKey: ['moderation-stats'],
    queryFn: () => moderationApi.getModerationStats(),
    refetchInterval: 60000, // Refetch every minute
  });

  // Review flag mutation
  const reviewFlagMutation = useMutation({
    mutationFn: ({ flagId, data }: { flagId: string; data: any }) =>
      moderationApi.reviewFlag(flagId, data),
    onSuccess: () => {
      toast({
        title: 'Review Submitted',
        description: 'The moderation flag has been reviewed successfully.',
        variant: 'default',
      });
      
      // Reset form and close modal
      setSelectedFlag(null);
      setReviewAction('');
      setReviewStatus('');
      setModeratorNotes('');
      setActionDuration(undefined);
      
      // Refetch data
      queryClient.invalidateQueries({ queryKey: ['moderation-queue'] });
      queryClient.invalidateQueries({ queryKey: ['moderation-stats'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to submit review. Please try again.';
      toast({
        title: 'Review Failed',
        description: message,
        variant: 'destructive',
      });
    },
  });

  const handleReviewSubmit = () => {
    if (!selectedFlag || !reviewStatus || !reviewAction) {
      toast({
        title: 'Missing Information',
        description: 'Please select a status and action.',
        variant: 'destructive',
      });
      return;
    }

    reviewFlagMutation.mutate({
      flagId: selectedFlag.id,
      data: {
        status: reviewStatus,
        action: reviewAction,
        moderatorNotes: moderatorNotes.trim() || undefined,
        actionDuration: actionDuration,
      },
    });
  };

  const handleFilterChange = (key: keyof ModerationFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      offset: 0, // Reset pagination
    }));
  };

  const getContentTypeIcon = (contentType: string) => {
    switch (contentType) {
      case 'post':
        return <Image className="w-4 h-4" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4" />;
      case 'user_profile':
        return <User className="w-4 h-4" />;
      default:
        return <Flag className="w-4 h-4" />;
    }
  };

  const formatConfidence = (confidence?: number) => {
    if (!confidence) return 'N/A';
    return `${Math.round(confidence * 100)}%`;
  };

  const flags = queueData?.data?.flags || [];
  const stats = statsData?.data;

  return (
    <div className={`max-w-7xl mx-auto ${className}`}>
      {/* Header */}
      <div className="mb-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-600" />
              Content Moderation
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Review flagged content and manage community safety
            </p>
          </div>
          <Button onClick={() => refetch()} variant="outline">
            <Activity className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </motion.div>

        {/* Stats Cards */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Pending Flags</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.flags.pending}
                  </p>
                </div>
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Flags</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.flags.total}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Flag className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Resolution Rate</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {Math.round(stats.efficiency.resolutionRate)}%
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Pending Reports</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.reports.pending}
                  </p>
                </div>
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters:</span>
            </div>

            <Select
              value={filters.status || ''}
              onValueChange={(value) => handleFilterChange('status', value || undefined)}
            >
              <SelectTrigger className="w-40">
                <span>Status</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="flagged">Flagged</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.contentType || ''}
              onValueChange={(value) => handleFilterChange('contentType', value || undefined)}
            >
              <SelectTrigger className="w-40">
                <span>Content Type</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="post">Posts</SelectItem>
                <SelectItem value="comment">Comments</SelectItem>
                <SelectItem value="user_profile">User Profiles</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.reason || ''}
              onValueChange={(value) => handleFilterChange('reason', value || undefined)}
            >
              <SelectTrigger className="w-48">
                <span>Reason</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Reasons</SelectItem>
                {Object.entries(REASON_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>
      </div>

      {/* Moderation Queue */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Failed to Load Moderation Queue
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              There was an error loading the moderation queue.
            </p>
            <Button onClick={() => refetch()} variant="outline">
              Try Again
            </Button>
          </div>
        ) : flags.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              All Clear!
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              No flags match your current filters.
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {flags.map((flag, index) => (
              <motion.div
                key={flag.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      {getContentTypeIcon(flag.contentType)}
                      <Badge className={STATUS_COLORS[flag.status]}>
                        {flag.status.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline">
                        {REASON_LABELS[flag.reason as keyof typeof REASON_LABELS] || flag.reason}
                      </Badge>
                      {flag.aiConfidence && (
                        <Badge variant="secondary">
                          AI: {formatConfidence(flag.aiConfidence)}
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-2 mb-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Content ID:</span> {flag.contentId}
                      </p>
                      {flag.description && (
                        <p className="text-sm text-gray-900 dark:text-white">
                          <span className="font-medium">Description:</span> {flag.description}
                        </p>
                      )}
                      {flag.flaggedByUser ? (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium">Reported by:</span> {flag.flaggedByUser.displayName}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium">Flagged by:</span> AI System
                        </p>
                      )}
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Created:</span> {new Date(flag.createdAt).toLocaleString()}
                      </p>
                    </div>

                    {flag.reviewedByUser && (
                      <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg mb-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          <span className="font-medium">Reviewed by:</span> {flag.reviewedByUser.displayName}
                        </p>
                        {flag.moderatorNotes && (
                          <p className="text-sm text-gray-900 dark:text-white">
                            <span className="font-medium">Notes:</span> {flag.moderatorNotes}
                          </p>
                        )}
                        <Badge className={ACTION_COLORS[flag.actionTaken]} size="sm">
                          {flag.actionTaken.replace('_', ' ')}
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedFlag(flag)}
                      disabled={flag.status === 'approved' || flag.status === 'rejected'}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Review
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Review Modal */}
      <AnimatePresence>
        {selectedFlag && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setSelectedFlag(null)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700"
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Review Moderation Flag
                </h3>
              </div>

              <div className="p-6 space-y-6">
                {/* Flag Details */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">Content Type:</span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">{selectedFlag.contentType}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">Reason:</span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">
                        {REASON_LABELS[selectedFlag.reason as keyof typeof REASON_LABELS] || selectedFlag.reason}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">AI Confidence:</span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">
                        {formatConfidence(selectedFlag.aiConfidence)}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">Created:</span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">
                        {new Date(selectedFlag.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {selectedFlag.description && (
                    <div className="mt-3">
                      <span className="font-medium text-gray-900 dark:text-white">Description:</span>
                      <p className="mt-1 text-gray-600 dark:text-gray-400">{selectedFlag.description}</p>
                    </div>
                  )}
                </div>

                {/* Review Form */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Status *
                    </label>
                    <Select value={reviewStatus} onValueChange={setReviewStatus}>
                      <SelectTrigger>
                        <span>{reviewStatus || 'Select status...'}</span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="under_review">Under Review</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Action *
                    </label>
                    <Select value={reviewAction} onValueChange={setReviewAction}>
                      <SelectTrigger>
                        <span>{reviewAction ? reviewAction.replace('_', ' ') : 'Select action...'}</span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no_action">No Action</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="content_removal">Content Removal</SelectItem>
                        <SelectItem value="account_suspension">Account Suspension</SelectItem>
                        <SelectItem value="account_ban">Account Ban</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {(reviewAction === 'account_suspension') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Suspension Duration (hours)
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="8760"
                      value={actionDuration || ''}
                      onChange={(e) => setActionDuration(e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="24"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Moderator Notes
                  </label>
                  <Textarea
                    value={moderatorNotes}
                    onChange={(e) => setModeratorNotes(e.target.value)}
                    placeholder="Add any additional notes about this review..."
                    rows={3}
                    maxLength={1000}
                  />
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setSelectedFlag(null)}
                  disabled={reviewFlagMutation.isPending}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReviewSubmit}
                  disabled={!reviewStatus || !reviewAction || reviewFlagMutation.isPending}
                  className="flex-1"
                >
                  {reviewFlagMutation.isPending ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Submitting...
                    </div>
                  ) : (
                    'Submit Review'
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};