'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useScanSources, useArticleSelection } from '@/hooks/use-research';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { AVAILABLE_SOURCES, type StoryResult, type SourceId } from '@/types/research';

export default function ResearchPage() {
  const [selectedSources, setSelectedSources] = useState<SourceId[]>(['hackernews']);
  const [results, setResults] = useState<StoryResult[]>([]);
  const scanMutation = useScanSources();
  const {
    selected: selectedArticles,
    isSelected,
    toggleSelection,
    clearSelection,
    canAddMore,
  } = useArticleSelection();

  const toggleSource = (sourceId: SourceId) => {
    setSelectedSources((prev) =>
      prev.includes(sourceId)
        ? prev.filter((id) => id !== sourceId)
        : [...prev, sourceId]
    );
  };

  const handleScan = async () => {
    if (selectedSources.length === 0) return;

    const result = await scanMutation.mutateAsync({
      sources: selectedSources,
      limit: 20,
      hoursBack: 24,
    });

    setResults(result.stories);
  };

  const techSources = AVAILABLE_SOURCES.filter((s) => s.category === 'tech');
  const newsSources = AVAILABLE_SOURCES.filter((s) => s.category === 'news');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Research</h1>
        <p className="text-muted-foreground">Scan sources for trending stories</p>
      </div>

      {/* Source Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Sources</CardTitle>
          <CardDescription>Choose which sources to scan for trending content</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Tech & Startups</p>
            <div className="flex flex-wrap gap-2">
              {techSources.map((source) => (
                <Button
                  key={source.id}
                  variant={selectedSources.includes(source.id) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleSource(source.id)}
                >
                  <span className="mr-1">{source.icon}</span>
                  {source.name}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">News</p>
            <div className="flex flex-wrap gap-2">
              {newsSources.map((source) => (
                <Button
                  key={source.id}
                  variant={selectedSources.includes(source.id) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleSource(source.id)}
                >
                  <span className="mr-1">{source.icon}</span>
                  {source.name}
                </Button>
              ))}
            </div>
          </div>
          <div className="pt-4 flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {selectedSources.length} source{selectedSources.length !== 1 ? 's' : ''} selected
            </p>
            <Button
              onClick={handleScan}
              disabled={selectedSources.length === 0 || scanMutation.isPending}
            >
              {scanMutation.isPending ? 'Scanning...' : 'Scan Sources'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {scanMutation.error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{scanMutation.error.message}</p>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {scanMutation.isPending && (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-4" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Selection Bar */}
      {selectedArticles.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="secondary">{selectedArticles.length} selected</Badge>
                <span className="text-sm text-muted-foreground">
                  {selectedArticles.map(s => s.title.slice(0, 20)).join(', ')}...
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  Clear
                </Button>
                <Button size="sm" asChild disabled={selectedArticles.length < 2}>
                  <Link href={`/dashboard/research/compare?articles=${selectedArticles.map(s => s.id).join(',')}`}>
                    Compare ({selectedArticles.length})
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results.length > 0 && !scanMutation.isPending && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Results ({results.length} stories)
            </h2>
            <p className="text-sm text-muted-foreground">
              Sorted by engagement velocity • Click to select for comparison
            </p>
          </div>

          {results.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              isSelected={isSelected(story.id)}
              onToggle={() => toggleSelection(story)}
              canSelect={canAddMore || isSelected(story.id)}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {results.length === 0 && !scanMutation.isPending && !scanMutation.error && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Select sources and click "Scan Sources" to discover trending stories
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StoryCard({
  story,
  isSelected,
  onToggle,
  canSelect,
}: {
  story: StoryResult;
  isSelected: boolean;
  onToggle: () => void;
  canSelect: boolean;
}) {
  const velocity = story.engagementVelocity.toFixed(1);
  const publishedAgo = getTimeAgo(new Date(story.publishedAt));

  return (
    <Card className={`transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'hover:bg-accent/50'}`}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggle}
            disabled={!canSelect && !isSelected}
            className="mt-1"
          />
          <div className="flex-1 min-w-0">
            <a
              href={story.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:underline line-clamp-2"
            >
              {story.title}
            </a>
            {story.contentSnippet && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {story.contentSnippet}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
              <Badge variant="outline">{story.sourceName}</Badge>
              <span>{publishedAgo}</span>
              {story.score > 0 && <span>↑ {story.score}</span>}
              {story.commentCount > 0 && <span>💬 {story.commentCount}</span>}
            </div>
            {story.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {story.keywords.slice(0, 5).map((keyword, idx) => (
                  <Badge key={`${keyword}-${idx}`} variant="secondary" className="text-xs">
                    {keyword}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold text-primary">{velocity}</div>
            <div className="text-xs text-muted-foreground">velocity</div>
          </div>
        </div>
        <div className="mt-4 flex gap-2 ml-8">
          <Button size="sm" variant="outline" asChild>
            <a href={story.url} target="_blank" rel="noopener noreferrer">
              Read Article
            </a>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <a href={`/dashboard/create?url=${encodeURIComponent(story.url)}`}>
              Write About This
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
