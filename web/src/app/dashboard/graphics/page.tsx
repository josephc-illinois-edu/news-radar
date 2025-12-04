'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  GENERATE_MODES,
  type ImagePlatform,
  type ImageStyle,
  type GenerateMode,
  type GeneratedImage,
} from '@/types/graphics';
import { DalleCostStatus } from '@/components/graphics/dalle-cost-status';

export default function GraphicsPage() {
  // Form state
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [platform, setPlatform] = useState<ImagePlatform>('facebook');
  const [style, setStyle] = useState<ImageStyle>('modern');
  const [mode, setMode] = useState<GenerateMode>('placeholder');

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const costStatusRef = useRef<{ refresh: () => void } | null>(null);

  const handleSaveToLibrary = async () => {
    if (!result) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: result.url,
          title,
          platform: result.platform,
          style: result.style,
          generationMode: mode,
          prompt: result.prompt,
          width: result.width,
          height: result.height,
          cost: result.cost || 0,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save');
      }

      const saved = await response.json();
      setSavedUrl(saved.public_url || result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save image');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerate = async () => {
    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);
    setSavedUrl(null);

    try {
      const response = await fetch('/api/graphics/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          subtitle,
          platform,
          style,
          mode,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Generation failed');
      }

      const data: GeneratedImage = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!result) return;

    try {
      // For data URLs (SVG), create blob directly
      if (result.url.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = result.url;
        link.download = `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${platform}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // For external URLs, fetch and download
        const response = await fetch(result.url);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${platform}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError('Failed to download image');
    }
  };

  const handleCopyUrl = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.url);
  };

  const platformConfig = PLATFORM_CONFIGS[platform];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Graphics Generator</h1>
        <p className="text-muted-foreground">Create social media images for your articles</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Configuration */}
        <div className="lg:col-span-1 space-y-4">
          {/* Title & Subtitle */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Content</CardTitle>
              <CardDescription>Text to display on the image</CardDescription>
            </CardHeader>
            {title.trim() && (
              <div className="px-6 pb-2">
                <div className="p-2 bg-muted rounded-md">
                  <p className="text-xs text-muted-foreground mb-1">Preview:</p>
                  <p className="text-sm font-medium">{title}</p>
                  {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
                </div>
              </div>
            )}
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter your headline"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subtitle">Subtitle (optional)</Label>
                <Input
                  id="subtitle"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Supporting text"
                />
              </div>
            </CardContent>
          </Card>

          {/* Platform Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Platform</CardTitle>
              <CardDescription>Choose the target social platform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={platform} onValueChange={(v) => setPlatform(v as ImagePlatform)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PLATFORM_CONFIGS).map(([id, config]) => (
                    <SelectItem key={id} value={id}>
                      {config.name} ({config.width}x{config.height})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-sm text-muted-foreground">
                <p>Aspect ratio: {platformConfig.ratio}</p>
                <p>Dimensions: {platformConfig.width} × {platformConfig.height}px</p>
              </div>
            </CardContent>
          </Card>

          {/* Style Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Style</CardTitle>
              <CardDescription>Visual appearance of the image</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={style} onValueChange={(v) => setStyle(v as ImageStyle)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(IMAGE_STYLES).map(([id, config]) => (
                    <SelectItem key={id} value={id}>
                      {config.name} - {config.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Generation Mode */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Generation Mode</CardTitle>
              <CardDescription>How to create the image</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={mode} onValueChange={(v) => setMode(v as GenerateMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(GENERATE_MODES).map(([id, config]) => (
                    <SelectItem key={id} value={id}>
                      {config.name} - {config.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {mode === 'ai' && (
                <p className="text-xs text-muted-foreground">
                  AI generation uses Pollinations.ai (free, no API key required).
                  Results may take 10-30 seconds.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Cost Status */}
          <DalleCostStatus compact className="px-1" />

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !title.trim()}
            className="w-full"
            size="lg"
          >
            {isGenerating ? 'Generating...' : 'Generate Image'}
          </Button>
        </div>

        {/* Right: Preview */}
        <div className="lg:col-span-2">
          {error && (
            <Card className="border-destructive mb-4">
              <CardContent className="pt-6">
                <p className="text-destructive">{error}</p>
              </CardContent>
            </Card>
          )}

          {isGenerating && (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="animate-pulse space-y-4">
                  <div
                    className="bg-muted rounded mx-auto"
                    style={{
                      width: '100%',
                      maxWidth: `${platformConfig.width / 2}px`,
                      aspectRatio: `${platformConfig.width}/${platformConfig.height}`,
                    }}
                  />
                </div>
                <p className="mt-4 text-muted-foreground">
                  {mode === 'ai' ? 'AI is generating your image...' : 'Creating placeholder...'}
                </p>
              </CardContent>
            </Card>
          )}

          {result && !isGenerating && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Generated Image</CardTitle>
                  <div className="flex gap-2">
                    <Badge variant="outline">{PLATFORM_CONFIGS[result.platform].name}</Badge>
                    <Badge variant="outline">{IMAGE_STYLES[result.style].name}</Badge>
                    {result.cost && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                        ${result.cost.toFixed(2)}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={result.url}
                    alt={title}
                    className="max-w-full h-auto"
                    style={{
                      maxHeight: '500px',
                      aspectRatio: `${result.width}/${result.height}`,
                    }}
                  />
                </div>

                <div className="text-sm text-muted-foreground">
                  <p>Size: {result.width} × {result.height}px</p>
                  {result.prompt && (
                    <p className="mt-1">
                      <span className="font-medium">Prompt:</span> {result.prompt}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button onClick={handleDownload}>
                    Download Image
                  </Button>
                  <Button variant="outline" onClick={handleCopyUrl}>
                    Copy URL
                  </Button>
                  <Button variant="outline" onClick={handleGenerate}>
                    Regenerate
                  </Button>
                  <Button
                    variant={savedUrl ? "secondary" : "default"}
                    onClick={handleSaveToLibrary}
                    disabled={isSaving || !!savedUrl}
                  >
                    {isSaving ? 'Saving...' : savedUrl ? 'Saved to Library' : 'Save to Library'}
                  </Button>
                </div>
                {savedUrl && (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    ✓ Image saved to library for future use
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {!isGenerating && !result && (
            <Card>
              <CardContent className="py-12 text-center">
                <div
                  className="border-2 border-dashed rounded-lg flex items-center justify-center mx-auto text-muted-foreground"
                  style={{
                    width: '100%',
                    maxWidth: `${platformConfig.width / 2}px`,
                    aspectRatio: `${platformConfig.width}/${platformConfig.height}`,
                  }}
                >
                  {platformConfig.width} × {platformConfig.height}
                </div>
                <p className="mt-4 text-muted-foreground">
                  Enter a title and click &quot;Generate Image&quot; to create your graphic
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
