import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  HardDrive, 
  Download, 
  Trash2, 
  Eye, 
  Lock, 
  Calendar,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  RefreshCw
} from 'lucide-react';
import { Button } from '../ui/button';
import { Modal } from '../ui/modal';
import { useToast } from '../../providers/ToastProvider';

interface StorageFile {
  key: string;
  size: number;
  lastModified: Date;
  contentType: string;
  filename?: string;
}

interface StorageMetrics {
  totalSize: number;
  fileCount: number;
  lastAccessed: Date;
  encryption: string;
}

interface StorageManagerProps {
  projectId?: string;
  showMetrics?: boolean;
}

export const StorageManager: React.FC<StorageManagerProps> = ({
  projectId,
  showMetrics = true,
}) => {
  const toast = useToast();
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [metrics, setMetrics] = useState<StorageMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [continuationToken, setContinuationToken] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    loadFiles();
    if (showMetrics) {
      loadMetrics();
    }
  }, [projectId]);

  const loadFiles = async (token?: string) => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (projectId) params.append('projectId', projectId);
      if (token) params.append('continuationToken', token);
      params.append('maxKeys', '50');

      const response = await fetch(`/api/v1/storage/files?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const newFiles = data.data.files.map((file: any) => ({
          ...file,
          lastModified: new Date(file.lastModified),
          filename: extractFilename(file.key),
        }));

        if (token) {
          setFiles(prev => [...prev, ...newFiles]);
        } else {
          setFiles(newFiles);
        }

        setContinuationToken(data.data.nextContinuationToken);
        setHasMore(data.data.isTruncated);
      } else {
        throw new Error('Failed to load files');
      }
    } catch (error) {
      console.error('Error loading files:', error);
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    try {
      const response = await fetch('/api/v1/storage/metrics', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMetrics({
          ...data.data.metrics,
          lastAccessed: new Date(data.data.metrics.lastAccessed),
        });
      }
    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  };

  const extractFilename = (key: string): string => {
    const parts = key.split('/');
    const filename = parts[parts.length - 1];
    // Remove timestamp and random prefix
    return filename.replace(/^\d+-[a-f0-9]+-/, '');
  };

  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith('image/')) return <Image className="h-5 w-5 text-blue-600" />;
    if (contentType.startsWith('video/')) return <Video className="h-5 w-5 text-purple-600" />;
    if (contentType.startsWith('audio/')) return <Music className="h-5 w-5 text-green-600" />;
    if (contentType.includes('pdf')) return <FileText className="h-5 w-5 text-red-600" />;
    return <Archive className="h-5 w-5 text-gray-600" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const handleFileSelect = (key: string, selected: boolean) => {
    const newSelected = new Set(selectedFiles);
    if (selected) {
      newSelected.add(key);
    } else {
      newSelected.delete(key);
    }
    setSelectedFiles(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map(f => f.key)));
    }
  };

  const handleDownload = async (key: string, filename: string) => {
    try {
      const response = await fetch(`/api/v1/storage/download?key=${encodeURIComponent(key)}&download=true`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // Create temporary link to download
        const link = document.createElement('a');
        link.href = data.data.downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success('Download started');
      } else {
        throw new Error('Failed to generate download URL');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  const handlePreview = async (key: string) => {
    try {
      const response = await fetch(`/api/v1/storage/download?key=${encodeURIComponent(key)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        window.open(data.data.downloadUrl, '_blank');
      } else {
        throw new Error('Failed to generate preview URL');
      }
    } catch (error) {
      console.error('Error previewing file:', error);
      toast.error('Failed to preview file');
    }
  };

  const handleDeleteSelected = async () => {
    try {
      const deletePromises = Array.from(selectedFiles).map(key =>
        fetch('/api/v1/storage/file', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ key })
        })
      );

      await Promise.all(deletePromises);

      // Remove deleted files from state
      setFiles(prev => prev.filter(f => !selectedFiles.has(f.key)));
      setSelectedFiles(new Set());
      setShowDeleteModal(false);

      toast.success(`${selectedFiles.size} files deleted successfully`);

      // Reload metrics
      if (showMetrics) {
        loadMetrics();
      }
    } catch (error) {
      console.error('Error deleting files:', error);
      toast.error('Failed to delete some files');
    }
  };

  const loadMore = () => {
    if (continuationToken && !loading) {
      loadFiles(continuationToken);
    }
  };

  return (
    <div className="space-y-6">
      {/* Storage Metrics */}
      {showMetrics && metrics && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <HardDrive className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Storage Usage
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {formatFileSize(metrics.totalSize)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total Used
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics.fileCount}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Files
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {metrics.encryption}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Encryption
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {formatDate(metrics.lastAccessed)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Last Access
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* File Management */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Files {projectId && `(Project)`}
            </h2>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadFiles()}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {selectedFiles.size > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteModal(true)}
                  className="text-red-600 border-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete ({selectedFiles.size})
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="p-6">
          {loading && files.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-12">
              <HardDrive className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                No files found. Upload some files to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Select All */}
              <div className="flex items-center gap-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                <input
                  type="checkbox"
                  checked={selectedFiles.size === files.length && files.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Select All ({files.length} files)
                </span>
              </div>

              {/* File List */}
              <div className="space-y-2">
                {files.map((file) => (
                  <div
                    key={file.key}
                    className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedFiles.has(file.key)}
                      onChange={(e) => handleFileSelect(file.key, e.target.checked)}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />

                    {getFileIcon(file.contentType)}

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {file.filename}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <span>{formatFileSize(file.size)}</span>
                        <span>•</span>
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(file.lastModified)}</span>
                        <span>•</span>
                        <Lock className="h-3 w-3" />
                        <span>Encrypted</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreview(file.key)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(file.key, file.filename || 'download')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Load More */}
              {hasMore && (
                <div className="text-center pt-4">
                  <Button
                    variant="outline"
                    onClick={loadMore}
                    disabled={loading}
                  >
                    {loading ? 'Loading...' : 'Load More'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Files"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <Trash2 className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-900 dark:text-red-100">
                Permanent Deletion
              </h3>
              <p className="text-sm text-red-700 dark:text-red-200 mt-1">
                This will permanently delete {selectedFiles.size} selected file(s). 
                This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteSelected}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Files
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};