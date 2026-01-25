# Community Components

This directory contains all components related to the community feed functionality in the AI Video Studio application.

## Overview

The community system allows users to share their AI-generated videos publicly, engage with other users' content through likes, comments, and shares, and discover trending content through tags and search functionality.

## Components

### CommunityFeed
The main feed component that displays a list of community posts with infinite scroll, real-time updates, and filtering capabilities.

**Features:**
- Instagram-like infinite scroll feed
- Real-time updates for new posts, likes, comments, and shares
- Search functionality across posts, creators, and tags
- Filtering by tags and sorting options
- Responsive masonry-style layout
- Optimistic UI updates for smooth interactions

**Props:**
- `className?: string` - Additional CSS classes

### PostCard
Individual post card component that displays video content with engagement actions.

**Features:**
- Video player with controls
- Like, comment, and share actions
- Real-time engagement metrics
- Optimistic UI updates
- User profile information
- Project linking

**Props:**
- `post: CommunityPost` - Post data object
- `onLike?: (postId: string, isLiked: boolean) => void` - Like callback
- `onComment?: (postId: string, comment: string) => void` - Comment callback
- `onShare?: (postId: string, platform: string) => void` - Share callback
- `className?: string` - Additional CSS classes

### CommunityPost
Full-page view component for individual posts with detailed information and comments.

**Features:**
- Full video player
- Complete comment thread
- Detailed engagement metrics
- SEO optimization with meta tags
- Social sharing metadata
- Creator and project information sidebar

### CommentSection
Threaded comment system with real-time updates and nested replies.

**Features:**
- Nested comment threads (up to 2 levels deep)
- Real-time comment updates
- Optimistic UI for new comments
- Like functionality for comments
- Reply system with mentions
- Smooth animations for new comments

**Props:**
- `postId: string` - Post ID for comments
- `onComment?: (postId: string, comment: string) => Promise<Comment>` - Comment submission callback
- `className?: string` - Additional CSS classes

### ShareModal
Social sharing modal with platform-specific sharing options.

**Features:**
- Multiple social platform support (Twitter, Facebook, LinkedIn, etc.)
- Copy link functionality
- Post preview
- Platform-specific URL generation
- Share tracking and analytics

**Props:**
- `isOpen: boolean` - Modal visibility state
- `onClose: () => void` - Close callback
- `onShare: (platform: string) => void` - Share callback
- `post: CommunityPost` - Post data for sharing

### TrendingTags
Sidebar component displaying trending hashtags with selection functionality.

**Features:**
- Real-time trending tag updates
- Tag selection for filtering
- Show more/less functionality
- Tag usage statistics
- Smooth animations for tag changes

**Props:**
- `onTagSelect?: (tag: string) => void` - Tag selection callback
- `selectedTags?: string[]` - Currently selected tags
- `className?: string` - Additional CSS classes

## Real-Time Features

All community components integrate with the real-time WebSocket system to provide live updates:

- **New Posts**: Automatically appear in feeds
- **Likes**: Real-time like count updates with animations
- **Comments**: Live comment threads with optimistic updates
- **Shares**: Instant share count updates
- **User Presence**: Online/offline status indicators

## API Integration

Components use the `communityApi` service for all backend communication:

```typescript
import { communityApi } from '../../services/api/communityApi';

// Get community feed
const feed = await communityApi.getFeed({
  search: 'query',
  tags: ['ai', 'video'],
  sortBy: 'likes',
  limit: 20,
  offset: 0,
});

// Like a post
const result = await communityApi.likePost(postId);

// Add a comment
const comment = await communityApi.commentOnPost(postId, {
  content: 'Great video!',
  parentCommentId: 'optional-parent-id',
});
```

## Styling

All components use Tailwind CSS with the custom design system:

- **Colors**: Consistent with the app's blue/purple gradient theme
- **Typography**: Hierarchical text sizing and weights
- **Spacing**: Consistent padding and margins using design tokens
- **Animations**: Framer Motion for smooth transitions and micro-interactions
- **Dark Mode**: Full dark mode support with automatic theme switching

## Performance Optimizations

- **Infinite Scroll**: Efficient loading of large post lists
- **Image Lazy Loading**: Videos and thumbnails load on demand
- **Virtual Scrolling**: For very large comment threads
- **Optimistic Updates**: Immediate UI feedback before server confirmation
- **Caching**: React Query for intelligent data caching and synchronization

## Accessibility

- **Keyboard Navigation**: Full keyboard support for all interactions
- **Screen Reader Support**: Semantic HTML and ARIA labels
- **Focus Management**: Proper focus handling in modals and dropdowns
- **Color Contrast**: WCAG 2.1 AA compliant color schemes
- **Alternative Text**: Descriptive alt text for all images and videos

## Testing

Components include comprehensive test coverage:

- **Unit Tests**: Individual component behavior and props
- **Integration Tests**: Component interactions and API calls
- **Accessibility Tests**: Screen reader and keyboard navigation
- **Visual Regression Tests**: UI consistency across updates

Run tests with:
```bash
npm test -- community
```

## Usage Examples

### Basic Community Feed
```tsx
import { CommunityFeed } from '../components/community';

export const CommunityPage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <CommunityFeed />
    </div>
  );
};
```

### Individual Post View
```tsx
import { CommunityPost } from '../components/community';

export const PostPage = () => {
  return <CommunityPost />;
};
```

### Custom Post Card
```tsx
import { PostCard } from '../components/community';

export const CustomFeed = () => {
  const handleLike = (postId: string, isLiked: boolean) => {
    console.log(`Post ${postId} ${isLiked ? 'liked' : 'unliked'}`);
  };

  return (
    <div className="space-y-6">
      {posts.map(post => (
        <PostCard
          key={post.id}
          post={post}
          onLike={handleLike}
          className="max-w-2xl mx-auto"
        />
      ))}
    </div>
  );
};
```

## Future Enhancements

- **Video Reactions**: Emoji reactions beyond likes
- **Advanced Filtering**: Date ranges, video duration, quality filters
- **User Following**: Follow/unfollow system for creators
- **Collections**: User-curated post collections
- **Advanced Analytics**: Detailed engagement metrics for creators
- **Content Moderation**: AI-powered content filtering and reporting
- **Live Streaming**: Real-time video streaming capabilities