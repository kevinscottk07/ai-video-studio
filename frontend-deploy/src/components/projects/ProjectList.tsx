import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Plus, 
  Grid3X3, 
  List, 
  SortAsc, 
  SortDesc,
  RefreshCw,
  Folder,
  FolderOpen,
  Sparkles,
  TrendingUp,
  Eye
} from 'lucide-react';
import { ProjectCard } from './ProjectCard';
import { CreateProjectModal } from './CreateProjectModal';
import { ShareProjectModal } from './ShareProjectModal';
import { useProjects } from '../../hooks/useProjects';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { useRealTime } from '../../hooks/useRealTime';
import { Project, ProjectFilters } from '../../services/api/projectApi';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Badge } from '../ui/badge';
import { Masonry, MasonryGrid } from '../ui/masonry';
import { Skeleton, ProjectCardSkeleton, StatsCardSkeleton, SearchSkeleton } from '../ui/skeleton';
import { useDebounce } from '../../hooks/use-debounce';
import { useToast } from '../../providers/ToastProvider';

interface ProjectListProps {
  className?: string;
}

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'generating', label: 'Generating' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
];

const sortOptions = [
  { value: 'updatedAt', label: 'Last Modified' },
  { value: 'createdAt', label: 'Date Created' },
  { value: 'title', label: 'Title' },
];

const privacyOptions = [
  { value: '', label: 'All Projects' },
  { value: 'true', label: 'Public Only' },
  { value: 'false', label: 'Private Only' },
];

export const ProjectList: React.FC<ProjectListProps> = ({ className = '' }) => {
  const toast = useToast();
  const [viewMode, setViewMode] = useState<'masonry' | 'grid' | 'list'>('masonry');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<ProjectFilters>({
    sortBy: 'updatedAt',
    sortOrder: 'desc',
    limit: 20,
  });
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const debouncedSearch = useDebounce(searchQuery, 300);

  const {
    projects,
    loading,
    error,
    total,
    hasMore,
    stats,
    createProject,
    updateProject,
    deleteProject,
    shareProject,
    fetchProjects,
    fetchMoreProjects,
  } = useProjects();

  // Real-time updates
  const { isConnected } = useRealTime();

  // Infinite scroll
  const { loadMoreRef } = useInfiniteScroll(
    fetchMoreProjects,
    {
      hasMore,
      loading,
      enabled: true,
      threshold: 0.1,
      rootMargin: '200px',
    }
  );

  // Initial load
  useEffect(() => {
    const loadInitialData = async () => {
      setIsInitialLoading(true);
      await fetchProjects(filters);
      setIsInitialLoading(false);
    };
    loadInitialData();
  }, []);

  // Update filters when search changes
  useEffect(() => {
    const newFilters = {
      ...filters,
      search: debouncedSearch || undefined,
      offset: 0, // Reset pagination
    };
    fetchProjects(newFilters);
  }, [debouncedSearch]);

  const handleFilterChange = (key: keyof ProjectFilters, value: any) => {
    const newFilters = {
      ...filters,
      [key]: value === '' ? undefined : value,
      offset: 0, // Reset pagination
    };
    setFilters(newFilters);
    fetchProjects(newFilters);
  };

  const handleSortOrderToggle = () => {
    const newOrder = filters.sortOrder === 'desc' ? 'asc' : 'desc';
    handleFilterChange('sortOrder', newOrder);
  };

  const handleCreateProject = async (data: any) => {
    const project = await createProject(data);
    if (project) {
      toast.success(`"${project.title}" is ready for your creativity!`, 'Project Created');
    }
  };

  const handleEditProject = (project: Project) => {
    // Navigate to project detail page or open edit modal
    console.log('Edit project:', project.id);
  };

  const handleShareProject = (project: Project) => {
    setSelectedProject(project);
    setShowShareModal(true);
  };

  const handleShareSubmit = async (settings: any) => {
    if (selectedProject) {
      const updatedProject = await shareProject(selectedProject.id, settings);
      if (updatedProject) {
        toast.success(
          settings.isPublic 
            ? 'Your project is now public!' 
            : 'Your project is now private.',
          'Sharing Updated'
        );
      }
      setShowShareModal(false);
      setSelectedProject(null);
    }
  };

  const handleViewProject = (project: Project) => {
    // Navigate to project detail page
    console.log('View project:', project.id);
  };

  const handleDeleteProject = async (projectId: string) => {
    const success = await deleteProject(projectId);
    if (success) {
      toast.success('Project has been permanently removed.', 'Project Deleted');
    }
  };

  const handleRefresh = () => {
    fetchProjects(filters);
  };

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Premium Header with real-time indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              My Projects
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-gray-600 dark:text-gray-400">
                {total > 0 ? `${total} project${total !== 1 ? 's' : ''}` : 'No projects yet'}
              </p>
              {isConnected && (
                <Badge variant="success" className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Live
                </Badge>
              )}
            </div>
          </div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Sparkles className="w-8 h-8 text-yellow-500" />
          </motion.div>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200"
          size="lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Project
        </Button>
      </div>

      {/* Premium Stats Dashboard */}
      {isInitialLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }, (_, i) => (
            <StatsCardSkeleton key={i} />
          ))}
        </div>
      ) : stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-2 md:grid-cols-5 gap-4"
        >
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800"
          >
            <div className="flex items-center gap-3 mb-2">
              <Folder className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Total</span>
            </div>
            <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
              {stats.totalProjects}
            </p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-xl p-6 border border-yellow-200 dark:border-yellow-800"
          >
            <div className="flex items-center gap-3 mb-2">
              <FolderOpen className="w-5 h-5 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Draft</span>
            </div>
            <p className="text-3xl font-bold text-yellow-900 dark:text-yellow-100">
              {stats.draftProjects}
            </p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-6 border border-green-200 dark:border-green-800"
          >
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-700 dark:text-green-300">Completed</span>
            </div>
            <p className="text-3xl font-bold text-green-900 dark:text-green-100">
              {stats.completedProjects}
            </p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800"
          >
            <div className="flex items-center gap-3 mb-2">
              <Eye className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Public</span>
            </div>
            <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
              {stats.publicProjects}
            </p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20 rounded-xl p-6 border border-pink-200 dark:border-pink-800"
          >
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="w-5 h-5 text-pink-600" />
              <span className="text-sm font-medium text-pink-700 dark:text-pink-300">Assets</span>
            </div>
            <p className="text-3xl font-bold text-pink-900 dark:text-pink-100">
              {stats.totalAssets}
            </p>
          </motion.div>
        </motion.div>
      )}

      {/* Premium Filters and Search */}
      {isInitialLoading ? (
        <SearchSkeleton />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
        >
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            {/* Enhanced Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className="pl-10 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400"
              />
            </div>

            {/* Premium Filters */}
            <div className="flex gap-2">
              <Select
                value={filters.status || ''}
                onValueChange={(value) => handleFilterChange('status', value)}
                options={statusOptions}
                placeholder="Status"
              />
              <Select
                value={filters.isPublic?.toString() || ''}
                onValueChange={(value) => handleFilterChange('isPublic', value === 'true' ? true : value === 'false' ? false : undefined)}
                options={privacyOptions}
                placeholder="Privacy"
              />
              <Select
                value={filters.sortBy || 'updatedAt'}
                onValueChange={(value) => handleFilterChange('sortBy', value)}
                options={sortOptions}
                placeholder="Sort by"
              />
            </div>
          </div>

          {/* Premium View Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSortOrderToggle}
              className="flex items-center gap-1"
            >
              {filters.sortOrder === 'desc' ? (
                <SortDesc className="w-4 h-4" />
              ) : (
                <SortAsc className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg">
              <Button
                variant={viewMode === 'masonry' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('masonry')}
                className="rounded-r-none"
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-none"
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Active Filters */}
      {(filters.status || filters.isPublic !== undefined || searchQuery) && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-600 dark:text-gray-400">Active filters:</span>
          {searchQuery && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Search: "{searchQuery}"
              <button
                onClick={() => setSearchQuery('')}
                className="ml-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full p-0.5"
              >
                ×
              </button>
            </Badge>
          )}
          {filters.status && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Status: {filters.status}
              <button
                onClick={() => handleFilterChange('status', '')}
                className="ml-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full p-0.5"
              >
                ×
              </button>
            </Badge>
          )}
          {filters.isPublic !== undefined && (
            <Badge variant="secondary" className="flex items-center gap-1">
              {filters.isPublic ? 'Public' : 'Private'} only
              <button
                onClick={() => handleFilterChange('isPublic', undefined)}
                className="ml-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full p-0.5"
              >
                ×
              </button>
            </Badge>
          )}
        </div>
      )}

      {/* Premium Project Gallery */}
      {isInitialLoading ? (
        <div className="space-y-6">
          {viewMode === 'masonry' ? (
            <MasonryGrid>
              {Array.from({ length: 12 }, (_, i) => (
                <ProjectCardSkeleton key={`skeleton-${i}`} />
              ))}
            </MasonryGrid>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 12 }, (_, i) => (
                <ProjectCardSkeleton key={`skeleton-${i}`} />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {Array.from({ length: 8 }, (_, i) => (
                <ProjectCardSkeleton key={`skeleton-${i}`} />
              ))}
            </div>
          )}
        </div>
      ) : error ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <Button onClick={handleRefresh} variant="outline">
            Try Again
          </Button>
        </motion.div>
      ) : projects.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <Folder className="w-20 h-20 text-gray-400 mx-auto mb-6" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
            No projects found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
            {searchQuery || filters.status || filters.isPublic !== undefined
              ? 'Try adjusting your filters or search terms to find what you\'re looking for.'
              : 'Create your first project to get started with AI video generation and bring your ideas to life.'
            }
          </p>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200"
            size="lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Your First Project
          </Button>
        </motion.div>
      ) : (
        <div className="space-y-8">
          <AnimatePresence mode="wait">
            {viewMode === 'masonry' ? (
              <motion.div
                key="masonry"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Masonry
                  columns={{
                    default: 1,
                    sm: 2,
                    md: 3,
                    lg: 4,
                    xl: 5,
                    '2xl': 6,
                  }}
                  gap={24}
                >
                  {projects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onEdit={handleEditProject}
                      onDelete={handleDeleteProject}
                      onShare={handleShareProject}
                      onView={handleViewProject}
                    />
                  ))}
                </Masonry>
              </motion.div>
            ) : viewMode === 'grid' ? (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              >
                {projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onEdit={handleEditProject}
                    onDelete={handleDeleteProject}
                    onShare={handleShareProject}
                    onView={handleViewProject}
                  />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                {projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onEdit={handleEditProject}
                    onDelete={handleDeleteProject}
                    onShare={handleShareProject}
                    onView={handleViewProject}
                    className="w-full"
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Infinite Scroll Trigger */}
          {hasMore && (
            <div ref={loadMoreRef} className="flex justify-center py-8">
              {loading ? (
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"
                  />
                  <span className="text-gray-600 dark:text-gray-400">Loading more projects...</span>
                </div>
              ) : (
                <Button
                  onClick={fetchMoreProjects}
                  variant="outline"
                  className="hover:bg-blue-50 dark:hover:bg-blue-900/20"
                >
                  Load More Projects
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateProject}
        loading={loading}
      />

      <ShareProjectModal
        isOpen={showShareModal}
        onClose={() => {
          setShowShareModal(false);
          setSelectedProject(null);
        }}
        project={selectedProject}
        onSubmit={handleShareSubmit}
        loading={loading}
      />
    </div>
  );
};