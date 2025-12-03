'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PLATFORM_INFO,
  type PublishPlatform,
  type PlatformConnection,
  type PublishResult,
} from '@/types/publish';

interface Article {
  id: string;
  title: string;
  content: string;
  status: string;
}

export default function PublishPage() {
  // State
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<string>('');
  const [connections, setConnections] = useState<PlatformConnection[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<PublishPlatform[]>([]);
  const [scheduleType, setScheduleType] = useState<'now' | 'scheduled'>('now');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [customContent, setCustomContent] = useState<Record<PublishPlatform, string>>({} as any);

  // Publishing state
  const [isPublishing, setIsPublishing] = useState(false);
  const [results, setResults] = useState<PublishResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load articles and connections
  useEffect(() => {
    loadArticles();
    loadConnections();
  }, []);

  const loadArticles = async () => {
    try {
      const response = await fetch('/api/articles?status=draft,review');
      const data = await response.json();
      setArticles(data.data || []);
    } catch (err) {
      console.error('Failed to load articles:', err);
    }
  };

  const loadConnections = async () => {
    try {
      const response = await fetch('/api/publish/connections');
      const data = await response.json();
      setConnections(data.data || []);
    } catch (err) {
      console.error('Failed to load connections:', err);
    }
  };

  const handlePlatformToggle = (platform: PublishPlatform) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const handlePublish = async () => {
    if (!selectedArticle) {
      setError('Please select an article');
      return;
    }

    if (selectedPlatforms.length === 0) {
      setError('Please select at least one platform');
      return;
    }

    setIsPublishing(true);
    setError(null);
    setResults([]);

    try {
      const payload: any = {
        articleId: selectedArticle,
        platforms: selectedPlatforms,
      };

      if (scheduleType === 'scheduled' && scheduledDate && scheduledTime) {
        payload.scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
      }

      // Add custom content if any
      const hasCustomContent = Object.keys(customContent).some(k => customContent[k as PublishPlatform]);
      if (hasCustomContent) {
        payload.customContent = customContent;
      }

      const response = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Publishing failed');
      }

      const data = await response.json();
      setResults(data.results || []);

      // Reset selection after success
      if (data.results?.some((r: PublishResult) => r.status === 'published')) {
        setSelectedPlatforms([]);
        setCustomContent({} as any);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publishing failed');
    } finally {
      setIsPublishing(false);
    }
  };

  const selectedArticleData = articles.find(a => a.id === selectedArticle);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Publish</h1>
        <p className="text-muted-foreground">Distribute your content across platforms</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Configuration */}
        <div className="lg:col-span-1 space-y-4">
          {/* Article Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Select Article</CardTitle>
              <CardDescription>Choose content to publish</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedArticle} onValueChange={setSelectedArticle}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an article..." />
                </SelectTrigger>
                <SelectContent>
                  {articles.map((article) => (
                    <SelectItem key={article.id} value={article.id}>
                      {article.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {articles.length === 0 && (
                <p className="mt-2 text-sm text-muted-foreground">
                  No draft articles available. Create one first.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Platform Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Platforms</CardTitle>
              <CardDescription>Select where to publish</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(PLATFORM_INFO).map(([platform, info]) => {
                const connection = connections.find(c => c.platform === platform);
                const isConnected = connection?.connected;

                return (
                  <div
                    key={platform}
                    className="flex items-center justify-between p-2 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id={platform}
                        checked={selectedPlatforms.includes(platform as PublishPlatform)}
                        onCheckedChange={() => handlePlatformToggle(platform as PublishPlatform)}
                        disabled={!isConnected}
                      />
                      <label
                        htmlFor={platform}
                        className={`text-sm font-medium ${!isConnected ? 'text-muted-foreground' : ''}`}
                      >
                        {info.name}
                      </label>
                    </div>
                    <Badge variant={isConnected ? 'default' : 'outline'}>
                      {isConnected ? 'Connected' : 'Not Connected'}
                    </Badge>
                  </div>
                );
              })}
              <p className="text-xs text-muted-foreground mt-2">
                Connect platforms in Settings to enable publishing.
                For demo purposes, all platforms show as not connected.
              </p>
            </CardContent>
          </Card>

          {/* Scheduling */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Timing</CardTitle>
              <CardDescription>When to publish</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={scheduleType === 'now' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setScheduleType('now')}
                >
                  Publish Now
                </Button>
                <Button
                  variant={scheduleType === 'scheduled' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setScheduleType('scheduled')}
                >
                  Schedule
                </Button>
              </div>

              {scheduleType === 'scheduled' && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Time</Label>
                    <Input
                      id="time"
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Button
            onClick={handlePublish}
            disabled={isPublishing || !selectedArticle || selectedPlatforms.length === 0}
            className="w-full"
            size="lg"
          >
            {isPublishing
              ? 'Publishing...'
              : scheduleType === 'scheduled'
              ? 'Schedule Post'
              : 'Publish Now'}
          </Button>
        </div>

        {/* Right: Preview & Results */}
        <div className="lg:col-span-2 space-y-4">
          {error && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <p className="text-destructive">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {results.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Publishing Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {results.map((result, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-lg border ${
                        result.status === 'published'
                          ? 'border-green-500 bg-green-50 dark:bg-green-950'
                          : 'border-red-500 bg-red-50 dark:bg-red-950'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {PLATFORM_INFO[result.platform].name}
                        </span>
                        <Badge
                          variant={result.status === 'published' ? 'default' : 'destructive'}
                        >
                          {result.status}
                        </Badge>
                      </div>
                      {result.url && (
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          View Post
                        </a>
                      )}
                      {result.error && (
                        <p className="text-sm text-red-600">{result.error}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Preview */}
          {selectedArticleData ? (
            <Card>
              <CardHeader>
                <CardTitle>Content Preview</CardTitle>
                <CardDescription>
                  Customize content per platform if needed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="preview">
                  <TabsList>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                    {selectedPlatforms.map(platform => (
                      <TabsTrigger key={platform} value={platform}>
                        {PLATFORM_INFO[platform].name}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  <TabsContent value="preview">
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-bold text-lg">{selectedArticleData.title}</h3>
                        <Badge variant="outline" className="mt-1">
                          {selectedArticleData.status}
                        </Badge>
                      </div>
                      <div className="prose prose-neutral dark:prose-invert max-w-none border rounded-lg p-4 max-h-[300px] overflow-y-auto">
                        <div className="whitespace-pre-wrap text-sm">
                          {selectedArticleData.content?.slice(0, 1000)}
                          {selectedArticleData.content?.length > 1000 && '...'}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {selectedPlatforms.map(platform => (
                    <TabsContent key={platform} value={platform}>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label>Custom {PLATFORM_INFO[platform].name} Content</Label>
                          {PLATFORM_INFO[platform].maxLength && (
                            <span className="text-xs text-muted-foreground">
                              Max {PLATFORM_INFO[platform].maxLength} characters
                            </span>
                          )}
                        </div>
                        <Textarea
                          value={customContent[platform] || ''}
                          onChange={(e) =>
                            setCustomContent(prev => ({
                              ...prev,
                              [platform]: e.target.value,
                            }))
                          }
                          placeholder={`Enter custom content for ${PLATFORM_INFO[platform].name} or leave empty to use original...`}
                          className="min-h-[200px]"
                          maxLength={PLATFORM_INFO[platform].maxLength}
                        />
                        <p className="text-xs text-muted-foreground">
                          Leave empty to use the original article content.
                        </p>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  Select an article to preview and publish
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
