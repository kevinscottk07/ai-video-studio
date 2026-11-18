/**
 * Post Card Component
 * 
 * Instagram-style post card with video player, engagement actions, and real-time updates.
 * Features optimistic UI updates, smooth animations, and professional design.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX,
  MoreHorizontal,
  ExternalLink,
  Calendar,
  Eye,
  Flag,
  ChevronDown
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar } from '../ui/avatar';
import { CommentSection } from './CommentSection';
import { ShareModal } from './ShareModal';
import { ReportModal } from './ReportModal';
import { useCommunityFeed } from '../../hooks/useRealTime';
import { communityApi } from '../../services/api/communityApi';
import { CommunityPost } from './CommunityFeed';

interface PostCardProps {
  post: CommunityPost;
  onLike?: (postId: string, isLiked: boolean) => void;
  onComment?: (postId: string, comment: string) => void;
  onShare?: (postId: string, platform: string) => void;
  className?: string;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onLike,
  onComment,
  onShare,
  className = '',
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isLiked, setIsLiked] = useState(post.isLikedByUser || false);
  const [likesCount, setLikesCount] = useState(post.metrics.likes);
  const [commentsCount, setCommentsCount] = useState(post.metrics.comments);
  const [sharesCount, setSharesCount] = useState(post.metrics.shares);
  const [isLiking, setIsLiking] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const communityFeed = useCommunityFeed();

  // Close more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    };

    if (showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMoreMenu]);

  // Handle video play/pause
  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  // Handle mute/unmute
  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  // Handle like with optimistic updates
  const handleLike = useCallback(async () => {
    if (isLiking) return;

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
      
      onLike?.(post.id, result.isLiked);
    } catch (error) {
      // Rollback on error
      setIsLiked(previousIsLiked);
      setLikesCount(previousLikesCount);
      console.error('Failed to like post:', error);
    } finally {
      setIsLiking(false);
    }
  }, [post.id, isLiked, likesCount, isLiking, onLike]);

  // Handle comment submission
  const handleComment = useCallback(async (content: string, parentCommentId?: string) => {
    try {
      const comment = await communityApi.commentOnPost(post.id, {
        content,
        parentCommentId,
      });
      
      // Update comments count
      setCommentsCount(prev => prev + 1);
      
      onComment?.(post.id, content);
      
      return comment;
    } catch (error) {
      console.error('Failed to comment on post:', error);
      throw error;
    }
  }, [post.id, onComment]);

  // Handle share
  const handleShare = useCallback(async (platform: string) => {
    try {
      const result = await communityApi.sharePost(post.id, platform);
      
      // Update shares count
      setSharesCount(result.sharesCount);
      
      onShare?.(post.id, platform);
      setShowShareModal(false);
    } catch (error) {
      console.error('Failed to share post:', error);
    }
  }, [post.id, onShare]);

  // Handle video events
  const handleVideoPlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const handleVideoPause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  // Format view count
  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <motion.div
      layout
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow duration-200 ${className}`}
    >
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar
              src={post.user.profileImage}
              alt={post.user.displayName}
              fallback={post.user.displayName.charAt(0).toUpperCase()}
              className="w-10 h-10"
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
          
          <div className="relative" ref={moreMenuRef}>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-gray-400 hover:text-gray-600"
              onClick={() => setShowMoreMenu(!showMoreMenu)}
            >
              <MoreHorizontal className="w-5 h-5" />
            </Button>
            
            {/* More Options Menu */}
            <AnimatePresence>
              {showMoreMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10"
                >
                  <div className="py-2">
                    <button
                      onClick={() => {
                        setShowReportModal(true);
                        setShowMoreMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Flag className="w-4 h-4 text-red-500" />
                      Report Post
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Post Content */}
        <div className="mt-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {post.title}
          </h2>
          {post.description && (
            <p className="text-gray-600 dark:text-gray-300 mb-3 line-clamp-3">
              {post.description}
            </p>
          )}
          
          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.slice(0, 5).map(tag => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-xs cursor-pointer hover:bg-blue-100 hover:text-blue-700 transition-colors"
                >
                  #{tag}
                </Badge>
              ))}
              {post.tags.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{post.tags.length - 5} more
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Video Player */}
      <div className="relative group">
        <video
          ref={videoRef}
          src={post.videoUrl}
          poster={post.thumbnailUrl}
          className="w-full aspect-video object-cover bg-gray-100 dark:bg-gray-900"
          muted={isMuted}
          loop
          playsInline
          onPlay={handleVideoPlay}
          onPause={handleVideoPause}
          onClick={togglePlay}
        />
        
        {/* Video Controls Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center cursor-pointer" onClick={togglePlay}>
          <AnimatePresence>
            {!isPlaying && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="bg-black bg-opacity-50 rounded-full p-4 backdrop-blur-sm"
              >
                <Play className="w-8 h-8 text-white fill-white" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Video Controls */}
        <div className="absolute bottom-4 right-4 flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="bg-black bg-opacity-50 text-white border-none hover:bg-opacity-70 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              toggleMute();
            }}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
        </div>

        {/* View Count */}
        <div className="absolute bottom-4 left-4">
          <div className="bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm flex items-center gap-1">
            <Eye className="w-3 h-3" />
            <span>{formatCount(post.metrics.views)} views</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-6 pt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            {/* Like Button */}
            <Button
              variant="ghost"
              size="sm"
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
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
              </motion.div>
              <span className="font-medium">{formatCount(likesCount)}</span>
            </Button>

            {/* Comment Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-2 text-gray-500 hover:text-blue-500 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="font-medium">{formatCount(commentsCount)}</span>
            </Button>

            {/* Share Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-2 text-gray-500 hover:text-green-500 transition-colors"
            >
              <Share2 className="w-5 h-5" />
              <span className="font-medium">{formatCount(sharesCount)}</span>
            </Button>
          </div>

          {/* Project Link */}
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={() => {
              // Navigate to project page
              window.open(`/projects/${post.project.id}`, '_blank');
            }}
          >
            <ExternalLink className="w-4 h-4" />
            View Project
          </Button>
        </div>

        {/* Comments Section */}
        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="border-t border-gray-200 dark:border-gray-700 pt-4"
            >
              <CommentSection
                postId={post.id}
                onComment={handleComment}
                className="max-h-96 overflow-y-auto"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        onShare={handleShare}
        post={post}
      />

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        contentType="post"
        contentId={post.id}
        reportedUserId={post.user.id}
        reportedUserName={post.user.displayName}
        contentPreview={post.title}
      />
    </motion.div>
  );
};