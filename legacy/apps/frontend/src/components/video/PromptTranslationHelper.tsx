import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Languages,
  Wand2,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  Lightbulb,
  Globe,
  Sparkles,
  X,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useTextTranslation, usePromptOptimization } from '../../hooks/useTranslation';
import { useLanguage } from '../../hooks/useLanguage';
import { useToast } from '../../providers/ToastProvider';
import { cn } from '../../lib/utils';

interface PromptTranslationHelperProps {
  currentPrompt: string;
  currentLanguage: string;
  videoStyle: string;
  onPromptUpdate: (prompt: string) => void;
  className?: string;
}

export const PromptTranslationHelper: React.FC<PromptTranslationHelperProps> = ({
  currentPrompt,
  currentLanguage,
  videoStyle,
  onPromptUpdate,
  className,
}) => {
  const { toast } = useToast();
  const { supportedLanguages, t } = useLanguage();
  const [targetLanguage, setTargetLanguage] = useState(currentLanguage);
  const [culturalContext, setCulturalContext] = useState('');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Translation hook
  const {
    translateText,
    translation,
    isTranslating,
    error: translationError,
    reset: resetTranslation,
  } = useTextTranslation();

  // Prompt optimization hook
  const {
    optimizePrompt,
    optimization,
    isOptimizing,
    error: optimizationError,
    reset: resetOptimization,
  } = usePromptOptimization();

  const handleTranslate = () => {
    if (!currentPrompt.trim()) {
      toast.error('No Prompt', 'Please enter a prompt to translate.');
      return;
    }

    if (targetLanguage === currentLanguage) {
      toast.error('Same Language', 'Please select a different target language.');
      return;
    }

    const sourceLanguageName = supportedLanguages.find(lang => lang.code === currentLanguage)?.name || currentLanguage;
    const targetLanguageName = supportedLanguages.find(lang => lang.code === targetLanguage)?.name || targetLanguage;

    translateText({
      text: currentPrompt,
      sourceLanguage: sourceLanguageName,
      targetLanguage: targetLanguageName,
      context: 'video_script',
    });
  };

  const handleOptimize = () => {
    if (!currentPrompt.trim()) {
      toast.error('No Prompt', 'Please enter a prompt to optimize.');
      return;
    }

    const targetLanguageName = supportedLanguages.find(lang => lang.code === targetLanguage)?.name || targetLanguage;

    optimizePrompt({
      prompt: currentPrompt,
      targetLanguage: targetLanguageName,
      videoStyle,
      culturalContext: culturalContext.trim() || undefined,
    });
  };

  const handleCopyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      toast.success('Copied!', `${label} copied to clipboard.`);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (error) {
      toast.error('Copy Failed', 'Failed to copy text to clipboard.');
    }
  };

  const handleUseText = (text: string) => {
    onPromptUpdate(text);
    toast.success('Prompt Updated', 'Your prompt has been updated with the new text.');
  };

  const targetLanguageInfo = supportedLanguages.find(lang => lang.code === targetLanguage);

  return (
    <Card className={cn('border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
            <Languages className="w-4 h-4 text-white" />
          </div>
          {t('videoGeneration.translationHelper')}
          <Badge variant="outline" className="ml-auto">
            AI-Powered
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Language Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Target Language
          </label>
          <Select value={targetLanguage} onValueChange={setTargetLanguage}>
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
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Cultural Context (for optimization) */}
        <div className="space-y-3">
          <label className="text-sm font-medium flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Cultural Context
            <Badge variant="outline" className="text-xs">
              Optional
            </Badge>
          </label>
          <Textarea
            placeholder="e.g., 'Corporate audience in Japan', 'Young adults in Brazil', 'Traditional values in Germany'..."
            value={culturalContext}
            onChange={(e) => setCulturalContext(e.target.value)}
            className="min-h-[80px] resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Provide cultural context to help optimize your prompt for the target audience.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleTranslate}
            disabled={isTranslating || !currentPrompt.trim() || targetLanguage === currentLanguage}
            className="flex-1"
            variant="outline"
          >
            {isTranslating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Translating...
              </>
            ) : (
              <>
                <Languages className="w-4 h-4 mr-2" />
                Translate
              </>
            )}
          </Button>

          <Button
            onClick={handleOptimize}
            disabled={isOptimizing || !currentPrompt.trim()}
            className="flex-1 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
          >
            {isOptimizing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Optimizing...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                Optimize
              </>
            )}
          </Button>
        </div>

        {/* Results */}
        <AnimatePresence>
          {(translation || optimization) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Tabs defaultValue={translation ? 'translation' : 'optimization'} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="translation" disabled={!translation}>
                    Translation
                  </TabsTrigger>
                  <TabsTrigger value="optimization" disabled={!optimization}>
                    Optimization
                  </TabsTrigger>
                </TabsList>

                {translation && (
                  <TabsContent value="translation" className="space-y-4">
                    <Card className="border-success/20 bg-gradient-to-br from-success/5 to-primary/5">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Languages className="w-4 h-4 text-success" />
                          Translation Result
                          <Badge variant="outline" className="ml-auto">
                            {Math.round(translation.confidence * 100)}% confidence
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="relative">
                          <Textarea
                            value={translation.translatedText}
                            readOnly
                            className="min-h-[120px] resize-none bg-background/50"
                          />
                          <div className="absolute top-2 right-2 flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyText(translation.translatedText, 'Translation')}
                              className="h-8 w-8 p-0"
                            >
                              {copiedText === translation.translatedText ? (
                                <Check className="w-4 h-4 text-success" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{translation.metadata.wordCount} words</span>
                            <span>•</span>
                            <span>{translation.metadata.characterCount} characters</span>
                          </div>
                          <Button
                            onClick={() => handleUseText(translation.translatedText)}
                            size="sm"
                            className="bg-gradient-to-r from-success to-primary hover:from-success/90 hover:to-primary/90"
                          >
                            <Sparkles className="w-4 h-4 mr-2" />
                            Use This
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}

                {optimization && (
                  <TabsContent value="optimization" className="space-y-4">
                    <Card className="border-secondary/20 bg-gradient-to-br from-secondary/5 to-accent/5">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Wand2 className="w-4 h-4 text-secondary" />
                          Optimized Prompt
                          {targetLanguageInfo && (
                            <Badge variant="outline" className="ml-auto">
                              {targetLanguageInfo.flag} {targetLanguageInfo.nativeName}
                            </Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="relative">
                          <Textarea
                            value={optimization.optimizedPrompt}
                            readOnly
                            className="min-h-[120px] resize-none bg-background/50"
                          />
                          <div className="absolute top-2 right-2 flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyText(optimization.optimizedPrompt, 'Optimized prompt')}
                              className="h-8 w-8 p-0"
                            >
                              {copiedText === optimization.optimizedPrompt ? (
                                <Check className="w-4 h-4 text-success" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>

                        <Button
                          onClick={() => handleUseText(optimization.optimizedPrompt)}
                          className="w-full bg-gradient-to-r from-secondary to-accent hover:from-secondary/90 hover:to-accent/90"
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Use Optimized Prompt
                        </Button>

                        {/* Cultural Adaptations */}
                        {optimization.culturalAdaptations.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium flex items-center gap-2">
                              <Globe className="w-4 h-4" />
                              Cultural Adaptations
                            </h4>
                            <div className="space-y-2">
                              {optimization.culturalAdaptations.map((adaptation, index) => (
                                <div
                                  key={index}
                                  className="p-3 bg-muted/50 rounded-lg text-sm"
                                >
                                  {adaptation}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Suggestions */}
                        {optimization.suggestions.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium flex items-center gap-2">
                              <Lightbulb className="w-4 h-4" />
                              Additional Suggestions
                            </h4>
                            <div className="space-y-2">
                              {optimization.suggestions.map((suggestion, index) => (
                                <div
                                  key={index}
                                  className="p-3 bg-accent/10 rounded-lg text-sm"
                                >
                                  {suggestion}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}
              </Tabs>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Display */}
        <AnimatePresence>
          {(translationError || optimizationError) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-destructive/30 bg-gradient-to-br from-destructive/10 to-destructive/5">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-destructive">
                        {translationError ? 'Translation Error' : 'Optimization Error'}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {(translationError as any)?.response?.data?.error?.message || 
                         (optimizationError as any)?.response?.data?.error?.message || 
                         'An error occurred. Please try again.'}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        resetTranslation();
                        resetOptimization();
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};