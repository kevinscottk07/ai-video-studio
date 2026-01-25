/**
 * AI Assistant Panel Component
 * 
 * Contextual AI assistant with intelligent suggestions, prompt optimization,
 * and real-time guidance for video generation.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Sparkles,
  Lightbulb,
  Wand2,
  MessageSquare,
  Send,
  Copy,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Zap,
  Target,
  Palette,
  Clock,
  Settings,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import type { VideoGenerationParams } from '../../hooks/useVideoGeneration';

export interface AISuggestion {
  id: string;
  type: 'prompt' | 'style' | 'duration' | 'optimization' | 'creative';
  title: string;
  description: string;
  action?: () => void;
  confidence: number;
  category: string;
}

export interface AIMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: AISuggestion[];
}

interface AIAssistantPanelProps {
  currentParams: VideoGenerationParams;
  onParamUpdate: <K extends keyof VideoGenerationParams>(
    key: K,
    value: VideoGenerationParams[K]
  ) => void;
  onPromptSuggestion: (prompt: string) => void;
  isGenerating?: boolean;
  className?: string;
}

const SAMPLE_SUGGESTIONS: AISuggestion[] = [
  {
    id: '1',
    type: 'prompt',
    title: 'Enhance Visual Details',
    description: 'Add more descriptive visual elements to your prompt',
    confidence: 0.9,
    category: 'Prompt Enhancement',
  },
  {
    id: '2',
    type: 'style',
    title: 'Cinematic Style',
    description: 'Consider using cinematic style for more dramatic effect',
    confidence: 0.8,
    category: 'Style Optimization',
  },
  {
    id: '3',
    type: 'duration',
    title: 'Optimal Duration',
    description: 'For social media, 30-60 seconds works best',
    confidence: 0.85,
    category: 'Duration Guidance',
  },
  {
    id: '4',
    type: 'creative',
    title: 'Add Motion Elements',
    description: 'Include dynamic camera movements for engagement',
    confidence: 0.75,
    category: 'Creative Enhancement',
  },
];

const PROMPT_TEMPLATES = [
  {
    category: 'Marketing',
    templates: [
      'A professional product showcase featuring [product] with dynamic lighting and smooth camera movements',
      'An engaging advertisement for [brand] with vibrant colors and upbeat energy',
      'A sleek corporate presentation highlighting [service] benefits with modern graphics',
    ],
  },
  {
    category: 'Social Media',
    templates: [
      'A trendy social media video with quick cuts and energetic music for [topic]',
      'An Instagram-style story showcasing [content] with stylish transitions',
      'A TikTok-ready video with engaging visuals and trending effects about [subject]',
    ],
  },
  {
    category: 'Educational',
    templates: [
      'An informative explainer video about [topic] with clear visuals and step-by-step guidance',
      'A tutorial demonstrating [process] with detailed close-ups and annotations',
      'An educational presentation on [subject] with engaging graphics and examples',
    ],
  },
];

export const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  currentParams,
  onParamUpdate,
  onPromptSuggestion,
  isGenerating = false,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'suggestions' | 'chat' | 'templates'>('suggestions');
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [suggestions, setSuggestions] = useState<AISuggestion[]>(SAMPLE_SUGGESTIONS);
  const [isThinking, setIsThinking] = useState(false);

  // Generate contextual suggestions based on current parameters
  const generateSuggestions = useCallback(() => {
    const newSuggestions: AISuggestion[] = [];

    // Prompt-based suggestions
    if (currentParams.prompt.length < 50) {
      newSuggestions.push({
        id: 'prompt-short',
        type: 'prompt',
        title: 'Expand Your Prompt',
        description: 'Add more details about lighting, camera angles, and mood',
        confidence: 0.9,
        category: 'Prompt Enhancement',
      });
    }

    // Style suggestions based on prompt content
    if (currentParams.prompt.toLowerCase().includes('product')) {
      newSuggestions.push({
        id: 'style-product',
        type: 'style',
        title: 'Advertisement Style',
        description: 'Perfect for product showcases with professional lighting',
        action: () => onParamUpdate('style', 'advertisement'),
        confidence: 0.85,
        category: 'Style Optimization',
      });
    }

    // Duration suggestions
    if (currentParams.style === 'social_media' && currentParams.duration > 60) {
      newSuggestions.push({
        id: 'duration-social',
        type: 'duration',
        title: 'Optimize for Social Media',
        description: 'Consider 15-60 seconds for better engagement',
        action: () => onParamUpdate('duration', 30),
        confidence: 0.8,
        category: 'Duration Guidance',
      });
    }

    // Quality suggestions
    if (currentParams.resolution === 'standard' && currentParams.style === 'cinematic') {
      newSuggestions.push({
        id: 'quality-cinematic',
        type: 'optimization',
        title: 'Upgrade to HD',
        description: 'Cinematic style looks best in HD or higher resolution',
        action: () => onParamUpdate('resolution', 'hd'),
        confidence: 0.9,
        category: 'Quality Enhancement',
      });
    }

    setSuggestions([...SAMPLE_SUGGESTIONS, ...newSuggestions]);
  }, [currentParams, onParamUpdate]);

  useEffect(() => {
    generateSuggestions();
  }, [generateSuggestions]);

  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim()) return;

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsThinking(true);

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `I understand you want to ${inputMessage.toLowerCase()}. Here are some suggestions to improve your video generation:`,
        timestamp: new Date(),
        suggestions: suggestions.slice(0, 2),
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsThinking(false);
    }, 1500);
  }, [inputMessage, suggestions]);

  const handleApplySuggestion = useCallback((suggestion: AISuggestion) => {
    if (suggestion.action) {
      suggestion.action();
    }
    
    // Remove applied suggestion
    setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
  }, []);

  const handleCopyPrompt = useCallback((prompt: string) => {
    navigator.clipboard.writeText(prompt);
    // Show toast notification
  }, []);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-success';
    if (confidence >= 0.6) return 'text-warning';
    return 'text-muted-foreground';
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  return (
    <motion.div
      className={cn(
        'bg-card border rounded-lg overflow-hidden',
        className
      )}
      initial={{ height: 'auto' }}
      animate={{ height: isExpanded ? 'auto' : '60px' }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-ai/10 to-primary/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-ai/20 rounded-full flex items-center justify-center">
            <Bot className="w-4 h-4 text-ai" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">AI Assistant</h3>
            <p className="text-xs text-muted-foreground">
              Intelligent suggestions for better videos
            </p>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-8 w-8 p-0"
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </Button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Tabs */}
            <div className="flex border-b">
              {[
                { id: 'suggestions', label: 'Suggestions', icon: Lightbulb },
                { id: 'chat', label: 'Chat', icon: MessageSquare },
                { id: 'templates', label: 'Templates', icon: Wand2 },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors',
                    activeTab === id
                      ? 'text-primary border-b-2 border-primary bg-primary/5'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="p-4 max-h-96 overflow-y-auto">
              {/* Suggestions Tab */}
              {activeTab === 'suggestions' && (
                <div className="space-y-3">
                  {suggestions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No suggestions available</p>
                      <p className="text-xs">Your parameters look great!</p>
                    </div>
                  ) : (
                    suggestions.map((suggestion) => (
                      <motion.div
                        key={suggestion.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-muted/50 rounded-lg border"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-primary/20 rounded flex items-center justify-center">
                              {suggestion.type === 'prompt' && <Wand2 className="w-3 h-3 text-primary" />}
                              {suggestion.type === 'style' && <Palette className="w-3 h-3 text-primary" />}
                              {suggestion.type === 'duration' && <Clock className="w-3 h-3 text-primary" />}
                              {suggestion.type === 'optimization' && <Zap className="w-3 h-3 text-primary" />}
                              {suggestion.type === 'creative' && <Target className="w-3 h-3 text-primary" />}
                            </div>
                            <h4 className="font-medium text-sm">{suggestion.title}</h4>
                          </div>
                          
                          <Badge
                            variant="outline"
                            className={cn('text-xs', getConfidenceColor(suggestion.confidence))}
                          >
                            {getConfidenceBadge(suggestion.confidence)}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-3">
                          {suggestion.description}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {suggestion.category}
                          </span>
                          
                          {suggestion.action && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApplySuggestion(suggestion)}
                              className="h-7 text-xs"
                            >
                              Apply
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              )}

              {/* Chat Tab */}
              {activeTab === 'chat' && (
                <div className="space-y-4">
                  {/* Messages */}
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {messages.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Start a conversation</p>
                        <p className="text-xs">Ask me anything about video generation!</p>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={cn(
                            'flex gap-3',
                            message.type === 'user' ? 'justify-end' : 'justify-start'
                          )}
                        >
                          {message.type === 'assistant' && (
                            <div className="w-6 h-6 bg-ai/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                              <Bot className="w-3 h-3 text-ai" />
                            </div>
                          )}
                          
                          <div
                            className={cn(
                              'max-w-xs p-3 rounded-lg text-sm',
                              message.type === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            )}
                          >
                            <p>{message.content}</p>
                            
                            {message.suggestions && (
                              <div className="mt-2 space-y-1">
                                {message.suggestions.map((suggestion) => (
                                  <button
                                    key={suggestion.id}
                                    onClick={() => handleApplySuggestion(suggestion)}
                                    className="block w-full text-left p-2 bg-background/50 rounded text-xs hover:bg-background/80 transition-colors"
                                  >
                                    {suggestion.title}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          {message.type === 'user' && (
                            <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                              <span className="text-xs font-medium text-primary">U</span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                    
                    {isThinking && (
                      <div className="flex gap-3">
                        <div className="w-6 h-6 bg-ai/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                          <Bot className="w-3 h-3 text-ai" />
                        </div>
                        <div className="bg-muted p-3 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                              <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                              <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                            </div>
                            <span className="text-xs text-muted-foreground">Thinking...</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input */}
                  <div className="flex gap-2">
                    <Input
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder="Ask about video generation..."
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      disabled={isGenerating || isThinking}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!inputMessage.trim() || isGenerating || isThinking}
                      size="sm"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Templates Tab */}
              {activeTab === 'templates' && (
                <div className="space-y-4">
                  {PROMPT_TEMPLATES.map((category) => (
                    <div key={category.category}>
                      <h4 className="font-medium text-sm mb-2 text-muted-foreground">
                        {category.category}
                      </h4>
                      <div className="space-y-2">
                        {category.templates.map((template, index) => (
                          <div
                            key={index}
                            className="p-3 bg-muted/50 rounded-lg border group hover:bg-muted/80 transition-colors"
                          >
                            <p className="text-sm mb-2">{template}</p>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onPromptSuggestion(template)}
                                className="h-7 text-xs"
                              >
                                Use Template
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleCopyPrompt(template)}
                                className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};