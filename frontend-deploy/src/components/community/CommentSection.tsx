/**
 * Comment Section Component
 * 
 * Threaded comments with real-time updates, optimistic UI, and smooth animations.
 * Features nested replies, like functionality, and professional design.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { 
  MessageCircle, 
  Reply, 
  Heart, 
  Send, 
  MoreHorizontal,
  Calendar
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Avatar } from '../ui/avatar';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useAuth0 } from '@auth0/auth0-react';
import { communityApi } from '../../services/api/communityApi';

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    displayName: string;
    profileImage?: string;
  };
  replies: Comment[];
  likes?: number;
  isLikedByUser?: boolean;
}

interface CommentSectionProps {
  postId: string;
  onComment?: (postId: string, comment: string) => Promise<Comment>;
  className?: string;
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  postId,
  onComment,
  className = '',
}) => {
  const { user, isAuthenticated } = useAuth0();
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [optimisticComments, setOptimisticComments] = useState<Comment[]>([]);

  // Fetch comments
  const {
    data: commentsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['post-comments', postId],
    queryFn: () => communityApi.getPostComments(postId),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const comments = commentsData?.comments || [];

  // Handle new comment submission
  const handleSubmitComment = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim() || !isAuthenticated || !user || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    // Create optimistic comment
    const optimisticComment: Comment = {
      id: `temp-${Date.now()}`,
      content: newComment.trim(),
      createdAt: new Date().toISOString(),
      user: {
        id: user.sub || '',
        displayName: user.name || user.email || 'Anonymous',
        profileImage: user.picture,
      },
      replies: [],
      likes: 0,
      isLikedByUser: false,
    };

    // Add optimistic comment
    setOptimisticComments(prev => [optimisticComment, ...prev]);
    setNewComment('');

    try {
      const comment = await onComment?.(postId, newComment.trim());
      
      if (comment) {
        // Remove optimistic comment and refetch to get real data
        setOptimisticComments(prev => prev.filter(c => c.id !== optimisticComment.id));
        refetch();
      }
    } catch (error) {
      // Remove optimistic comment on error
      setOptimisticComments(prev => prev.filter(c => c.id !== optimisticComment.id));
      console.error('Failed to submit comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [newComment, isAuthenticated, user, isSubmitting, onComment, postId, refetch]);

  // Handle reply submission
  const handleSubmitReply = useCallback(async (parentCommentId: string) => {
    if (!replyContent.trim() || !isAuthenticated || !user || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onComment?.(postId, replyContent.trim());
      setReplyContent('');
      setReplyingTo(null);
      refetch();
    } catch (error) {
      console.error('Failed to submit reply:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [replyContent, isAuthenticated, user, isSubmitting, onComment, postId, refetch]);

  // Combine real comments with optimistic comments
  const allComments = [...optimisticComments, ...comments];

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex justify-center py-4">
          <LoadingSpinner size="sm" />
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Comment Input */}
      {isAuthenticated ? (
        <form onSubmit={handleSubmitComment} className="flex gap-3">
          <Avatar
            src={user?.picture}
            alt={user?.name || 'User'}
            fallback={(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
            className="w-8 h-8 flex-shrink-0"
          />
          <div className="flex-1 flex gap-2">
            <Input
              type="text"
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1"
              disabled={isSubmitting}
            />
            <Button
              type="submit"
              size="sm"
              disabled={!newComment.trim() || isSubmitting}
              className="flex items-center gap-2"
            >
              {isSubmitting ? (
                <LoadingSpinner size="xs" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </form>
      ) : (
        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
          <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Sign in to join the conversation</p>
        </div>
      )}

      {/* Comments List */}
      {allComments.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No comments yet</p>
          <p className="text-sm">Be the first to share your thoughts!</p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {allComments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                postId={postId}
                isOptimistic={comment.id.startsWith('temp-')}
                onReply={(commentId) => setReplyingTo(commentId)}
                replyingTo={replyingTo}
                replyContent={replyContent}
                onReplyContentChange={setReplyContent}
                onSubmitReply={handleSubmitReply}
                isSubmitting={isSubmitting}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

// Individual Comment Component
interface CommentItemProps {
  comment: Comment;
  postId: string;
  isOptimistic?: boolean;
  onReply: (commentId: string) => void;
  replyingTo: string | null;
  replyContent: string;
  onReplyContentChange: (content: string) => void;
  onSubmitReply: (commentId: string) => void;
  isSubmitting: boolean;
  depth?: number;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  postId,
  isOptimistic = false,
  onReply,
  replyingTo,
  replyContent,
  onReplyContentChange,
  onSubmitReply,
  isSubmitting,
  depth = 0,
}) => {
  const { user, isAuthenticated } = useAuth0();
  const [isLiked, setIsLiked] = useState(comment.isLikedByUser || false);
  const [likesCount, setLikesCount] = useState(comment.likes || 0);

  const handleLike = useCallback(async () => {
    if (!isAuthenticated) return;

    // Optimistic update
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);

    try {
      // In a real app, you'd have a comment like API
      // await communityApi.likeComment(comment.id);
    } catch (error) {
      // Rollback on error
      setIsLiked(isLiked);
      setLikesCount(comment.likes || 0);
      console.error('Failed to like comment:', error);
    }
  }, [isAuthenticated, isLiked, comment.likes]);

  const handleReplySubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    onSubmitReply(comment.id);
  }, [onSubmitReply, comment.id]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`${depth > 0 ? 'ml-8 pl-4 border-l-2 border-gray-200 dark:border-gray-700' : ''}`}
    >
      <div className="flex gap-3">
        <Avatar
          src={comment.user.profileImage}
          alt={comment.user.displayName}
          fallback={comment.user.displayName.charAt(0).toUpperCase()}
          className="w-8 h-8 flex-shrink-0"
        />
        
        <div className="flex-1 min-w-0">
          {/* Comment Header */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm text-gray-900 dark:text-white">
              {comment.user.displayName}
            </span>
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Calendar className="w-3 h-3" />
              <span>{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
            </div>
            {isOptimistic && (
              <span className="text-xs text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">
                Sending...
              </span>
            )}
          </div>

          {/* Comment Content */}
          <p className="text-gray-700 dark:text-gray-300 text-sm mb-2 break-words">
            {comment.content}
          </p>

          {/* Comment Actions */}
          <div className="flex items-center gap-4 text-xs">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              disabled={!isAuthenticated || isOptimistic}
              className={`h-auto p-1 text-xs ${
                isLiked 
                  ? 'text-red-500 hover:text-red-600' 
                  : 'text-gray-500 hover:text-red-500'
              }`}
            >
              <Heart className={`w-3 h-3 mr-1 ${isLiked ? 'fill-current' : ''}`} />
              {likesCount > 0 && <span>{likesCount}</span>}
            </Button>

            {isAuthenticated && !isOptimistic && depth < 2 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onReply(comment.id)}
                className="h-auto p-1 text-xs text-gray-500 hover:text-blue-500"
              >
                <Reply className="w-3 h-3 mr-1" />
                Reply
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 text-xs text-gray-400 hover:text-gray-600"
            >
              <MoreHorizontal className="w-3 h-3" />
            </Button>
          </div>

          {/* Reply Input */}
          {replyingTo === comment.id && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleReplySubmit}
              className="mt-3 flex gap-2"
            >
              <Input
                type="text"
                placeholder={`Reply to ${comment.user.displayName}...`}
                value={replyContent}
                onChange={(e) => onReplyContentChange(e.target.value)}
                className="flex-1 text-sm"
                disabled={isSubmitting}
                autoFocus
              />
              <Button
                type="submit"
                size="sm"
                disabled={!replyContent.trim() || isSubmitting}
                className="text-xs"
              >
                {isSubmitting ? (
                  <LoadingSpinner size="xs" />
                ) : (
                  <Send className="w-3 h-3" />
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onReply('')}
                className="text-xs"
              >
                Cancel
              </Button>
            </motion.form>
          )}

          {/* Nested Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 space-y-3">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  postId={postId}
                  onReply={onReply}
                  replyingTo={replyingTo}
                  replyContent={replyContent}
                  onReplyContentChange={onReplyContentChange}
                  onSubmitReply={onSubmitReply}
                  isSubmitting={isSubmitting}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};