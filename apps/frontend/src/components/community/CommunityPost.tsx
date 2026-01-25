/**
 * Community Post Component
 * 
 * Full-page view of a community post with detailed information, comments, and interactions.
 * Features real-time updates, optimistic UI, and professional design.
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Heart, 
  MessageCircle, 
  Share2, 
  Eye, 
  Calendar,
  User,
  Play,
  ExternalLink,
  Flag
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar } from '../ui/avatar';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { CommentSection } from './CommentSection';
import { ShareModal } from './ShareModal';
import { communityApi } from '../../services/api/communityApi';
import { CommunityPost as CommunityPostType } from './CommunityFeed';

export const CommunityPost: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const [showShareModal, setShowShareModal] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [sharesCount, setSharesCount] = useState(0);
  const [isLiking, setIsLiking] = useState(false);

  // Fetch post data
  const {
    data: post,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['community-post', postId],
    queryFn: () => communityApi.getPost(postId!),
    enabled: !!postId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Update local state when post data changes
  useEffect(() => {
    if (post) {
      setIsLiked(post.isLikedByUser || false);
      setLikesCount(post.metrics.likes);
      setCommentsCount(post.metrics.comments);
      setSharesCount(post.metrics.shares);
    }
  }, [post]);

  // Handle like with optimistic updates
  const handleLike = async () => {
    if (!post || isLiking) return;

    setIsLiking(true);
    const previousIsLiked = isLiked;
    const previousLikesCount = likesCount;

    // Optimistic update
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);

    try {
      const result = await communityApi.likePost(post.id);
      
      // Update with server response
      setIsLiked(result.isLiked);
      setLikesCount(result.likesCount);
    } catch (error) {
      // Rollback on error
      setIsLiked(previousIsLiked);
      setLikesCount(previousLikesCount);
      console.error('Failed to like post:', error);
    } finally {
      setIsLiking(false);
    }
  };

  // Handle comment submission
  const handleComment = async (postId: string, content: string) => {
    try {
      const comment = await communityApi.commentOnPost(postId, { content });
      
      // Update comments count
      setCommentsCount(prev => prev + 1);
      
      return comment;
    } catch (error) {
      console.error('Failed to comment on post:', error);
      throw error;
    }
  };

  // Handle share
  const handleShare = async (platform: string) => {
    if (!post) return;

    try {
      const result = await communityApi.sharePost(post.id, platform);
      
      // Update shares count
      setSharesCount(result.sharesCount);
      
      setShowShareModal(false);
    } catch (error) {
      console.error('Failed to share post:', error);
    }
  };

  // Format view count
  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Post Not Found
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              The post you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => navigate('/community')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Community
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <Button
            variant="ghost"
            onClick={() => navigate('/community')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Community
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {/* Post Header */}
              <div className="p-6 pb-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={post.user.profileImage}
                      alt={post.user.displayName}
                      fallback={post.user.displayName.charAt(0).toUpperCase()}
                      className="w-12 h-12"
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {post.user.displayName}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600">
                    <Flag className="w-4 h-4" />
                  </Button>
                </div>

                {/* Post Title and Description */}
                <div className="mb-4">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    {post.title}
                  </h1>
                  {post.description && (
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                      {post.description}
                    </p>
                  )}
                </div>

                {/* Tags */}
                {post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {post.tags.map(tag => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="cursor-pointer hover:bg-blue-100 hover:text-blue-700 transition-colors"
                      >
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Video Player */}
              <div className="relative">
                <video
                  src={post.videoUrl}
                  poster={post.thumbnailUrl}
                  controls
                  className="w-full aspect-video object-cover bg-gray-100 dark:bg-gray-900"
                  preload="metadata"
                />
                
                {/* View Count Overlay */}
                <div className="absolute bottom-4 left-4">
                  <div className="bg-black bg-opacity-50 text-white text-sm px-3 py-1 rounded backdrop-blur-sm flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    <span>{formatCount(post.metrics.views)} views</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-6">
                    {/* Like Button */}
                    <Button
                      variant="ghost"
                      onClick={handleLike}
                      disabled={isLiking}
                      className={`flex items-center gap-2 transition-colors ${
                        isLiked 
                          ? 'text-red-500 hover:text-red-600' 
                          : 'text-gray-500 hover:text-red-500'
                      }`}
                    >
                      <motion.div
                        animate={isLiked ? { scale: [1, 1.2, 1] } : {}}
                        transition={{ duration: 0.3 }}
                      >
                        <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
                      </motion.div>
                      <span className="font-medium text-lg">{formatCount(likesCount)}</span>
                    </Button>

                    {/* Comment Button */}
                    <div className="flex items-center gap-2 text-gray-500">
                      <MessageCircle className="w-6 h-6" />
                      <span className="font-medium text-lg">{formatCount(commentsCount)}</span>
                    </div>

                    {/* Share Button */}
                    <Button
                      variant="ghost"
                      onClick={() => setShowShareModal(true)}
                      className="flex items-center gap-2 text-gray-500 hover:text-green-500 transition-colors"
                    >
                      <Share2 className="w-6 h-6" />
                      <span className="font-medium text-lg">{formatCount(sharesCount)}</span>
                    </Button>
                  </div>

                  {/* Project Link */}
                  <Button
                    variant="outline"
                    onClick={() => window.open(`/projects/${post.project.id}`, '_blank')}
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Project
                  </Button>
                </div>

                {/* Comments Section */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <CommentSection
                    postId={post.id}
                    onComment={handleComment}
                  />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-6">
              {/* Creator Info */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-500" />
                  Creator
                </h3>
                
                <div className="flex items-center gap-3 mb-4">
                  <Avatar
                    src={post.user.profileImage}
                    alt={post.user.displayName}
                    fallback={post.user.displayName.charAt(0).toUpperCase()}
                    className="w-12 h-12"
                  />
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {post.user.displayName}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      AI Video Creator
                    </p>
                  </div>
                </div>

                <Button variant="outline" className="w-full">
                  View Profile
                </Button>
              </motion.div>

              {/* Project Info */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Play className="w-5 h-5 text-green-500" />
                  Project
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {post.project.title}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      AI-Generated Video
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open(`/projects/${post.project.id}`, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Project
                  </Button>
                </div>
              </motion.div>

              {/* Post Stats */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                  Post Statistics
                </h3>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Views</span>
                    <span className="font-medium">{formatCount(post.metrics.views)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Likes</span>
                    <span className="font-medium">{formatCount(likesCount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Comments</span>
                    <span className="font-medium">{formatCount(commentsCount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Shares</span>
                    <span className="font-medium">{formatCount(sharesCount)}</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        onShare={handleShare}
        post={post}
      />
    </div>
  );
};