'use client';

import { useEffect, useCallback, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useScannerDashboard, useTriggerScan } from '@/hooks/use-scanner';
import { useArticleSelection } from '@/hooks/use-research';
import { useScannerConfig, useScannerPresets, useControlsCollapsed } from '@/hooks/use-scanner-config';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { useSaveToHistory } from '@/hooks/use-scan-history';
import { ScanControls, RefreshIndicator, ScanProgress, ResultsTabs, StoriesTab, HistoryTab, PresetSelector } from '@/components/scanner';
import type { TrendingTopic, SourceStat, ScanConfig } from '@/types/scanner';
import type { StoryResult } from '@/types/research';

const AUTO_REFRESH_INTERVAL = 60000; // 60 seconds

export default function ScannerPage() {
  const { data: dashboard, isLoading, error, refetch, dataUpdatedAt } = useScannerDashboard();
  const triggerScan = useTriggerScan();
  const { selected, isSelected, toggleSelection, clearSelection, canAddMore } = useArticleSelection();

  // Scan controls state
  const { config, setConfig, updateConfig, toggleSource, addKeyword, removeKeyword, resetConfig, isHydrated: configHydrated } = useScannerConfig();
  const { presets, activePresetId, savePreset, deletePreset, applyPreset, isHydrated: presetsHydrated } = useScannerPresets();
  const { isCollapsed, setIsCollapsed, isHydrated: collapsedHydrated } = useControlsCollapsed();
  const saveToHistory = useSaveToHistory();

  // Track last refresh time
  const [lastRefreshTime, setLastRefreshTime] = useState<string | null>(null);

  // Results filtering
  const [searchQuery, setSearchQuery] = useState('');

  // Update last refresh time when data changes
  useEffect(() => {
    if (dataUpdatedAt) {
      setLastRefreshTime(new Date(dataUpdatedAt).toISOString());
    }
  }, [dataUpdatedAt]);

  // Smart auto-refresh (pauses when tab hidden)
  const handleAutoRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const autoRefresh = useAutoRefresh({
    intervalMs: AUTO_REFRESH_INTERVAL,
    enabled: true,
    onRefresh: handleAutoRefresh,
  });

  // Auto-collapse after first successful scan
  useEffect(() => {
    if (triggerScan.isSuccess && !isCollapsed) {
      setIsCollapsed(true);
    }
  }, [triggerScan.isSuccess, isCollapsed, setIsCollapsed]);

  const handleScan = () => {
    triggerScan.mutate(
      {
        sources: config.sources,
        hoursBack: config.hoursBack,
        limit: config.maxStoriesPerSource,
      },
      {
        onSuccess: (result) => {
          // Save scan to history
          saveToHistory.mutate({
            config,
            topicsFound: result.topics?.length || 0,
            storiesFound: result.stories?.length || 0,
            topTopics: result.topics?.slice(0, 3).map((t) => t.name) || [],
            errors: result.errors,
          });
        },
      }
    );
  };

  // Handle applying preset
  const handleApplyPreset = (preset: typeof presets[0]) => {
    const newConfig = applyPreset(preset);
    setConfig(newConfig);
  };

  // Handle applying config from history
  const handleApplyHistoryConfig = (historyConfig: ScanConfig) => {
    setConfig(historyConfig);
  };

  const handleManualRefresh = useCallback(() => {
    refetch();
    autoRefresh.refreshNow();
  }, [refetch, autoRefresh]);

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

  // Wait for hydration to prevent mismatch
  const isHydrated = configHydrated && collapsedHydrated && presetsHydrated;

  return (
    <div className="space-y-6">
      {/* Header with refresh indicator */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Scanner</h1>
          <p className="text-muted-foreground">
            Monitor trending topics across news sources
          </p>
        </div>

        <RefreshIndicator
          lastRefreshTime={lastRefreshTime}
          secondsUntilRefresh={autoRefresh.secondsUntilRefresh}
          isEnabled={autoRefresh.isEnabled}
          isPaused={autoRefresh.isPaused}
          onToggleEnabled={autoRefresh.setEnabled}
          onRefreshNow={handleManualRefresh}
          isRefreshing={isLoading}
        />
      </div>

      {/* Scan Progress (shows during active scan) */}
      {triggerScan.isPending && (
        <ScanProgress
          totalSources={config.sources.length}
          completedSources={0}
          currentSource={config.sources[0]}
          isScanning={true}
        />
      )}

      {/* Preset Selector */}
      {isHydrated && (
        <div className="flex items-center gap-4">
          <PresetSelector
            presets={presets}
            activePresetId={activePresetId}
            currentConfig={config}
            onApplyPreset={handleApplyPreset}
            onSavePreset={savePreset}
            onDeletePreset={deletePreset}
          />
        </div>
      )}

      {/* Scan Controls Panel */}
      {isHydrated && (
        <ScanControls
          config={config}
          onConfigChange={updateConfig}
          onToggleSource={toggleSource}
          onAddKeyword={addKeyword}
          onRemoveKeyword={removeKeyword}
          onReset={resetConfig}
          onScan={handleScan}
          isScanning={triggerScan.isPending}
          isCollapsed={isCollapsed}
          onCollapsedChange={setIsCollapsed}
          lastScanTime={dashboard?.lastScanTime}
        />
      )}

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

      {/* Results with Tabs */}
      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <ResultsTabs
            trendingCount={dashboard.trendingTopics.length}
            storiesCount={dashboard.topStories.length}
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            trendingContent={
              dashboard.trendingTopics.length === 0 ? (
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
              )
            }
            storiesContent={
              <StoriesTab
                stories={dashboard.topStories}
                searchQuery={searchQuery}
                keywords={config.keywords}
                isSelected={isSelected}
                onToggleSelection={toggleSelection}
                canSelect={(id) => canAddMore || isSelected(id)}
              />
            }
            historyContent={
              <HistoryTab onApplyConfig={handleApplyHistoryConfig} />
            }
          />
        </div>

        {/* Source Stats Sidebar */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Sources</h2>
          <div className="space-y-2">
            {dashboard.sourceStats.map((source) => (
              <SourceCard key={source.sourceId} source={source} />
            ))}
          </div>
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
