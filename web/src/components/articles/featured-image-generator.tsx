'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PLATFORM_CONFIGS,
  IMAGE_STYLES,
  IMAGE_QUALITIES,
  type ImagePlatform,
  type ImageStyle,
  type ImageQuality,
  type GeneratedImage,
  type PromptSuggestion,
  type SuggestPromptsResponse,
} from '@/types/graphics';
import { DalleCostStatus } from '@/components/graphics/dalle-cost-status';

interface FeaturedImageGeneratorProps {
  title: string;
  onTitleChange?: (newTitle: string) => void;
  content?: string;
  platform?: ImagePlatform;
  style?: ImageStyle;
  onSettingsChange?: (platform: ImagePlatform, style: ImageStyle) => void;
  compact?: boolean;
}

export function FeaturedImageGenerator({
  title,
  content,
  platform: initialPlatform = 'facebook',
  style: initialStyle = 'modern',
  onSettingsChange,
  onTitleChange,
  compact = false,
}: FeaturedImageGeneratorProps) {
  const [platform, setPlatform] = useState<ImagePlatform>(initialPlatform);
  const [style, setStyle] = useState<ImageStyle>(initialStyle);
  const [quality, setQuality] = useState<ImageQuality>('preview');
  const [customPrompt, setCustomPrompt] = useState('');
  const [suggestions, setSuggestions] = useState<PromptSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [imageTitle, setImageTitle] = useState(title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  // Sync with parent
  useEffect(() => {
    setPlatform(initialPlatform);
  }, [initialPlatform]);

  useEffect(() => {
    setStyle(initialStyle);
  }, [initialStyle]);

  // Sync imageTitle with title prop
  useEffect(() => {
    setImageTitle(title);
  }, [title]);

  // Clear result when title changes
  useEffect(() => {
    setResult(null);
    setSuggestions([]);
    setCustomPrompt('');
  }, [title]);

  const handlePlatformChange = (value: ImagePlatform) => {
    setPlatform(value);
    onSettingsChange?.(value, style);
    setResult(null);
  };

  const handleStyleChange = (value: ImageStyle) => {
    setStyle(value);
    onSettingsChange?.(platform, value);
    setResult(null);
  };

  const handleSuggestPrompts = async () => {
    if (!title.trim()) {
      setError('Article needs a title to suggest prompts');
      return;
    }

    setIsLoadingSuggestions(true);
    setError(null);

    try {
      const response = await fetch('/api/graphics/suggest-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: imageTitle,
          content: content?.slice(0, 1000),
          platform,
          style,
        }),
      });

      const data: SuggestPromptsResponse = await response.json();
      setSuggestions(data.suggestions);
      setShowPromptEditor(true);

      // Auto-select first suggestion
      if (data.suggestions.length > 0) {
        setCustomPrompt(data.suggestions[0].prompt);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get suggestions');
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleSelectSuggestion = (suggestion: PromptSuggestion) => {
    setCustomPrompt(suggestion.prompt);
    setResult(null);
  };

  const handleGenerate = async () => {
    if (!title.trim() && !customPrompt.trim()) {
      setError('Need a title or prompt to generate image');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/graphics/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          platform,
          style,
          mode: 'ai',
          quality,
          customPrompt: customPrompt || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Generation failed');
      }

      const data: GeneratedImage = await response.json();
      setResult(data);

      // Notify parent of settings used
      onSettingsChange?.(platform, style);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!result) return;

    try {
      const response = await fetch(result.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${platform}-${quality}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      setError('Failed to download image');
    }
  };

  const platformConfig = PLATFORM_CONFIGS[platform];
  const qualityConfig = IMAGE_QUALITIES[quality];
  const previewWidth = Math.round(platformConfig.width * qualityConfig.scale);
  const previewHeight = Math.round(platformConfig.height * qualityConfig.scale);

  // Handle title change
  const handleTitleChange = (newTitle: string) => {
    setImageTitle(newTitle);
    setResult(null); // Clear result when title changes
    onTitleChange?.(newTitle);
  };

  return (
    <div className="space-y-4">
      {/* Title Display/Editor */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">Image Title</label>
          {!isEditingTitle && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => setIsEditingTitle(true)}
            >
              Edit
            </Button>
          )}
        </div>
        {isEditingTitle ? (
          <div className="flex gap-2">
            <Input
              value={imageTitle}
              onChange={(e) => setImageTitle(e.target.value)}
              className="h-8 text-sm"
              placeholder="Enter image title..."
            />
            <Button
              size="sm"
              className="h-8"
              onClick={() => {
                setIsEditingTitle(false);
                handleTitleChange(imageTitle);
              }}
            >
              Save
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => {
                setImageTitle(title);
                setIsEditingTitle(false);
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <p className="text-sm font-medium truncate" title={imageTitle}>
            {imageTitle || <span className="text-muted-foreground italic">No title</span>}
          </p>
        )}
        {imageTitle !== title && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Modified from article title
          </p>
        )}
      </div>

      {/* Platform & Style Selectors */}
      <div className={compact ? 'space-y-3' : 'grid grid-cols-2 gap-3'}>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Platform</label>
          <Select value={platform} onValueChange={(v) => handlePlatformChange(v as ImagePlatform)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PLATFORM_CONFIGS).map(([id, config]) => (
                <SelectItem key={id} value={id}>
                  {config.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Style</label>
          <Select value={style} onValueChange={(v) => handleStyleChange(v as ImageStyle)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(IMAGE_STYLES).map(([id, config]) => (
                <SelectItem key={id} value={id}>
                  {config.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Suggest Prompts Button */}
      <Button
        variant="outline"
        onClick={handleSuggestPrompts}
        disabled={isLoadingSuggestions || !imageTitle.trim()}
        className="w-full"
        size={compact ? 'sm' : 'default'}
      >
        {isLoadingSuggestions ? 'Getting suggestions...' : 'Suggest Image Prompts'}
      </Button>

      {/* Prompt Editor */}
      {showPromptEditor && (
        <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Suggestions (click to use)</label>
              <div className="space-y-1.5">
                {suggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className={`w-full text-left p-2 rounded text-xs border transition-colors ${
                      customPrompt === suggestion.prompt
                        ? 'border-primary bg-primary/5'
                        : 'border-transparent bg-background hover:border-muted-foreground/20'
                    }`}
                  >
                    <span className="font-medium">{suggestion.description}</span>
                    <p className="text-muted-foreground mt-0.5 line-clamp-2">{suggestion.prompt}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Editable Prompt */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Edit Prompt
            </label>
            <Textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Describe your ideal image..."
              className="min-h-[80px] text-xs resize-none"
            />
          </div>

          {/* Quality Toggle */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-muted-foreground">Quality:</label>
            <div className="flex gap-1">
              {Object.entries(IMAGE_QUALITIES).map(([id, config]) => (
                <button
                  key={id}
                  onClick={() => { setQuality(id as ImageQuality); setResult(null); }}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    quality === id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {config.name}
                </button>
              ))}
            </div>
            <span className="text-xs text-muted-foreground ml-auto">
              {previewWidth}×{previewHeight}px
            </span>
          </div>

          {/* Generate Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || (!imageTitle.trim() && !customPrompt.trim())}
              className="flex-1"
              size="sm"
              variant={quality === 'preview' ? 'secondary' : 'default'}
            >
              {isGenerating ? 'Generating...' : quality === 'preview' ? 'Preview' : 'Generate Final'}
            </Button>
            {quality === 'preview' && result && (
              <Button
                onClick={() => { setQuality('final'); handleGenerate(); }}
                disabled={isGenerating}
                size="sm"
              >
                Finalize
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Quick Generate (no prompt editing) */}
      {!showPromptEditor && (
        <Button
          onClick={() => { setShowPromptEditor(true); handleSuggestPrompts(); }}
          disabled={!imageTitle.trim()}
          className="w-full"
          size={compact ? 'sm' : 'default'}
          variant="secondary"
        >
          Quick Generate (auto prompt)
        </Button>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {/* Preview */}
      {isGenerating && (
        <div className="animate-pulse">
          <div
            className="bg-muted rounded w-full"
            style={{ aspectRatio: `${platformConfig.width}/${platformConfig.height}` }}
          />
          <p className="text-xs text-center text-muted-foreground mt-2">
            {quality === 'preview' ? 'Generating preview...' : 'Generating final image...'}
          </p>
        </div>
      )}

      {result && !isGenerating && (
        <div className="space-y-2">
          <div className="border rounded-lg overflow-hidden bg-muted relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.url}
              alt={imageTitle}
              className="w-full h-auto"
              style={{ aspectRatio: `${result.width}/${result.height}` }}
            />
            {quality === 'preview' && (
              <div className="absolute top-2 left-2">
                <Badge variant="secondary" className="text-xs bg-background/80">
                  Preview
                </Badge>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              <Badge variant="secondary" className="text-xs">
                {PLATFORM_CONFIGS[result.platform].name}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {result.width}×{result.height}
              </Badge>
              {result.cost && (
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                  ${result.cost.toFixed(2)}
                </Badge>
              )}
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={handleDownload}>
                Download
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowPromptEditor(true);
                  setIsEditingTitle(true);
                }}
              >
                Edit & Regenerate
              </Button>
            </div>
          </div>
          {result.prompt && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              <span className="font-medium">Prompt:</span> {result.prompt}
            </p>
          )}
        </div>
      )}

      {/* DALL-E Cost Status */}
      <DalleCostStatus compact className="mt-2" />

      {/* Empty state */}
      {!isGenerating && !result && !showPromptEditor && (
        <div
          className="border-2 border-dashed rounded-lg flex items-center justify-center text-xs text-muted-foreground"
          style={{ aspectRatio: `${platformConfig.width}/${platformConfig.height}` }}
        >
          Click &quot;Suggest Image Prompts&quot; to start
        </div>
      )}
    </div>
  );
}
