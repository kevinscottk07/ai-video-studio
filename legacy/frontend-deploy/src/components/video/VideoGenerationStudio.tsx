/**
 * Video Generation Studio Component
 * 
 * Professional video generation studio interface with drag-and-drop assets,
 * live preview player, AI assistant, and comprehensive generation controls.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Settings,
  Download,
  Share2,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Zap,
  Sparkles,
  Eye,
  EyeOff,
  Clock,
  Monitor,
  Palette,
  Volume2,
  Film,
  Wand2,
  CreditCard,
  X,
  Upload,
  Maximize2,
  Minimize2,
  RotateCcw,
  Info,
  HelpCircle,
  Layers,
  Grid3X3,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { AssetUploader, type AssetFile } from './AssetUploader';
import { LivePreviewPlayer, type VideoPreviewData } from './LivePreviewPlayer';
import { AIAssistantPanel } from './AIAssistantPanel';
import { useVideoGeneration, useVideoGenerationParams, useSupportedVideoOptions } from '../../hooks/useVideoGeneration';
import { useCredits } from '../../hooks/useCredits';
import { useLanguage } from '../../hooks/useLanguage';
import { useToast } from '../../providers/ToastProvider';
import { cn } from '../../lib/utils';

interface VideoGenerationStudioProps {
  projectId: string;
  className?: string;
}

export const VideoGenerationStudio: React.FC<VideoGenerationStudioProps> = ({
  projectId,
  className,
}) => {
  const { toast } = useToast();
  const { balance, isLoading: creditsLoading } = useCredits();
  const { currentLanguage, supportedLanguages, t } = useLanguage();
  
  // Video generation hooks
  const {
    isLoading,
    isEstimating,
    isGenerating,
    isCancelling,
    estimate,
    error,
    progress,
    progressPercentage,
    progressStage,
    jobStatus,
    estimateGeneration,
    startGeneration,
    cancelGeneration,
    clearError,
    clearEstimate,
  } = useVideoGeneration(projectId);

  // Video parameters management
  const {
    params,
    errors,
    isValid,
    updateParam,
    validateParams,
    resetParams,
  } = useVideoGenerationParams({
    language: currentLanguage.code, // Initialize with current UI language
  });

  // Supported options
  const { data: supportedOptions } = useSupportedVideoOptions();

  // Local state
  const [assets, setAssets] = useState<AssetFile[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<VideoPreviewData | null>(null);
  const [activeTab, setActiveTab] = useState<'generate' | 'preview' | 'settings'>('generate');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAssetPanel, setShowAssetPanel] = useState(true);
  const [showAIPanel, setShowAIPanel] = useState(true);

  // Handle asset management
  const handleFilesAdded = useCallback((newFiles: AssetFile[]) => {
    setAssets(prev => [...prev, ...newFiles]);
    // Start uploading files
    newFiles.forEach(file => {
      // Simulate upload progress
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 20;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          setAssets(prev => prev.map(a => 
            a.id === file.id 
              ? { ...a, status: 'completed', progress: 100, url: `https://example.com/asset/${file.id}` }
              : a
          ));
        } else {
          setAssets(prev => prev.map(a => 
            a.id === file.id ? { ...a, status: 'uploading', progress } : a
          ));
        }
      }, 500);
    });
  }, []);

  const handleFileRemoved = useCallback((id: string) => {
    setAssets(prev => prev.filter(a => a.id !== id));
  }, []);

  // Handle generation
  const handleEstimate = useCallback(async () => {
    if (!validateParams()) {
      toast.error('Please fix the form errors before estimating.', 'Validation Error');
      return;
    }

    try {
      await estimateGeneration({
        ...params,
        assets: assets.filter(a => a.status === 'completed').map(a => a.id),
      });
    } catch (error) {
      console.error('Estimation failed:', error);
    }
  }, [params, assets, validateParams, estimateGeneration, toast]);

  const handleGenerate = useCallback(async () => {
    if (!validateParams()) {
      toast.error('Please fix the form errors before generating.', 'Validation Error');
      return;
    }

    if (!estimate) {
      toast.error('Please get a cost estimate first.', 'No Estimate');
      return;
    }

    if (balance < estimate.creditsRequired) {
      toast.error(`You need ${estimate.creditsRequired} credits but only have ${balance}.`, 'Insufficient Credits');
      return;
    }

    try {
      await startGeneration({
        ...params,
        assets: assets.filter(a => a.status === 'completed').map(a => a.id),
      });
      setActiveTab('preview');
    } catch (error) {
      console.error('Generation failed:', error);
    }
  }, [params, assets, estimate, balance, validateParams, startGeneration, toast]);

  const handleCancel = useCallback(() => {
    cancelGeneration();
  }, [cancelGeneration]);

  const handlePromptSuggestion = useCallback((prompt: string) => {
    updateParam('prompt', prompt);
  }, [updateParam]);

  // Update preview when job completes
  useEffect(() => {
    if (jobStatus?.status === 'completed' && jobStatus.metadata?.result) {
      const result = jobStatus.metadata.result;
      setPreviewVideo({
        url: result.videoUrl,
        thumbnailUrl: result.thumbnailUrl,
        duration: result.metadata.duration,
        title: `Generated Video - ${new Date().toLocaleDateString()}`,
        metadata: result.metadata,
      });
    }
  }, [jobStatus]);

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStyleIcon = (style: string) => {
    switch (style) {
      case 'cinematic': return Film;
      case 'advertisement': return Zap;
      case 'social_media': return Sparkles;
      case 'educational': return Monitor;
      case 'vr': return Eye;
      default: return Palette;
    }
  };

  return (
    <div className={cn('h-full flex flex-col bg-gradient-to-br from-background via-background to-muted/20', className)}>
      {/* Enhanced Header */}
      <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
              <Film className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Video Generation Studio
              </h1>
              <p className="text-sm text-muted-foreground">Create professional AI-generated videos</p>
            </div>
          </motion.div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Layout Controls */}
          <div className="flex items-center gap-2 px-3 py-2 bg-card rounded-lg border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAssetPanel(!showAssetPanel)}
              className={cn('h-8 w-8 p-0', showAssetPanel && 'bg-primary/10 text-primary')}
            >
              <Layers className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAIPanel(!showAIPanel)}
              className={cn('h-8 w-8 p-0', showAIPanel && 'bg-primary/10 text-primary')}
            >
              <Sparkles className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="h-8 w-8 p-0"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </div>

          {/* Credit Balance */}
          <motion.div
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg border border-primary/20"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <CreditCard className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">
              {creditsLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                `${balance.toLocaleString()} credits`
              )}
            </span>
          </motion.div>

          {/* Generation Status */}
          <AnimatePresence>
            {isGenerating && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-ai/10 to-primary/10 text-primary rounded-lg border border-primary/20"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                  <Loader2 className="w-4 h-4" />
                </motion.div>
                <span className="text-sm font-medium">Generating...</span>
                <Badge variant="outline" className="text-xs">
                  {progressPercentage}%
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Enhanced Main Content */}
      <div className={cn(
        'flex-1 flex overflow-hidden transition-all duration-300',
        isFullscreen && 'fixed inset-0 z-50 bg-background'
      )}>
        {/* Left Panel - Controls */}
        <AnimatePresence>
          {showAssetPanel && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 384, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-96 border-r bg-gradient-to-b from-card/50 to-muted/20 overflow-hidden"
            >
              <div className="h-full overflow-y-auto">
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="h-full">
                  <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-sm border-b">
                    <TabsList className="grid w-full grid-cols-3 m-4">
                      <TabsTrigger value="generate" className="flex items-center gap-2">
                        <Wand2 className="w-4 h-4" />
                        Generate
                      </TabsTrigger>
                      <TabsTrigger value="preview" className="flex items-center gap-2">
                        <Play className="w-4 h-4" />
                        Preview
                      </TabsTrigger>
                      <TabsTrigger value="settings" className="flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Settings
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="px-4 pb-4">
                    <TabsContent value="generate" className="space-y-6 mt-0">
                      {/* Enhanced Prompt Section */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                      >
                        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                                <Sparkles className="w-4 h-4 text-white" />
                              </div>
                              Video Prompt
                              <Button
                                variant="ghost"
                                size="sm"
                                className="ml-auto h-6 w-6 p-0"
                                onClick={() => {/* Show prompt tips */}}
                              >
                                <HelpCircle className="w-4 h-4" />
                              </Button>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="relative">
                              <Textarea
                                placeholder="Describe your video in detail... (e.g., 'A professional product showcase featuring a sleek smartphone with dynamic lighting and smooth camera movements')"
                                value={params.prompt}
                                onChange={(e) => updateParam('prompt', e.target.value)}
                                className={cn(
                                  'min-h-[120px] resize-none pr-16 transition-all duration-200',
                                  errors.prompt && 'border-destructive ring-destructive/20',
                                  params.prompt.length > 0 && 'border-primary/50'
                                )}
                              />
                              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                                <Badge 
                                  variant={params.prompt.length > 1800 ? 'destructive' : params.prompt.length > 1500 ? 'warning' : 'secondary'}
                                  className="text-xs"
                                >
                                  {params.prompt.length}/2000
                                </Badge>
                              </div>
                            </div>
                            {errors.prompt && (
                              <motion.p
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-sm text-destructive flex items-center gap-2"
                              >
                                <AlertCircle className="w-4 h-4" />
                                {errors.prompt}
                              </motion.p>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>

                      {/* Enhanced Basic Settings */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <Card className="border-secondary/20 bg-gradient-to-br from-secondary/5 to-accent/5">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-gradient-to-br from-secondary to-accent rounded-lg flex items-center justify-center">
                                <Settings className="w-4 h-4 text-white" />
                              </div>
                              Basic Settings
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            {/* Style Selection with Visual Preview */}
                            <div className="space-y-3">
                              <label className="text-sm font-medium flex items-center gap-2">
                                <Palette className="w-4 h-4" />
                                Style
                              </label>
                              <Select value={params.style} onValueChange={(value) => updateParam('style', value as any)}>
                                <SelectTrigger className="h-12">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {supportedOptions?.styles.map((style) => {
                                    const Icon = getStyleIcon(style.value);
                                    return (
                                      <SelectItem key={style.value} value={style.value} className="h-16">
                                        <div className="flex items-center gap-3 w-full">
                                          <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg flex items-center justify-center">
                                            <Icon className="w-5 h-5 text-primary" />
                                          </div>
                                          <div className="flex-1">
                                            <div className="font-medium">{style.label}</div>
                                            <div className="text-xs text-muted-foreground line-clamp-1">
                                              {style.description}
                                            </div>
                                          </div>
                                        </div>
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Enhanced Duration Slider */}
                            <div className="space-y-3">
                              <label className="text-sm font-medium flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4" />
                                  Duration
                                </div>
                                <Badge variant="outline" className="font-mono">
                                  {formatDuration(params.duration)}
                                </Badge>
                              </label>
                              <div className="space-y-3">
                                <div className="relative">
                                  <input
                                    type="range"
                                    min="15"
                                    max="300"
                                    step="15"
                                    value={params.duration}
                                    onChange={(e) => updateParam('duration', parseInt(e.target.value))}
                                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer slider"
                                  />
                                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                                    <span>15s</span>
                                    <span>1m</span>
                                    <span>2m</span>
                                    <span>5m</span>
                                  </div>
                                </div>
                                {errors.duration && (
                                  <motion.p
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-sm text-destructive flex items-center gap-2"
                                  >
                                    <AlertCircle className="w-4 h-4" />
                                    {errors.duration}
                                  </motion.p>
                                )}
                              </div>
                            </div>

                            {/* Enhanced Resolution Selection */}
                            <div className="space-y-3">
                              <label className="text-sm font-medium flex items-center gap-2">
                                <Monitor className="w-4 h-4" />
                                Resolution
                              </label>
                              <Select value={params.resolution} onValueChange={(value) => updateParam('resolution', value as any)}>
                                <SelectTrigger className="h-12">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {supportedOptions?.resolutions.map((resolution) => (
                                    <SelectItem key={resolution.value} value={resolution.value} className="h-14">
                                      <div className="flex items-center gap-3 w-full">
                                        <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-secondary/20 rounded flex items-center justify-center">
                                          <Monitor className="w-4 h-4 text-primary" />
                                        </div>
                                        <div className="flex-1">
                                          <div className="font-medium">{resolution.label}</div>
                                          <div className="text-xs text-muted-foreground">
                                            {resolution.dimensions}
                                          </div>
                                        </div>
                                        {resolution.value === 'ultra' && (
                                          <Badge variant="gradient" className="text-xs">
                                            Premium
                                          </Badge>
                                        )}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>

                      {/* Enhanced Advanced Settings */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <Card className="border-accent/20 bg-gradient-to-br from-accent/5 to-muted/10">
                          <CardHeader>
                            <CardTitle 
                              className="flex items-center justify-between cursor-pointer group"
                              onClick={() => setShowAdvanced(!showAdvanced)}
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-gradient-to-br from-accent to-muted-foreground rounded-lg flex items-center justify-center">
                                  <Settings className="w-4 h-4 text-white" />
                                </div>
                                Advanced Settings
                              </div>
                              <motion.div
                                animate={{ rotate: showAdvanced ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 group-hover:bg-accent/10">
                                  {showAdvanced ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </Button>
                              </motion.div>
                            </CardTitle>
                          </CardHeader>
                          <AnimatePresence>
                            {showAdvanced && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                              >
                                <CardContent className="space-y-6">
                                  {/* Aspect Ratio with Visual Preview */}
                                  <div className="space-y-3">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                      <Grid3X3 className="w-4 h-4" />
                                      Aspect Ratio
                                    </label>
                                    <Select value={params.aspectRatio} onValueChange={(value) => updateParam('aspectRatio', value as any)}>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {supportedOptions?.aspectRatios.map((ratio) => (
                                          <SelectItem key={ratio.value} value={ratio.value}>
                                            <div className="flex items-center gap-3">
                                              <div className="w-8 h-6 border-2 border-primary/30 rounded flex items-center justify-center bg-primary/5">
                                                <div 
                                                  className="bg-primary/50 rounded-sm"
                                                  style={{
                                                    width: ratio.value === '16:9' ? '16px' : ratio.value === '9:16' ? '4px' : ratio.value === '1:1' ? '8px' : '12px',
                                                    height: ratio.value === '16:9' ? '9px' : ratio.value === '9:16' ? '16px' : ratio.value === '1:1' ? '8px' : '9px',
                                                  }}
                                                />
                                              </div>
                                              <div>
                                                <div className="font-medium">{ratio.label}</div>
                                                <div className="text-xs text-muted-foreground">{ratio.description}</div>
                                              </div>
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {/* Frame Rate */}
                                  <div className="space-y-3">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                      <Film className="w-4 h-4" />
                                      Frame Rate
                                    </label>
                                    <Select value={params.fps?.toString()} onValueChange={(value) => updateParam('fps', parseInt(value) as any)}>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {supportedOptions?.frameRates.map((fps) => (
                                          <SelectItem key={fps.value} value={fps.value.toString()}>
                                            <div className="flex items-center justify-between w-full">
                                              <div>
                                                <div className="font-medium">{fps.label}</div>
                                                <div className="text-xs text-muted-foreground">{fps.description}</div>
                                              </div>
                                              {fps.value >= 60 && (
                                                <Badge variant="gradient" className="text-xs ml-2">
                                                  Pro
                                                </Badge>
                                              )}
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {/* Quality */}
                                  <div className="space-y-3">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                      <Zap className="w-4 h-4" />
                                      Quality
                                    </label>
                                    <Select value={params.quality} onValueChange={(value) => updateParam('quality', value as any)}>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {supportedOptions?.qualities.map((quality) => (
                                          <SelectItem key={quality.value} value={quality.value}>
                                            <div className="flex items-center justify-between w-full">
                                              <div>
                                                <div className="font-medium">{quality.label}</div>
                                                <div className="text-xs text-muted-foreground">{quality.description}</div>
                                              </div>
                                              {quality.value === 'ultra' && (
                                                <Badge variant="gradient" className="text-xs ml-2">
                                                  Ultra
                                                </Badge>
                                              )}
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {/* Language */}
                                  <div className="space-y-3">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                      <Volume2 className="w-4 h-4" />
                                      {t('settings.preferences')} - Language
                                    </label>
                                    <Select value={params.language} onValueChange={(value) => updateParam('language', value)}>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {supportedLanguages.map((language) => (
                                          <SelectItem key={language.code} value={language.code}>
                                            <div className="flex items-center gap-3">
                                              <span className="text-lg">{language.flag}</span>
                                              <div>
                                                <div className="font-medium">{language.nativeName}</div>
                                                <div className="text-xs text-muted-foreground">{language.name}</div>
                                              </div>
                                              {language.code === currentLanguage.code && (
                                                <Badge variant="outline" className="text-xs ml-auto">
                                                  {t('common.current')}
                                                </Badge>
                                              )}
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                      {t('videoGeneration.languageHelp')}
                                    </p>
                                  </div>
                                    </Select>
                                  </div>
                                </CardContent>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </Card>
                      </motion.div>

                      {/* Enhanced Asset Upload */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                      >
                        <Card className="border-video/20 bg-gradient-to-br from-video/5 to-primary/5">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-gradient-to-br from-video to-primary rounded-lg flex items-center justify-center">
                                <Upload className="w-4 h-4 text-white" />
                              </div>
                              Assets
                              <Badge variant="outline" className="ml-auto">
                                Optional
                              </Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <AssetUploader
                              assets={assets}
                              onFilesAdded={handleFilesAdded}
                              onFileRemoved={handleFileRemoved}
                              onUploadProgress={() => {}}
                              onUploadComplete={() => {}}
                              onUploadError={() => {}}
                              maxFiles={5}
                              maxFileSize={50}
                              className="border-dashed border-2 border-video/30 hover:border-video/50 transition-colors"
                            />
                          </CardContent>
                        </Card>
                      </motion.div>

                      {/* Enhanced Cost Estimate */}
                      <AnimatePresence>
                        {estimate && (
                          <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.95 }}
                            transition={{ duration: 0.3 }}
                          >
                            <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 shadow-lg">
                              <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                                    <CreditCard className="w-4 h-4 text-white" />
                                  </div>
                                  Cost Estimate
                                  <Badge variant="gradient" className="ml-auto">
                                    {estimate.creditsRequired} credits
                                  </Badge>
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="flex items-center justify-between p-3 bg-card/50 rounded-lg">
                                    <span className="text-sm text-muted-foreground">Credits Required</span>
                                    <Badge variant="secondary" className="font-mono">
                                      {estimate.creditsRequired}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center justify-between p-3 bg-card/50 rounded-lg">
                                    <span className="text-sm text-muted-foreground">Est. Duration</span>
                                    <span className="text-sm font-medium">
                                      ~{estimate.estimatedDuration}min
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Base Credits</span>
                                    <span className="font-mono">{estimate.breakdown.baseCredits}</span>
                                  </div>
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Duration Multiplier</span>
                                    <span className="font-mono">{estimate.breakdown.durationMultiplier.toFixed(2)}x</span>
                                  </div>
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Resolution Multiplier</span>
                                    <span className="font-mono">{estimate.breakdown.resolutionMultiplier.toFixed(2)}x</span>
                                  </div>
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Style Multiplier</span>
                                    <span className="font-mono">{estimate.breakdown.styleMultiplier.toFixed(2)}x</span>
                                  </div>
                                </div>

                                {balance < estimate.creditsRequired && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg"
                                  >
                                    <div className="flex items-center gap-2 text-destructive">
                                      <AlertCircle className="w-4 h-4" />
                                      <span className="text-sm font-medium">Insufficient Credits</span>
                                    </div>
                                    <p className="text-xs text-destructive/80 mt-1">
                                      You need {estimate.creditsRequired - balance} more credits to generate this video.
                                    </p>
                                  </motion.div>
                                )}
                              </CardContent>
                            </Card>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Enhanced Error Display */}
                      <AnimatePresence>
                        {error && (
                          <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.95 }}
                            transition={{ duration: 0.3 }}
                          >
                            <Card className="border-destructive/30 bg-gradient-to-br from-destructive/10 to-destructive/5">
                              <CardContent className="pt-6">
                                <div className="flex items-start gap-3">
                                  <div className="w-8 h-8 bg-destructive/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <AlertCircle className="w-4 h-4 text-destructive" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm text-destructive font-medium">Generation Error</p>
                                    <p className="text-sm text-muted-foreground mt-1">{error}</p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearError}
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Enhanced Action Buttons */}
                      <motion.div
                        className="space-y-3 sticky bottom-0 bg-gradient-to-t from-background via-background to-transparent pt-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                      >
                        <Button
                          onClick={handleEstimate}
                          disabled={!isValid || isLoading}
                          className="w-full h-12 bg-gradient-to-r from-secondary to-accent hover:from-secondary/90 hover:to-accent/90"
                          variant="outline"
                        >
                          {isEstimating ? (
                            <>
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                className="mr-2"
                              >
                                <Loader2 className="w-4 h-4" />
                              </motion.div>
                              Estimating Cost...
                            </>
                          ) : (
                            <>
                              <CreditCard className="w-4 h-4 mr-2" />
                              Get Cost Estimate
                            </>
                          )}
                        </Button>

                        <Button
                          onClick={handleGenerate}
                          disabled={!isValid || !estimate || isLoading || balance < (estimate?.creditsRequired || 0)}
                          className="w-full h-12 bg-gradient-to-r from-primary via-secondary to-accent hover:from-primary/90 hover:via-secondary/90 hover:to-accent/90 text-white font-semibold shadow-lg"
                          size="lg"
                        >
                          {isGenerating ? (
                            <>
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                className="mr-2"
                              >
                                <Loader2 className="w-4 h-4" />
                              </motion.div>
                              Generating Video...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 mr-2" />
                              Generate Video
                            </>
                          )}
                        </Button>

                        {isGenerating && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                          >
                            <Button
                              onClick={handleCancel}
                              disabled={isCancelling}
                              variant="outline"
                              className="w-full h-10 border-destructive/30 text-destructive hover:bg-destructive/10"
                            >
                              {isCancelling ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Cancelling...
                                </>
                              ) : (
                                <>
                                  <X className="w-4 h-4 mr-2" />
                                  Cancel Generation
                                </>
                              )}
                            </Button>
                          </motion.div>
                        )}
                      </motion.div>
              </TabsContent>

                    <TabsContent value="preview" className="mt-0">
                      <div className="space-y-4">
                        {/* Enhanced Generation Progress */}
                        <AnimatePresence>
                          {isGenerating && (
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ duration: 0.3 }}
                            >
                              <Card className="border-primary/20 bg-gradient-to-br from-primary/10 to-secondary/5">
                                <CardHeader>
                                  <CardTitle className="flex items-center gap-2">
                                    <motion.div
                                      animate={{ rotate: 360 }}
                                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                    >
                                      <Loader2 className="w-5 h-5 text-primary" />
                                    </motion.div>
                                    Generation Progress
                                    <Badge variant="outline" className="ml-auto">
                                      {progressPercentage}%
                                    </Badge>
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                  <div>
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm font-medium">{progressStage}</span>
                                      <span className="text-sm text-muted-foreground">{progressPercentage}%</span>
                                    </div>
                                    <Progress 
                                      value={progressPercentage} 
                                      className="h-3" 
                                      variant="generation"
                                      animated
                                    />
                                  </div>
                                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                                    <Info className="w-4 h-4 text-muted-foreground" />
                                    <p className="text-xs text-muted-foreground">
                                      This may take several minutes depending on video length and quality settings.
                                    </p>
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Enhanced Video Preview */}
                        {previewVideo && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                          >
                            <Card className="border-success/20 bg-gradient-to-br from-success/10 to-primary/5">
                              <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-gradient-to-br from-success to-primary rounded-lg flex items-center justify-center">
                                    <CheckCircle className="w-4 h-4 text-white" />
                                  </div>
                                  Generated Video
                                  <Badge variant="success" className="ml-auto">
                                    Ready
                                  </Badge>
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="flex items-center justify-between p-3 bg-card/50 rounded-lg">
                                      <span className="text-muted-foreground">Duration</span>
                                      <span className="font-medium">{formatDuration(previewVideo.duration)}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-card/50 rounded-lg">
                                      <span className="text-muted-foreground">Resolution</span>
                                      <span className="font-medium">{previewVideo.metadata?.resolution}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-card/50 rounded-lg">
                                      <span className="text-muted-foreground">Format</span>
                                      <span className="font-medium">{previewVideo.metadata?.format.toUpperCase()}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-card/50 rounded-lg">
                                      <span className="text-muted-foreground">Size</span>
                                      <span className="font-medium">
                                        {previewVideo.metadata?.fileSize ? `${(previewVideo.metadata.fileSize / 1024 / 1024).toFixed(1)} MB` : 'N/A'}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  <div className="flex gap-2">
                                    <Button className="flex-1 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90">
                                      <Download className="w-4 h-4 mr-2" />
                                      Download
                                    </Button>
                                    <Button variant="outline" className="flex-1">
                                      <Share2 className="w-4 h-4 mr-2" />
                                      Share
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        )}

                        {/* Enhanced Job Status */}
                        {jobStatus && (
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                          >
                            <Card>
                              <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                  <Clock className="w-5 h-5 text-primary" />
                                  Job Status
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                    <span className="text-sm text-muted-foreground">Status</span>
                                    <Badge variant={
                                      jobStatus.status === 'completed' ? 'success' :
                                      jobStatus.status === 'failed' ? 'destructive' :
                                      jobStatus.status === 'processing' ? 'secondary' : 'outline'
                                    }>
                                      {jobStatus.status}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                    <span className="text-sm text-muted-foreground">Credits Used</span>
                                    <span className="font-mono">{jobStatus.creditsDeducted}</span>
                                  </div>
                                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                    <span className="text-sm text-muted-foreground">Created</span>
                                    <span className="text-sm">{new Date(jobStatus.createdAt).toLocaleString()}</span>
                                  </div>
                                  {jobStatus.completedAt && (
                                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                      <span className="text-sm text-muted-foreground">Completed</span>
                                      <span className="text-sm">{new Date(jobStatus.completedAt).toLocaleString()}</span>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="settings" className="mt-0">
                      <div className="space-y-4">
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <Card>
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                                <Settings className="w-5 h-5 text-primary" />
                                Generation Settings
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <Button
                                onClick={resetParams}
                                variant="outline"
                                className="w-full h-10"
                              >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Reset to Defaults
                              </Button>
                              
                              <Button
                                onClick={clearEstimate}
                                variant="outline"
                                className="w-full h-10"
                                disabled={!estimate}
                              >
                                <X className="w-4 h-4 mr-2" />
                                Clear Estimate
                              </Button>
                            </CardContent>
                          </Card>
                        </motion.div>
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Enhanced Right Panel - Preview & AI Assistant */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Enhanced Video Preview */}
          <div className="flex-1 p-6 bg-gradient-to-br from-background to-muted/10">
            <motion.div
              className="h-full"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <LivePreviewPlayer
                video={previewVideo}
                isGenerating={isGenerating}
                generationProgress={progressPercentage}
                generationStage={progressStage}
                onDownload={() => {
                  if (previewVideo) {
                    window.open(previewVideo.url, '_blank');
                  }
                }}
                onShare={() => {
                  if (previewVideo) {
                    navigator.share?.({
                      title: previewVideo.title,
                      url: previewVideo.url,
                    });
                  }
                }}
                className="h-full rounded-xl shadow-2xl border border-border/50"
              />
            </motion.div>
          </div>

          {/* Enhanced AI Assistant */}
          <AnimatePresence>
            {showAIPanel && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="border-t bg-gradient-to-r from-card/50 to-muted/20 overflow-hidden"
              >
                <div className="p-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <AIAssistantPanel
                      currentParams={params}
                      onParamUpdate={updateParam}
                      onPromptSuggestion={handlePromptSuggestion}
                      isGenerating={isGenerating}
                      className="max-h-96 border border-primary/20 bg-gradient-to-br from-ai/5 to-primary/5 shadow-lg"
                    />
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};