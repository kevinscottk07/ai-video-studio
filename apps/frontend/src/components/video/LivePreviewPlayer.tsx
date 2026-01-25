/**
 * Live Preview Player Component
 * 
 * Professional video player with scrubbing controls, timeline,
 * playback controls, and real-time preview capabilities.
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  RotateCcw,
  Settings,
  Download,
  Share2,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { cn } from '../../lib/utils';

export interface VideoPreviewData {
  url: string;
  thumbnailUrl?: string;
  duration: number;
  title?: string;
  metadata?: {
    resolution: string;
    fps: number;
    format: string;
    fileSize: number;
  };
}

interface LivePreviewPlayerProps {
  video: VideoPreviewData | null;
  isGenerating?: boolean;
  generationProgress?: number;
  generationStage?: string;
  onDownload?: () => void;
  onShare?: () => void;
  className?: string;
}

export const LivePreviewPlayer: React.FC<LivePreviewPlayerProps> = ({
  video,
  isGenerating = false,
  generationProgress = 0,
  generationStage = 'Initializing',
  onDownload,
  onShare,
  className,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Auto-hide controls
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    const resetTimeout = () => {
      clearTimeout(timeout);
      setShowControls(true);
      timeout = setTimeout(() => {
        if (isPlaying && !isGenerating) {
          setShowControls(false);
        }
      }, 3000);
    };

    resetTimeout();
    
    const handleMouseMove = () => resetTimeout();
    const handleMouseLeave = () => {
      clearTimeout(timeout);
      if (isPlaying && !isGenerating) {
        setShowControls(false);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      clearTimeout(timeout);
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [isPlaying, isGenerating]);

  // Video event handlers
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsLoading(false);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadStart = () => {
    setIsLoading(true);
  };

  const handleCanPlay = () => {
    setIsLoading(false);
  };

  // Playback controls
  const togglePlay = useCallback(() => {
    if (!videoRef.current || isGenerating) return;
    
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying, isGenerating]);

  const handleSeek = useCallback((percentage: number) => {
    if (!videoRef.current || isGenerating) return;
    
    const newTime = (percentage / 100) * duration;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration, isGenerating]);

  const handleVolumeChange = useCallback((newVolume: number) => {
    if (!videoRef.current) return;
    
    setVolume(newVolume);
    videoRef.current.volume = newVolume;
    setIsMuted(newVolume === 0);
  }, []);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    
    if (isMuted) {
      videoRef.current.volume = volume;
      setIsMuted(false);
    } else {
      videoRef.current.volume = 0;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  const skipTime = useCallback((seconds: number) => {
    if (!videoRef.current || isGenerating) return;
    
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, [currentTime, duration, isGenerating]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, [isFullscreen]);

  const changePlaybackRate = useCallback((rate: number) => {
    if (!videoRef.current) return;
    
    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
  }, []);

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative bg-black rounded-lg overflow-hidden aspect-video group',
        className
      )}
    >
      {/* Video Element */}
      {video && (
        <video
          ref={videoRef}
          src={video.url}
          poster={video.thumbnailUrl}
          className="w-full h-full object-contain"
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onLoadStart={handleLoadStart}
          onCanPlay={handleCanPlay}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onClick={togglePlay}
        />
      )}

      {/* Generation Overlay */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 flex items-center justify-center"
          >
            <div className="text-center space-y-4 max-w-md mx-auto p-6">
              <motion.div
                className="w-16 h-16 mx-auto bg-primary/20 rounded-full flex items-center justify-center"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <Play className="w-8 h-8 text-primary" />
              </motion.div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-white">
                  Generating Your Video
                </h3>
                <p className="text-sm text-gray-300">
                  {generationStage}
                </p>
              </div>

              <div className="space-y-2">
                <Progress
                  value={generationProgress}
                  variant="ai"
                  className="w-full"
                  showValue
                />
                <p className="text-xs text-gray-400">
                  This may take a few minutes depending on video length and quality
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Placeholder when no video */}
      {!video && !isGenerating && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-muted-foreground/20 rounded-full flex items-center justify-center">
              <Play className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-muted-foreground">
                No Video Preview
              </h3>
              <p className="text-sm text-muted-foreground/70">
                Generate a video to see the preview here
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Controls Overlay */}
      <AnimatePresence>
        {video && (showControls || !isPlaying) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20"
          >
            {/* Top Controls */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {video.title && (
                  <h4 className="text-white font-medium truncate max-w-xs">
                    {video.title}
                  </h4>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {video.metadata && (
                  <div className="text-xs text-white/80 bg-black/40 px-2 py-1 rounded">
                    {video.metadata.resolution} • {video.metadata.fps}fps
                  </div>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onShare}
                  className="text-white hover:bg-white/20"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDownload}
                  className="text-white hover:bg-white/20"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Center Play Button */}
            {!isPlaying && !isLoading && (
              <motion.button
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                  <Play className="w-10 h-10 text-white ml-1" />
                </div>
              </motion.button>
            )}

            {/* Bottom Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-4 space-y-3">
              {/* Timeline */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-white font-mono">
                  {formatTime(currentTime)}
                </span>
                
                <div className="flex-1">
                  <Progress
                    value={(currentTime / duration) * 100}
                    variant="default"
                    className="cursor-pointer"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const percentage = ((e.clientX - rect.left) / rect.width) * 100;
                      handleSeek(percentage);
                    }}
                  />
                </div>
                
                <span className="text-xs text-white font-mono">
                  {formatTime(duration)}
                </span>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => skipTime(-10)}
                    className="text-white hover:bg-white/20"
                  >
                    <SkipBack className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={togglePlay}
                    className="text-white hover:bg-white/20"
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5" />
                    )}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => skipTime(10)}
                    className="text-white hover:bg-white/20"
                  >
                    <SkipForward className="w-4 h-4" />
                  </Button>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleMute}
                      className="text-white hover:bg-white/20"
                    >
                      {isMuted ? (
                        <VolumeX className="w-4 h-4" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </Button>
                    
                    <div className="w-20">
                      <Progress
                        value={isMuted ? 0 : volume * 100}
                        variant="default"
                        className="cursor-pointer"
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const percentage = (e.clientX - rect.left) / rect.width;
                          handleVolumeChange(percentage);
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Playback Speed */}
                  <select
                    value={playbackRate}
                    onChange={(e) => changePlaybackRate(Number(e.target.value))}
                    className="bg-black/40 text-white text-xs px-2 py-1 rounded border-none outline-none"
                  >
                    <option value={0.5}>0.5x</option>
                    <option value={0.75}>0.75x</option>
                    <option value={1}>1x</option>
                    <option value={1.25}>1.25x</option>
                    <option value={1.5}>1.5x</option>
                    <option value={2}>2x</option>
                  </select>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleFullscreen}
                    className="text-white hover:bg-white/20"
                  >
                    {isFullscreen ? (
                      <Minimize className="w-4 h-4" />
                    ) : (
                      <Maximize className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video Info */}
      {video?.metadata && (
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-black/60 backdrop-blur-sm rounded-lg p-3 text-white text-xs space-y-1">
            <div>Resolution: {video.metadata.resolution}</div>
            <div>Frame Rate: {video.metadata.fps} fps</div>
            <div>Format: {video.metadata.format.toUpperCase()}</div>
            <div>Size: {formatFileSize(video.metadata.fileSize)}</div>
          </div>
        </div>
      )}
    </div>
  );
};