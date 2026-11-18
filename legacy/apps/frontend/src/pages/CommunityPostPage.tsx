/**
 * Community Post Page Component
 * 
 * Individual post view page with detailed information and comments.
 * Features SEO optimization and social sharing metadata.
 */

import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CommunityPost } from '../components/community/CommunityPost';
import { communityApi } from '../services/api/communityApi';

export const CommunityPostPage: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();

  // Fetch post data for SEO
  const { data: post } = useQuery({
    queryKey: ['community-post-meta', postId],
    queryFn: () => communityApi.getPost(postId!),
    enabled: !!postId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  const pageTitle = post ? `${post.title} - AI Video Studio` : 'Community Post - AI Video Studio';
  const pageDescription = post 
    ? `${post.description || `Amazing AI-generated video by ${post.user.displayName}`} | AI Video Studio Community`
    : 'Discover amazing AI-generated videos from our creative community.';

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="video.other" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        {post && (
          <>
            <meta property="og:image" content={post.thumbnailUrl} />
            <meta property="og:video" content={post.videoUrl} />
            <meta property="og:video:type" content="video/mp4" />
            <meta property="og:video:width" content="1920" />
            <meta property="og:video:height" content="1080" />
            <meta property="og:url" content={`${window.location.origin}/community/posts/${post.id}`} />
          </>
        )}

        {/* Twitter */}
        <meta name="twitter:card" content="player" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        {post && (
          <>
            <meta name="twitter:image" content={post.thumbnailUrl} />
            <meta name="twitter:player" content={post.videoUrl} />
            <meta name="twitter:player:width" content="1920" />
            <meta name="twitter:player:height" content="1080" />
          </>
        )}

        {/* Additional SEO */}
        {post && (
          <>
            <meta name="author" content={post.user.displayName} />
            <meta name="keywords" content={`AI video, ${post.tags.join(', ')}, creative, ${post.user.displayName}`} />
            <link rel="canonical" href={`${window.location.origin}/community/posts/${post.id}`} />
          </>
        )}
      </Helmet>

      <CommunityPost />
    </>
  );
};