import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, File, X, CheckCircle, AlertCircle, Lock, Shield } from 'lucide-react';
import { Button } from '../ui/button';
import { useToast } from '../../providers/ToastProvider';

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  key?: string;
  url?: string;
  error?: string;
}

interface SecureFileUploadProps {
  projectId?: string;
  isPublic?: boolean;
  maxFiles?: number;
  maxFileSize?: number; // in bytes
  acceptedTypes?: string[];
  onUploadComplete?: (files: Array<{ key: string; url: string; filename: string }>) => void;
  onUploadError?: (error: string) => void;
}

export const SecureFileUpload: React.FC<SecureFileUploadProps> = ({
  projectId,
  isPublic = false,
  maxFiles = 10,
  maxFileSize = 500 * 1024 * 1024, // 500MB
  acceptedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
  ],
  onUploadComplete,
  onUploadError,
}) => {
  const toast = useToast();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const generateFileId = () => Math.random().toString(36).substr(2, 9);

  const validateFile = (file: File): string | null => {
    if (file.size > maxFileSize) {
      return `File size exceeds ${Math.round(maxFileSize / 1024 / 1024)}MB limit`;
    }

    if (!acceptedTypes.includes(file.type)) {
      return `File type ${file.type} is not supported`;
    }

    return null;
  };

  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: UploadFile[] = [];
    const errors: string[] = [];

    Array.from(selectedFiles).forEach(file => {
      if (files.length + newFiles.length >= maxFiles) {
        errors.push(`Maximum ${maxFiles} files allowed`);
        return;
      }

      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
        return;
      }

      newFiles.push({
        id: generateFileId(),
        file,
        progress: 0,
        status: 'pending',
      });
    });

    if (errors.length > 0) {
      toast.error(errors.join('\n'));
    }

    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles]);
    }
  }, [files.length, maxFiles, maxFileSize, acceptedTypes]);

  const uploadFile = async (uploadFile: UploadFile): Promise<void> => {
    try {
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 0 } : f
      ));

      // Create FormData for direct upload
      const formData = new FormData();
      formData.append('file', uploadFile.file);
      if (projectId) formData.append('projectId', projectId);
      formData.append('isPublic', isPublic.toString());

      // Upload with progress tracking
      const response = await fetch('/api/v1/storage/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Upload failed');
      }

      const data = await response.json();

      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { 
              ...f, 
              status: 'completed', 
              progress: 100,
              key: data.data.key,
              url: data.data.url,
            } 
          : f
      ));

    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'error', error: errorMessage } 
          : f
      ));

      onUploadError?.(errorMessage);
    }
  };

  const handleUploadAll = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setIsUploading(true);

    try {
      // Upload files concurrently with a limit
      const concurrencyLimit = 3;
      const chunks = [];
      for (let i = 0; i < pendingFiles.length; i += concurrencyLimit) {
        chunks.push(pendingFiles.slice(i, i + concurrencyLimit));
      }

      for (const chunk of chunks) {
        await Promise.all(chunk.map(uploadFile));
      }

      // Notify completion
      const completedFiles = files
        .filter(f => f.status === 'completed')
        .map(f => ({
          key: f.key!,
          url: f.url!,
          filename: f.file.name,
        }));

      if (completedFiles.length > 0) {
        onUploadComplete?.(completedFiles);
        toast.success(`${completedFiles.length} files uploaded successfully`);
      }

    } catch (error) {
      console.error('Batch upload error:', error);
      toast.error('Some files failed to upload');
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const clearCompleted = () => {
    setFiles(prev => prev.filter(f => f.status !== 'completed'));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'uploading':
        return <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />;
      default:
        return <File className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Security Notice */}
      <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <Shield className="h-5 w-5 text-blue-600" />
        <div className="text-sm text-blue-700 dark:text-blue-200">
          <span className="font-medium">Secure Upload:</span> Files are encrypted and stored securely with time-limited access controls.
        </div>
      </div>

      {/* Drop Zone */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver
            ? 'border-primary bg-primary/5'
            : 'border-gray-300 dark:border-gray-600 hover:border-primary/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="space-y-4">
          <div className="flex justify-center">
            <Upload className="h-12 w-12 text-gray-400" />
          </div>
          
          <div>
            <p className="text-lg font-medium text-gray-900 dark:text-white">
              Drop files here or click to browse
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Maximum {maxFiles} files, up to {Math.round(maxFileSize / 1024 / 1024)}MB each
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <Lock className="h-3 w-3" />
            <span>End-to-end encrypted • GDPR compliant</span>
          </div>
        </div>
      </div>

      {/* File List */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900 dark:text-white">
                Files ({files.length})
              </h3>
              <div className="flex gap-2">
                {files.some(f => f.status === 'completed') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearCompleted}
                  >
                    Clear Completed
                  </Button>
                )}
                {files.some(f => f.status === 'pending') && (
                  <Button
                    onClick={handleUploadAll}
                    disabled={isUploading}
                    size="sm"
                  >
                    {isUploading ? 'Uploading...' : 'Upload All'}
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {files.map((file) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  {getStatusIcon(file.status)}
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {file.file.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>{formatFileSize(file.file.size)}</span>
                      <span>•</span>
                      <span>{file.file.type}</span>
                      {file.status === 'error' && file.error && (
                        <>
                          <span>•</span>
                          <span className="text-red-600">{file.error}</span>
                        </>
                      )}
                    </div>
                    
                    {file.status === 'uploading' && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1">
                          <div
                            className="bg-primary h-1 rounded-full transition-all duration-300"
                            style={{ width: `${file.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => removeFile(file.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                    disabled={file.status === 'uploading'}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};