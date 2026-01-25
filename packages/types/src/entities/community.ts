export interface CommunityPost {
  id: string;
  projectId: string;
  userId: string;
  user: {
    displayName: string;
    profileImage?: string;
  };
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl: string;
  tags: string[];
  metrics: CommunityMetrics;
  isPublic: boolean;
  allowComments: boolean;
  allowDownloads: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  user: {
    displayName: string;
    profileImage?: string;
  };
  content: string;
  parentCommentId?: string; // For nested comments
  likes: number;
  isLikedByUser: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Like {
  id: string;
  postId: string;
  userId: string;
  createdAt: Date;
}

export interface Share {
  id: string;
  postId: string;
  userId: string;
  platform: 'twitter' | 'facebook' | 'linkedin' | 'reddit' | 'direct_link';
  createdAt: Date;
}

export interface CommunityFeedFilters {
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  sortBy: 'recent' | 'popular' | 'trending';
  resolution?: VideoResolution;
  duration?: {
    min: number;
    max: number;
  };
}

export interface TrendingContent {
  period: '24h' | '7d' | '30d';
  posts: CommunityPost[];
  tags: {
    name: string;
    count: number;
    growth: number; // percentage growth
  }[];
  creators: {
    userId: string;
    displayName: string;
    profileImage?: string;
    postCount: number;
    totalViews: number;
  }[];
}