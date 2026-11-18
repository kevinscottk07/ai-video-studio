/**
 * Demo Mode Configuration
 * 
 * Provides mock data and fallback behavior when backend is not available
 */

export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true' || !import.meta.env.VITE_API_URL;

export const mockUser = {
  id: 'demo-user-1',
  email: 'demo@aivideostudio.com',
  displayName: 'Demo User',
  profileImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
  language: 'en',
  timezone: 'UTC',
  role: 'user',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const mockProjects = [
  {
    id: 'demo-project-1',
    title: 'Welcome to AI Video Studio',
    description: 'A demo project showcasing the capabilities of our AI video generation platform.',
    thumbnail: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=400&h=225&fit=crop',
    status: 'completed',
    createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    updatedAt: new Date().toISOString(),
    userId: 'demo-user-1',
    settings: {
      duration: 30,
      resolution: '1080p',
      style: 'cinematic',
    },
  },
  {
    id: 'demo-project-2',
    title: 'Product Showcase Video',
    description: 'An AI-generated product demonstration video with smooth transitions.',
    thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=225&fit=crop',
    status: 'processing',
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    updatedAt: new Date().toISOString(),
    userId: 'demo-user-1',
    settings: {
      duration: 60,
      resolution: '4K',
      style: 'modern',
    },
  },
];

export const mockCredits = {
  balance: 150,
  used: 50,
  total: 200,
  history: [
    {
      id: 'credit-1',
      amount: -10,
      description: 'Video generation - Welcome to AI Video Studio',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'credit-2',
      amount: 100,
      description: 'Credit purchase - Starter Pack',
      createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    },
  ],
};

export const mockSubscription = {
  id: 'demo-sub-1',
  planId: 'starter',
  status: 'active',
  currentPeriodStart: new Date(Date.now() - 2592000000).toISOString(), // 30 days ago
  currentPeriodEnd: new Date(Date.now() + 2592000000).toISOString(), // 30 days from now
  cancelAtPeriodEnd: false,
};

export const mockCommunityPosts = [
  {
    id: 'post-1',
    title: 'Amazing AI-Generated Landscape',
    description: 'Created this stunning landscape video using just a text prompt!',
    thumbnail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=225&fit=crop',
    author: {
      id: 'user-2',
      displayName: 'Creative Artist',
      profileImage: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    },
    likes: 42,
    comments: 8,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'post-2',
    title: 'Product Demo in 60 Seconds',
    description: 'Quick product showcase generated entirely with AI. The future is here!',
    thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=225&fit=crop',
    author: {
      id: 'user-3',
      displayName: 'Tech Enthusiast',
      profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    },
    likes: 28,
    comments: 5,
    createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
  },
];

export const demoApiResponses = {
  '/auth/me': { data: mockUser },
  '/projects': { data: mockProjects },
  '/credits/balance': { data: mockCredits },
  '/subscriptions/current': { data: mockSubscription },
  '/community/posts': { data: mockCommunityPosts },
};