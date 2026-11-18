/**
 * Asset Uploader Component
 * 
 * Professional drag-and-drop asset upload with progress indicators,
 * file validation, and real-time upload status.
 */

import React, { useCallback, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  X, 
  Image, 
  Video, 
  Music, 
  File,
  CheckCircle,
  AlertCircle,
  Loader2,
  Plus
} from 'lucide-react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { cn } from '../../lib/utils';

export interface AssetFile {
  id: string;
  file: File;
  type: 'image' | 'video' | 'audio' | 'document';
  preview?: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
  url?: string;
}

interface AssetUploaderProps {
  onFilesAdded: (files: AssetFile[]) => void;
  onFileRemoved: (id: string) => void;
  onUploadProgress: (id: string, progress: number) => void;
  onUploadComplete: (id: string, url: string) => void;
  onUploadError: (id: string, error: string) => void;
  assets: AssetFile[];
  maxFiles?: number;
  maxFileSize?: number; // in MB
  acceptedTypes?: string[];
  className?: string;
}

const ACCEPTED_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  video: ['video/mp4', 'video/webm', 'video/mov'],
  audio: ['audio/mp3', 'audio/wav', 'audio/aac'],
  document: ['application/pdf', 'text/plain'],
};

const DEFAULT_ACCEPTED = [
  ...ACCEPTED_TYPES.image,
  ...ACCEPTED_TYPES.video,
  ...ACCEPTED_TYPES.audio,
];

export const AssetUploader: React.FC<AssetUploaderProps> = ({
  onFilesAdded,
  onFileRemoved,
  onUploadProgress,
  onUploadComplete,
  onUploadError,
  assets,
  maxFiles = 10,
  maxFileSize = 100, // 100MB
  acceptedTypes = DEFAULT_ACCEPTED,
  className,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileType = (file: File): AssetFile['type'] => {
    if (ACCEPTED_TYPES.image.includes(file.type)) return 'image';
    if (ACCEPTED_TYPES.video.includes(file.type)) return 'video';
    if (ACCEPTED_TYPES.audio.includes(file.type)) return 'audio';
    return 'document';
  };

  const getFileIcon = (type: AssetFile['type']) => {
    switch (type) {
      case 'image': return Image;
      case 'video': return Video;
      case 'audio': return Music;
      default: return File;
    }
  };

  const validateFile = (file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return `File type ${file.type} is not supported`;
    }
    
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File size exceeds ${maxFileSize}MB limit`;
    }
    
    if (assets.length >= maxFiles) {
      return `Maximum ${maxFiles} files allowed`;
    }
    
    return null;
  };

  const createPreview = async (file: File): Promise<string | undefined> => {
    if (file.type.startsWith('image/')) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
    }
    return undefined;
  };

  const processFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles: AssetFile[] = [];

    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        // Show error toast or notification
        console.error(`File validation failed for ${file.name}: ${error}`);
        continue;
      }

      const preview = await createPreview(file);
      const assetFile: AssetFile = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        type: getFileType(file),
        preview,
        status: 'pending',
        progress: 0,
      };

      validFiles.push(assetFile);
    }

    if (validFiles.length > 0) {
      onFilesAdded(validFiles);
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => {
      const newCounter = prev - 1;
      if (newCounter === 0) {
        setIsDragOver(false);
      }
      return newCounter;
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDragCounter(0);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [processFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      // Reset input
      e.target.value = '';
    }
  }, [processFiles]);

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: AssetFile['status']) => {
    switch (status) {
      case 'completed': return 'text-success';
      case 'error': return 'text-destructive';
      case 'uploading': return 'text-primary';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: AssetFile['status']) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'error': return AlertCircle;
      case 'uploading': return Loader2;
      default: return Upload;
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Drop Zone */}
      <motion.div
        className={cn(
          'relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200',
          isDragOver
            ? 'border-primary bg-primary/5 scale-[1.02]'
            : 'border-border hover:border-primary/50 hover:bg-muted/50',
          assets.length >= maxFiles && 'opacity-50 pointer-events-none'
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />

        <motion.div
          className="space-y-4"
          animate={{ scale: isDragOver ? 1.05 : 1 }}
          transition={{ duration: 0.2 }}
        >
          <div className={cn(
            'mx-auto w-16 h-16 rounded-full flex items-center justify-center transition-colors',
            isDragOver ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          )}>
            <Upload className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">
              {isDragOver ? 'Drop files here' : 'Upload Assets'}
            </h3>
            <p className="text-muted-foreground mb-4">
              Drag and drop your images, videos, or audio files here, or click to browse
            </p>
            
            <Button
              variant="outline"
              onClick={handleBrowseClick}
              disabled={assets.length >= maxFiles}
              className="mb-4"
            >
              <Plus className="w-4 h-4 mr-2" />
              Browse Files
            </Button>

            <div className="text-sm text-muted-foreground space-y-1">
              <p>Supported formats: Images, Videos, Audio</p>
              <p>Maximum file size: {maxFileSize}MB</p>
              <p>Maximum files: {maxFiles}</p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Asset List */}
      <AnimatePresence>
        {assets.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Assets ({assets.length}/{maxFiles})
            </h4>
            
            <div className="space-y-2">
              {assets.map((asset) => {
                const FileIcon = getFileIcon(asset.type);
                const StatusIcon = getStatusIcon(asset.status);
                
                return (
                  <motion.div
                    key={asset.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center gap-3 p-3 bg-card rounded-lg border"
                  >
                    {/* File Preview/Icon */}
                    <div className="flex-shrink-0">
                      {asset.preview ? (
                        <img
                          src={asset.preview}
                          alt={asset.file.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                          <FileIcon className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium truncate">
                          {asset.file.name}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onFileRemoved(asset.id)}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatFileSize(asset.file.size)}</span>
                        <span>•</span>
                        <span className="capitalize">{asset.type}</span>
                        <span>•</span>
                        <div className={cn('flex items-center gap-1', getStatusColor(asset.status))}>
                          <StatusIcon className={cn(
                            'w-3 h-3',
                            asset.status === 'uploading' && 'animate-spin'
                          )} />
                          <span className="capitalize">{asset.status}</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      {asset.status === 'uploading' && (
                        <div className="mt-2">
                          <Progress value={asset.progress} className="h-1" />
                        </div>
                      )}

                      {/* Error Message */}
                      {asset.status === 'error' && asset.error && (
                        <p className="text-xs text-destructive mt-1">
                          {asset.error}
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};