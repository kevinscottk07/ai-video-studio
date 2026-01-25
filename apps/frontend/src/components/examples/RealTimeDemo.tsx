/**
 * Real-Time Demo Component
 * 
 * Demonstrates the real-time functionality with live examples.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Users, Bell, Zap, Activity } from 'lucide-react';
import { 
  useRealTimeFeatures,
  useProjectCollaboration,
  useGenerationProgress,
  useCommunityFeed,
  useOptimisticUpdates,
} from '../../hooks/useRealTime';
import { useToast } from '../../providers/ToastProvider';
import { 
  ConnectionStatus,
  ProgressIndicator,
  NotificationCenter,
  OptimisticUpdateIndicator,
} from '../realtime';
import { cn } from '../../lib/component-variants';

interface RealTimeDemoProps {
  className?: string;
}

export const RealTimeDemo = ({ className }: RealTimeDemoProps) => {
  const [selectedProject, setSelectedProject] = useState<string | null>('demo-project-1');
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [enableCommunity, setEnableCommunity] = useState(false);
  
  const toast = useToast();
  const realTimeFeatures = useRealTimeFeatures({
    projectId: selectedProject,
    jobId: selectedJob,
    enableCommunity,
  });

  const projectCollaboration = useProjectCollaboration(selectedProject);
  const generationProgress = useGenerationProgress(selectedJob);
  const communityFeed = useCommunityFeed();
  const optimisticUpdates = useOptimisticUpdates();

  const handleStartGeneration = () => {
    const jobId = `job_${Date.now()}`;
    setSelectedJob(jobId);
    toast.info('Video generation started', 'Generation Started');
  };

  const handleStopGeneration = () => {
    setSelectedJob(null);
    toast.info('Video generation stopped', 'Generation Stopped');
  };

  const handleSendProjectUpdate = () => {
    if (!selectedProject) return;

    const rollback = () => {
      toast.warning('Project update failed - changes reverted', 'Update Failed');
    };

    const updateId = projectCollaboration.sendProjectUpdate(
      'settings',
      { title: `Updated at ${new Date().toLocaleTimeString()}` },
      rollback
    );

    if (updateId) {
      toast.success('Project update sent', 'Update Sent');
    }
  };

  const handleSendCommunityInteraction = () => {
    if (!enableCommunity) return;

    const rollback = () => {
      toast.warning('Community interaction failed', 'Interaction Failed');
    };

    const updateId = communityFeed?.sendInteraction(
      'like',
      'demo-content-1',
      { liked: true },
      rollback
    );

    if (updateId) {
      toast.success('Community interaction sent', 'Interaction Sent');
    }
  };

  const handleTestOptimisticUpdate = () => {
    const rollback = () => {
      toast.warning('Optimistic update failed - rolled back', 'Update Failed');
    };

    const updateId = optimisticUpdates.sendOptimisticUpdate(
      'demo:update',
      { message: 'Test optimistic update' },
      rollback
    );

    if (updateId) {
      toast.info('Optimistic update sent', 'Update Sent');
    }
  };

  return (
    <div className={cn('space-y-6 p-6', className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Real-Time Features Demo
        </h2>
        <div className="flex items-center gap-4">
          <ConnectionStatus showText size="md" />
          <NotificationCenter />
        </div>
      </div>

      {/* Connection Status */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Connection Status
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <ConnectionStatus showText={false} size="lg" className="mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              State: {realTimeFeatures.connectionState}
            </p>
          </div>
          <div className="text-center">
            <div className={cn(
              'w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center',
              realTimeFeatures.isConnected 
                ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400'
            )}>
              <Zap className="h-6 w-6" />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {realTimeFeatures.isConnected ? 'Connected' : 'Disconnected'}
            </p>
          </div>
          <div className="text-center">
            <div className={cn(
              'w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center',
              realTimeFeatures.error 
                ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400'
            )}>
              <Bell className="h-6 w-6" />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {realTimeFeatures.error ? 'Error' : 'No Errors'}
            </p>
          </div>
        </div>
      </div>

      {/* Project Collaboration */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Project Collaboration
        </h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <select
              value={selectedProject || ''}
              onChange={(e) => setSelectedProject(e.target.value || null)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="">No Project</option>
              <option value="demo-project-1">Demo Project 1</option>
              <option value="demo-project-2">Demo Project 2</option>
            </select>
            <button
              onClick={handleSendProjectUpdate}
              disabled={!selectedProject || !realTimeFeatures.isConnected}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send Update
            </button>
          </div>
          
          {selectedProject && (
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Collaborators: {projectCollaboration.collaborators.length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Recent Updates: {projectCollaboration.projectUpdates.length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Subscribed: {projectCollaboration.isSubscribed ? 'Yes' : 'No'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Generation Progress */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Play className="h-5 w-5" />
          Generation Progress
        </h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleStartGeneration}
              disabled={!!selectedJob || !realTimeFeatures.isConnected}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              Start Generation
            </button>
            <button
              onClick={handleStopGeneration}
              disabled={!selectedJob}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Pause className="h-4 w-4" />
              Stop Generation
            </button>
          </div>
          
          {selectedJob && (
            <div className="space-y-3">
              <ProgressIndicator
                jobId={selectedJob}
                showDetails
                size="md"
                onComplete={() => {
                  toast.success('Video generation completed!', 'Generation Complete');
                  setSelectedJob(null);
                }}
              />
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <p>Job ID: {selectedJob}</p>
                <p>Progress: {generationProgress.percentage}%</p>
                <p>Stage: {generationProgress.stage}</p>
                <p>Complete: {generationProgress.isComplete ? 'Yes' : 'No'}</p>
                <p>Subscribed: {generationProgress.isSubscribed ? 'Yes' : 'No'}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Community Feed */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Community Feed
        </h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={enableCommunity}
                onChange={(e) => setEnableCommunity(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Enable Community Feed</span>
            </label>
            <button
              onClick={handleSendCommunityInteraction}
              disabled={!enableCommunity || !realTimeFeatures.isConnected}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send Interaction
            </button>
          </div>
          
          {enableCommunity && communityFeed && (
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Recent Updates: {communityFeed.updates.length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Subscribed: {communityFeed.isSubscribed ? 'Yes' : 'No'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Optimistic Updates */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Optimistic Updates
        </h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleTestOptimisticUpdate}
              disabled={!realTimeFeatures.isConnected}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Test Optimistic Update
            </button>
            <button
              onClick={() => optimisticUpdates.clearPendingUpdates()}
              disabled={!optimisticUpdates.hasPendingUpdates}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear Pending
            </button>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Pending Updates: {optimisticUpdates.pendingUpdates.length}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Has Pending: {optimisticUpdates.hasPendingUpdates ? 'Yes' : 'No'}
            </p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifications
        </h3>
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => toast.success('Test success message', 'Success!')}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
            >
              Success
            </button>
            <button
              onClick={() => toast.error('Test error message', 'Error!')}
              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
            >
              Error
            </button>
            <button
              onClick={() => toast.warning('Test warning message', 'Warning!')}
              className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
            >
              Warning
            </button>
            <button
              onClick={() => toast.info('Test info message', 'Info!')}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              Info
            </button>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Active Notifications: {realTimeFeatures.notifications.notifications.length}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Has Unread: {realTimeFeatures.notifications.hasUnread ? 'Yes' : 'No'}
            </p>
          </div>
        </div>
      </div>

      {/* Optimistic Update Indicator */}
      <OptimisticUpdateIndicator showDetails />
    </div>
  );
};

export default RealTimeDemo;