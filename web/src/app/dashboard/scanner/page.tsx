'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { useScannerDashboard, useTriggerScan } from '@/hooks/use-scanner';
import { useArticleSelection } from '@/hooks/use-research';
import type { TrendingTopic, SourceStat } from '@/types/scanner';
import type { StoryResult } from '@/types/research';

export default function ScannerPage() {
  const { data: dashboard, isLoading, error } = useScannerDashboard();
  const triggerScan = useTriggerScan();
  const { selected, isSelected, toggleSelection, clearSelection, canAddMore } = useArticleSelection();

  const handleScan = () => {
    triggerScan.mutate({});
  };

  if (isLoading) {
    return <ScannerSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-md bg-destructive/10 p-4 text-destructive">
        Failed to load scanner data: {error.message}
      </div>
    );
  }

  if (!dashboard) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Scanner</h1>
          <p className="text-muted-foreground">
            Monitor trending topics across news sources
          </p>
        </div>
        <Button onClick={handleScan} disabled={triggerScan.isPending}>
          {triggerScan.isPending ? 'Scanning...' : 'Scan Now'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Trending Topics"
          value={dashboard.trendingTopics.length}
          description="Active topics detected"
        />
        <StatCard
          title="Stories Scanned"
          value={dashboard.totalStoriesScanned}
          description="Across all sources"
        />
        <StatCard
          title="Active Sources"
          value={dashboard.sourceStats.filter(s => s.errorCount === 0).length}
          description={`of ${dashboard.sourceStats.length} configured`}
        />
        <StatCard
          title="Last Scan"
          value={formatTimeAgo(dashboard.lastScanTime)}
          description={new Date(dashboard.lastScanTime).toLocaleTimeString()}
        />
      </div>

      {/* Selection Bar */}
      {selected.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="secondary">{selected.length} selected</Badge>
                <span className="text-sm text-muted-foreground">
                  {selected.map(s => s.title.slice(0, 20)).join(', ')}...
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  Clear
                </Button>
                <Button size="sm" asChild disabled={selected.length < 2}>
                  <Link href={`/dashboard/research/compare?articles=${selected.map(s => s.id).join(',')}`}>
                    Compare ({selected.length})
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Trending Topics */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold">Trending Topics</h2>
          {dashboard.trendingTopics.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No trending topics detected. Try scanning for new stories.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {dashboard.trendingTopics.map((topic) => (
                <TrendingTopicCard key={topic.id} topic={topic} />
              ))}
            </div>
          )}
        </div>

        {/* Source Stats */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Sources</h2>
          <div className="space-y-2">
            {dashboard.sourceStats.map((source) => (
              <SourceCard key={source.sourceId} source={source} />
            ))}
          </div>
        </div>
      </div>

      {/* Recent Stories */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Stories</h2>
          <span className="text-sm text-muted-foreground">
            Sorted by engagement velocity
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {dashboard.topStories.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              isSelected={isSelected(story.id)}
              onToggle={() => toggleSelection(story)}
              canSelect={canAddMore || isSelected(story.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// === Components ===

function StatCard({ title, value, description }: { title: string; value: string | number; description: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function TrendingTopicCard({ topic }: { topic: TrendingTopic }) {
  return (
    <Card className="hover:bg-accent/50 transition-colors">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold capitalize">{topic.name}</h3>
            <div className="flex flex-wrap gap-1.5 mt-1">
              <Badge variant="outline" className="text-xs">
                {topic.sourceCount} sources
              </Badge>
              <Badge variant="outline" className="text-xs">
                {topic.frequency} mentions
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{topic.trendScore}</div>
            <div className="text-xs text-muted-foreground">trend score</div>
          </div>
        </div>

        {/* Score breakdown bar */}
        <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden flex">
          <div
            className="bg-blue-500 transition-all"
            style={{ width: `${topic.velocityScore}%` }}
            title={`Velocity: ${topic.velocityScore}`}
          />
          <div
            className="bg-green-500 transition-all"
            style={{ width: `${Math.min(25, topic.sourceCount * 8)}%` }}
            title={`Source spread`}
          />
          <div
            className="bg-purple-500 transition-all"
            style={{ width: `${topic.aiPredictionScore}%` }}
            title={`AI prediction: ${topic.aiPredictionScore}`}
          />
        </div>
        <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-blue-500 rounded-full" /> Velocity
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full" /> Spread
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-purple-500 rounded-full" /> AI
          </span>
        </div>

        {topic.aiPredictionReason && (
          <p className="mt-2 text-sm text-muted-foreground">
            {topic.aiPredictionReason}
          </p>
        )}

        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="secondary" asChild>
            <Link href={`/dashboard/create?topic=${encodeURIComponent(topic.name)}`}>
              Write About This
            </Link>
          </Button>
          <Button size="sm" variant="ghost" asChild>
            <Link href={`/dashboard/research?topic=${encodeURIComponent(topic.name)}`}>
              Research More
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SourceCard({ source }: { source: SourceStat }) {
  const hasError = source.errorCount > 0;

  return (
    <Card className={hasError ? 'border-destructive/50' : ''}>
      <CardContent className="py-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">{source.sourceName}</div>
            <div className="text-xs text-muted-foreground">
              {source.storiesFound} stories
            </div>
          </div>
          <div className="text-right">
            {hasError ? (
              <Badge variant="destructive" className="text-xs">Error</Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">Active</Badge>
            )}
            {source.avgEngagement > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                Avg: {Math.round(source.avgEngagement)}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
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
  return (
    <Card className={`transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'hover:bg-accent/30'}`}>
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
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
              className="font-medium hover:text-primary line-clamp-2"
            >
              {story.title}
            </a>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {story.sourceName}
              </Badge>
              {story.engagementVelocity > 0 && (
                <span className="text-xs text-muted-foreground">
                  {Math.round(story.engagementVelocity)} velocity
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {story.contentSnippet || 'No preview available'}
            </p>
            <div className="flex flex-wrap gap-1 mt-2">
              {story.keywords.slice(0, 3).map((keyword) => (
                <Badge key={keyword} variant="secondary" className="text-xs">
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ScannerSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-6 w-40" />
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="space-y-4">
          <Skeleton className="h-6 w-24" />
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    </div>
  );
}

// === Utilities ===

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
