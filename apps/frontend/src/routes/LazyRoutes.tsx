/**
 * Lazy-loaded route components for optimal code splitting
 */

import { createLazyRoute } from '../utils/lazyLoading';

// Lazy load page components
export const LazyDashboardPage = createLazyRoute(
  () => import('../pages/DashboardPage'),
  'dashboard'
);

export const LazyProjectsPage = createLazyRoute(
  () => import('../pages/ProjectsPage'),
  'projects'
);

export const LazyProjectDetailPage = createLazyRoute(
  () => import('../pages/ProjectDetailPage'),
  'project-detail'
);

export const LazyCommunityPage = createLazyRoute(
  () => import('../pages/CommunityPage'),
  'community'
);

export const LazySettingsPage = createLazyRoute(
  () => import('../pages/SettingsPage'),
  'settings'
);

export const LazyAdminPage = createLazyRoute(
  () => import('../pages/admin/AdminPage'),
  'admin'
);

export const LazyBillingPage = createLazyRoute(
  () => import('../pages/BillingPage'),
  'billing'
);

export const LazyCreditsPage = createLazyRoute(
  () => import('../pages/CreditsPage'),
  'credits'
);

export const LazyPrivacyPage = createLazyRoute(
  () => import('../pages/PrivacyPage'),
  'privacy'
);

// Preload critical routes
if (typeof window !== 'undefined') {
  // Preload dashboard after a short delay
  setTimeout(() => {
    import('../pages/DashboardPage').catch(() => {});
  }, 2000);

  // Preload projects page for authenticated users
  setTimeout(() => {
    import('../pages/ProjectsPage').catch(() => {});
  }, 3000);
}