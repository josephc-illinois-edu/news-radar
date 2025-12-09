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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  PLATFORM_CONFIGS,
  IMAGE_STYLES,
  IMAGE_QUALITIES,
  GENERATE_MODES,
  type ImagePlatform,
  type ImageStyle,
  type ImageQuality,
  type GenerateMode,
  type GeneratedImage,
  type PromptSuggestion,
  type SuggestPromptsResponse,
} from '@/types/graphics';
import type { DBArticleImage } from '@/types/database';
import { DalleCostStatus } from '@/components/graphics/dalle-cost-status';

interface FeaturedImageGeneratorProps {
  title: string;
  onTitleChange?: (newTitle: string) => void;
  content?: string;
  platform?: ImagePlatform;
  style?: ImageStyle;
  onSettingsChange?: (platform: ImagePlatform, style: ImageStyle) => void;
  compact?: boolean;
  articleId?: string;
  existingImageUrl?: string;
  onImageSaved?: (imageUrl: string, imageId: string) => void;
  hidePlatformSelector?: boolean; // Hide when platform is controlled externally
}

export function FeaturedImageGenerator({
  title,
  content,
  platform: initialPlatform = 'facebook',
  style: initialStyle = 'modern',
  onSettingsChange,
  onTitleChange,
  compact = false,
  articleId,
  existingImageUrl,
  onImageSaved,
  hidePlatformSelector = false,
}: FeaturedImageGeneratorProps) {
  const [platform, setPlatform] = useState<ImagePlatform>(initialPlatform);
  const [style, setStyle] = useState<ImageStyle>(initialStyle);
  const [quality, setQuality] = useState<ImageQuality>('preview');
  const [generateMode, setGenerateMode] = useState<GenerateMode>('ai');
  const [customPrompt, setCustomPrompt] = useState('');
  const [suggestions, setSuggestions] = useState<PromptSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<GeneratedImage | null>(null);
  const [savedImageUrl, setSavedImageUrl] = useState<string | null>(existingImageUrl || null);
  const [error, setError] = useState<string | null>(null);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [imageTitle, setImageTitle] = useState(title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showImageLibrary, setShowImageLibrary] = useState(false);
  const [libraryImages, setLibraryImages] = useState<DBArticleImage[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);

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

  // Sync savedImageUrl with existingImageUrl prop
  useEffect(() => {
    if (existingImageUrl) {
      setSavedImageUrl(existingImageUrl);
    }
  }, [existingImageUrl]);

  const handleSaveImage = async () => {
    if (!result) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/graphics/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId,
          imageUrl: result.url,
          title: imageTitle,
          platform: result.platform,
          style: result.style,
          mode: generateMode,
          prompt: result.prompt,
          width: result.width,
          height: result.height,
          cost: result.cost,
          setAsFeatured: true,
        }),
      });

      const data = await response.json();

      if (data.demoMode) {
        setError('Demo mode: Images not persisted without Supabase');
        return;
      }

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to save image');
      }

      setSavedImageUrl(data.image.publicUrl);
      onImageSaved?.(data.image.publicUrl, data.image.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save image');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenLibrary = async () => {
    setShowImageLibrary(true);
    setIsLoadingLibrary(true);
    setError(null);

    try {
      const response = await fetch('/api/graphics/save');
      const data = await response.json();

      if (data.demoMode) {
        setError('Demo mode: No saved images available');
        setLibraryImages([]);
        return;
      }

      setLibraryImages(data.images || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load image library');
    } finally {
      setIsLoadingLibrary(false);
    }
  };

  const handleSelectFromLibrary = async (image: DBArticleImage) => {
    if (!articleId) {
      setError('No article ID - cannot assign image');
      return;
    }
    if (!image.public_url) {
      setError('Image has no public URL');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Assign existing image to article (no re-upload needed)
      const response = await fetch('/api/graphics/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId,
          imageId: image.id,
        }),
      });

      const data = await response.json();

      if (data.demoMode) {
        setError('Demo mode: Cannot assign images without Supabase');
        return;
      }

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to assign image');
      }

      setSavedImageUrl(data.image.publicUrl);
      onImageSaved?.(data.image.publicUrl, data.image.id);
      setShowImageLibrary(false);
      setResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign image');
    } finally {
      setIsSaving(false);
    }
  };

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
          title: imageTitle,
          platform,
          style,
          mode: generateMode,
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

    const filename = `${imageTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${platform}-${quality}.png`;

    // For data URLs (SVG placeholders), we can download directly
    if (result.url.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = result.url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // For external URLs, try fetch first (works if CORS allows)
    try {
      const response = await fetch(result.url, { mode: 'cors' });
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return;
      }
    } catch {
      // CORS blocked - fall through to open in new tab
    }

    // Fallback: open in new tab (user can right-click save)
    window.open(result.url, '_blank');
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
          <label htmlFor="image-title" className="text-xs font-medium text-muted-foreground">Image Title</label>
          {!isEditingTitle && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 min-w-[44px] text-xs"
              onClick={() => setIsEditingTitle(true)}
              aria-label="Edit image title"
            >
              Edit
            </Button>
          )}
        </div>
        {isEditingTitle ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              id="image-title"
              value={imageTitle}
              onChange={(e) => setImageTitle(e.target.value)}
              className="h-10 text-sm flex-1"
              placeholder="Enter image title..."
              aria-describedby={imageTitle !== title ? "title-modified-notice" : undefined}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-10 min-w-[44px] flex-1 sm:flex-none"
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
                className="h-10 min-w-[44px] flex-1 sm:flex-none"
                onClick={() => {
                  setImageTitle(title);
                  setIsEditingTitle(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm font-medium truncate" title={imageTitle} aria-label={`Image title: ${imageTitle || 'No title'}`}>
            {imageTitle || <span className="text-muted-foreground italic">No title</span>}
          </p>
        )}
        {imageTitle !== title && (
          <p id="title-modified-notice" className="text-xs text-amber-600 dark:text-amber-400" role="status">
            Modified from article title
          </p>
        )}
      </div>

      {/* Platform & Style Selectors */}
      <div className={compact || hidePlatformSelector ? 'space-y-3' : 'grid grid-cols-1 sm:grid-cols-2 gap-3'}>
        {!hidePlatformSelector && (
          <div className="space-y-1.5">
            <label htmlFor="platform-select" className="text-xs font-medium text-muted-foreground">Platform</label>
            <Select value={platform} onValueChange={(v) => handlePlatformChange(v as ImagePlatform)}>
              <SelectTrigger id="platform-select" className="h-10" aria-label="Select platform">
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
        )}

        <div className="space-y-1.5">
          <label htmlFor="style-select" className="text-xs font-medium text-muted-foreground">Style</label>
          <Select value={style} onValueChange={(v) => handleStyleChange(v as ImageStyle)}>
            <SelectTrigger id="style-select" className="h-10" aria-label="Select image style">
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

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          variant="outline"
          onClick={handleSuggestPrompts}
          disabled={isLoadingSuggestions || !imageTitle.trim()}
          className="flex-1 min-h-[44px]"
          size={compact ? 'sm' : 'default'}
          aria-busy={isLoadingSuggestions}
        >
          {isLoadingSuggestions ? 'Getting suggestions...' : 'Suggest Image Prompts'}
        </Button>
        {articleId && (
          <Button
            variant="secondary"
            onClick={handleOpenLibrary}
            disabled={isLoadingLibrary}
            className="min-h-[44px]"
            size={compact ? 'sm' : 'default'}
            aria-busy={isLoadingLibrary}
          >
            {isLoadingLibrary ? 'Loading...' : 'Browse Saved'}
          </Button>
        )}
      </div>

      {/* Prompt Editor */}
      {showPromptEditor && (
        <fieldset className="space-y-3 border rounded-lg p-3 bg-muted/30">
          <legend className="sr-only">Image generation options</legend>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="space-y-2" role="listbox" aria-label="Prompt suggestions">
              <span id="suggestions-label" className="text-xs font-medium text-muted-foreground block">Suggestions (click to use)</span>
              <div className="space-y-1.5" aria-labelledby="suggestions-label">
                {suggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    type="button"
                    role="option"
                    aria-selected={customPrompt === suggestion.prompt}
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className={`w-full text-left p-3 rounded text-sm border transition-colors min-h-[44px] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                      customPrompt === suggestion.prompt
                        ? 'border-primary bg-primary/5'
                        : 'border-transparent bg-background hover:border-muted-foreground/20'
                    }`}
                  >
                    <span className="font-medium">{suggestion.description}</span>
                    <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">{suggestion.prompt}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Editable Prompt */}
          <div className="space-y-1.5">
            <label htmlFor="custom-prompt" className="text-xs font-medium text-muted-foreground">
              Edit Prompt
            </label>
            <Textarea
              id="custom-prompt"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Describe your ideal image..."
              className="min-h-[80px] text-sm resize-none"
              aria-describedby="prompt-hint"
            />
            <span id="prompt-hint" className="sr-only">Enter a description for the image you want to generate</span>
          </div>

          {/* Mode & Quality Toggles - responsive layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Engine Toggle */}
            <div className="space-y-1.5" role="radiogroup" aria-labelledby="engine-label">
              <span id="engine-label" className="text-xs font-medium text-muted-foreground block">Engine</span>
              <div className="flex gap-1">
                {Object.entries(GENERATE_MODES)
                  .filter(([id]) => id !== 'placeholder')
                  .map(([id, config]) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={generateMode === id}
                    onClick={() => { setGenerateMode(id as GenerateMode); setResult(null); }}
                    className={`flex-1 px-3 py-2 rounded text-xs transition-colors min-h-[44px] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                      generateMode === id
                        ? id === 'dalle'
                          ? 'bg-amber-500 text-white'
                          : 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                    aria-label={`${id === 'dalle' ? 'DALL-E' : 'Free AI'}: ${config.description}`}
                  >
                    {id === 'dalle' ? 'DALL-E' : 'Free AI'}
                  </button>
                ))}
              </div>
            </div>

            {/* Quality Toggle */}
            <div className="space-y-1.5" role="radiogroup" aria-labelledby="quality-label">
              <span id="quality-label" className="text-xs font-medium text-muted-foreground block">
                Quality <span className="text-muted-foreground/60">({previewWidth}×{previewHeight})</span>
              </span>
              <div className="flex gap-1">
                {Object.entries(IMAGE_QUALITIES).map(([id, config]) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={quality === id}
                    onClick={() => { setQuality(id as ImageQuality); setResult(null); }}
                    className={`flex-1 px-3 py-2 rounded text-xs transition-colors min-h-[44px] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                      quality === id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                    aria-label={`${config.name} quality`}
                  >
                    {config.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Cost indicator */}
          {generateMode === 'dalle' && (
            <p className="text-xs text-amber-600 dark:text-amber-400" role="status">
              DALL-E cost: ~${quality === 'preview' ? '0.04' : '0.08'} per image
            </p>
          )}

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || (!imageTitle.trim() && !customPrompt.trim())}
            className={`w-full min-h-[44px] ${generateMode === 'dalle' ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
            size="sm"
            variant={quality === 'preview' && generateMode !== 'dalle' ? 'secondary' : 'default'}
            aria-busy={isGenerating}
          >
            {isGenerating
              ? 'Generating...'
              : generateMode === 'dalle'
                ? 'Generate with DALL-E'
                : quality === 'preview'
                  ? 'Preview (Free)'
                  : 'Generate Final (Free)'}
          </Button>
          {quality === 'preview' && result && (
            <Button
              onClick={() => { setQuality('final'); handleGenerate(); }}
              disabled={isGenerating}
              size="sm"
              variant="outline"
              className="w-full min-h-[44px]"
              aria-busy={isGenerating}
            >
              Upgrade to Final Quality
            </Button>
          )}
        </fieldset>
      )}

      {/* Quick Generate (no prompt editing) */}
      {!showPromptEditor && (
        <Button
          onClick={() => { setShowPromptEditor(true); handleSuggestPrompts(); }}
          disabled={!imageTitle.trim()}
          className="w-full min-h-[44px]"
          size={compact ? 'sm' : 'default'}
          variant="secondary"
        >
          Quick Generate (auto prompt)
        </Button>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-destructive p-2 bg-destructive/10 rounded" role="alert" aria-live="polite">{error}</p>
      )}

      {/* Preview - Loading state */}
      {isGenerating && (
        <div className="animate-pulse" role="status" aria-label="Generating image">
          <div
            className="bg-muted rounded w-full"
            style={{ aspectRatio: `${platformConfig.width}/${platformConfig.height}` }}
            aria-hidden="true"
          />
          <p className="text-sm text-center text-muted-foreground mt-2">
            {quality === 'preview' ? 'Generating preview...' : 'Generating final image...'}
          </p>
        </div>
      )}

      {result && !isGenerating && (
        <div className="space-y-3">
          <figure className="border rounded-lg overflow-hidden bg-muted relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.url}
              alt={`Generated image for: ${imageTitle}`}
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
          </figure>
          {/* Metadata badges */}
          <div className="flex flex-wrap gap-1" aria-label="Image details">
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
          {/* Action buttons - responsive grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload} className="min-h-[44px]">
              Download
            </Button>
            {articleId && (
              <Button
                variant={savedImageUrl === result.url ? 'outline' : 'default'}
                size="sm"
                onClick={handleSaveImage}
                disabled={isSaving || savedImageUrl === result.url}
                className="min-h-[44px]"
                aria-busy={isSaving}
              >
                {isSaving ? 'Saving...' : savedImageUrl === result.url ? 'Saved' : 'Save'}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowPromptEditor(true);
                setIsEditingTitle(true);
              }}
              className="min-h-[44px]"
            >
              Edit
            </Button>
          </div>
          {result.prompt && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              <span className="font-medium">Prompt:</span> {result.prompt}
            </p>
          )}
        </div>
      )}

      {/* DALL-E Cost Status */}
      <DalleCostStatus compact className="mt-2" />

      {/* Saved image display */}
      {savedImageUrl && !result && !isGenerating && (
        <div className="space-y-2">
          <figure className="border rounded-lg overflow-hidden bg-muted relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={savedImageUrl}
              alt={`Current featured image: ${imageTitle}`}
              className="w-full h-auto"
              style={{ aspectRatio: `${platformConfig.width}/${platformConfig.height}` }}
            />
            <div className="absolute top-2 left-2">
              <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                Saved
              </Badge>
            </div>
          </figure>
          <p className="text-sm text-muted-foreground">
            Current featured image. Generate a new one to replace it.
          </p>
        </div>
      )}

      {/* Empty state */}
      {!isGenerating && !result && !showPromptEditor && !savedImageUrl && (
        <div
          className="border-2 border-dashed rounded-lg flex items-center justify-center text-sm text-muted-foreground p-4 min-h-[120px]"
          style={{ aspectRatio: `${platformConfig.width}/${platformConfig.height}`, maxHeight: '200px' }}
          role="status"
        >
          Click &quot;Suggest Image Prompts&quot; to start
        </div>
      )}

      {/* Image Library Dialog */}
      <Dialog open={showImageLibrary} onOpenChange={setShowImageLibrary}>
        <DialogContent
          className="w-[95vw] max-w-4xl max-h-[85vh] overflow-hidden flex flex-col"
          aria-describedby="library-dialog-description"
        >
          <DialogHeader>
            <DialogTitle>Image Library</DialogTitle>
            <p id="library-dialog-description" className="text-sm text-muted-foreground">
              Click an image to use it as the featured image for this article.
            </p>
          </DialogHeader>
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded" role="alert">
              {error}
            </div>
          )}
          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            {isLoadingLibrary ? (
              <div className="flex items-center justify-center py-12" role="status" aria-label="Loading images">
                <p className="text-muted-foreground">Loading saved images...</p>
              </div>
            ) : libraryImages.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">No saved images yet. Generate and save some first!</p>
              </div>
            ) : (
              <div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-1"
                role="listbox"
                aria-label="Available images"
              >
                {libraryImages.map((image) => (
                  <button
                    key={image.id}
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => handleSelectFromLibrary(image)}
                    disabled={isSaving}
                    className="group relative border rounded-lg overflow-hidden hover:ring-2 hover:ring-primary focus:ring-2 focus:ring-ring focus:outline-none transition-all text-left min-h-[44px]"
                    aria-label={`Select image: ${image.title}`}
                  >
                    {image.public_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={image.public_url}
                        alt={image.title}
                        className="w-full h-auto aspect-video object-cover"
                      />
                    ) : (
                      <div className="w-full aspect-video bg-muted flex items-center justify-center">
                        <span className="text-sm text-muted-foreground">No preview</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {isSaving ? 'Selecting...' : 'Use This Image'}
                      </span>
                    </div>
                    <div className="p-3 bg-background">
                      <p className="text-sm font-medium truncate">{image.title}</p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        <Badge variant="secondary" className="text-xs">
                          {image.platform}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {image.width}×{image.height}
                        </Badge>
                        {image.cost && image.cost > 0 && (
                          <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                            ${Number(image.cost).toFixed(2)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
