import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Play, 
  Edit3, 
  Share2, 
  Trash2, 
  Eye, 
  EyeOff, 
  Clock, 
  Image as ImageIcon,
  MoreVertical,
  Calendar,
  User
} from 'lucide-react';
import { Project } from '../../services/api/projectApi';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Dropdown } from '../ui/dropdown';
import { formatDistanceToNow } from 'date-fns';

interface ProjectCardProps {
  project: Project;
  onEdit?: (project: Project) => void;
  onDelete?: (projectId: string) => void;
  onShare?: (project: Project) => void;
  onView?: (project: Project) => void;
  className?: string;
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  generating: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const statusIcons = {
  draft: Edit3,
  generating: Clock,
  completed: Play,
  failed: Trash2,
};

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onEdit,
  onDelete,
  onShare,
  onView,
  className = '',
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const StatusIcon = statusIcons[project.status];

  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDelete?.(project.id);
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
      // Auto-hide confirmation after 3 seconds
      setTimeout(() => setShowDeleteConfirm(false), 3000);
    }
  };

  const dropdownItems = [
    {
      label: 'View Details',
      icon: Eye,
      onClick: () => onView?.(project),
    },
    {
      label: 'Edit Project',
      icon: Edit3,
      onClick: () => onEdit?.(project),
    },
    {
      label: project.isPublic ? 'Make Private' : 'Share Public',
      icon: project.isPublic ? EyeOff : Share2,
      onClick: () => onShare?.(project),
    },
    {
      type: 'separator' as const,
    },
    {
      label: showDeleteConfirm ? 'Confirm Delete' : 'Delete Project',
      icon: Trash2,
      onClick: handleDelete,
      className: showDeleteConfirm 
        ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20' 
        : 'text-red-600 dark:text-red-400',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className={className}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-200">
        {/* Thumbnail/Preview */}
        <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 relative overflow-hidden">
          {project.mediaAssets.length > 0 ? (
            <img
              src={project.mediaAssets[0].thumbnailUrl || project.mediaAssets[0].url}
              alt={project.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-12 h-12 text-gray-400" />
            </div>
          )}
          
          {/* Overlay with play button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            className="absolute inset-0 bg-black/50 flex items-center justify-center"
          >
            <Button
              size="lg"
              className="rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30"
              onClick={() => onView?.(project)}
            >
              <Play className="w-6 h-6 text-white" />
            </Button>
          </motion.div>

          {/* Status badge */}
          <div className="absolute top-3 left-3">
            <Badge className={`${statusColors[project.status]} flex items-center gap-1`}>
              <StatusIcon className="w-3 h-3" />
              {project.status}
            </Badge>
          </div>

          {/* Privacy indicator */}
          <div className="absolute top-3 right-3">
            {project.isPublic ? (
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                <Eye className="w-3 h-3 mr-1" />
                Public
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                <EyeOff className="w-3 h-3 mr-1" />
                Private
              </Badge>
            )}
          </div>

          {/* Actions dropdown */}
          <div className="absolute bottom-3 right-3">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: isHovered ? 1 : 0, scale: isHovered ? 1 : 0.8 }}
              transition={{ duration: 0.2 }}
            >
              <Dropdown
                trigger={
                  <Button
                    size="sm"
                    variant="secondary"
                    className="rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 border-0"
                  >
                    <MoreVertical className="w-4 h-4 text-white" />
                  </Button>
                }
                items={dropdownItems}
                align="end"
              />
            </motion.div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white line-clamp-1">
              {project.title}
            </h3>
          </div>

          {project.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
              {project.description}
            </p>
          )}

          {/* Project metadata */}
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <ImageIcon className="w-3 h-3" />
                {project._count.mediaAssets} assets
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {project.settings.duration}s
              </span>
            </div>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
            </span>
          </div>

          {/* Creator info */}
          <div className="flex items-center gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              {project.user.profileImage ? (
                <img
                  src={project.user.profileImage}
                  alt={project.user.displayName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User className="w-3 h-3 text-white" />
              )}
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {project.user.displayName}
            </span>
          </div>

          {/* Community metrics (if public) */}
          {project.isPublic && (
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {project.communityMetrics.views} views
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {project.communityMetrics.likes} likes
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {project.communityMetrics.comments} comments
              </span>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
};