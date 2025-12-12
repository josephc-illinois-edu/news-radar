'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useScanSources, useArticleSelection } from '@/hooks/use-research';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Search, Filter, ChevronDown, X } from 'lucide-react';
import { AVAILABLE_SOURCES, type StoryResult, type SourceId } from '@/types/research';

// Filter types
interface ResultFilters {
  keyword: string;
  minEngagement: number;
  sortBy: 'engagement' | 'date' | 'comments';
  hoursBack: number;
}

const DEFAULT_FILTERS: ResultFilters = {
  keyword: '',
  minEngagement: 0,
  sortBy: 'engagement',
  hoursBack: 24,
};

// Default sources to scan when coming from a topic
const DEFAULT_TOPIC_SOURCES: SourceId[] = ['hackernews', 'lobsters', 'guardian', 'bbc'];

export default function ResearchPage() {
  const searchParams = useSearchParams();
  const topicFromUrl = searchParams.get('topic');

  const [selectedSources, setSelectedSources] = useState<SourceId[]>(['hackernews']);
  const [results, setResults] = useState<StoryResult[]>([]);
  const [filters, setFilters] = useState<ResultFilters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [hasAutoScanned, setHasAutoScanned] = useState(false);
  const scanMutation = useScanSources();
  const {
    selected: selectedArticles,
    isSelected,
    toggleSelection,
    clearSelection,
    canAddMore,
  } = useArticleSelection();

  // Handle topic from URL (e.g., from Scanner "Research More")
  // Combined effect to set up and auto-scan
  useEffect(() => {
    if (topicFromUrl && !hasAutoScanned) {
      // Set the keyword filter to the topic
      setFilters(f => ({ ...f, keyword: topicFromUrl }));
      // Select multiple sources for broader coverage
      setSelectedSources(DEFAULT_TOPIC_SOURCES);
      // Mark as scanned and trigger scan
      setHasAutoScanned(true);

      // Trigger scan with the topic keyword
      scanMutation.mutate(
        {
          sources: DEFAULT_TOPIC_SOURCES,
          limit: 50,
          hoursBack: 24,
          keywords: [topicFromUrl.toLowerCase()],
          requireKeywordMatch: true,
        },
        {
          onSuccess: (result) => {
            setResults(result.stories);
          },
        }
      );
    }
  }, [topicFromUrl, hasAutoScanned]);

  const toggleSource = (sourceId: SourceId) => {
    setSelectedSources((prev) =>
      prev.includes(sourceId)
        ? prev.filter((id) => id !== sourceId)
        : [...prev, sourceId]
    );
  };

  // Scan with optional keyword filtering (server-side)
  const handleScanWithKeywords = async (keyword?: string) => {
    if (selectedSources.length === 0) return;

    const keywords = keyword ? [keyword.toLowerCase()] :
      filters.keyword.trim() ? [filters.keyword.toLowerCase()] : [];

    const result = await scanMutation.mutateAsync({
      sources: selectedSources,
      limit: 50,
      hoursBack: filters.hoursBack,
      keywords,
      requireKeywordMatch: keywords.length > 0, // Only require match if we have keywords
    });

    setResults(result.stories);
  };

  const handleScan = async () => {
    await handleScanWithKeywords();
  };

  // Filter and sort results
  const filteredResults = useMemo(() => {
    let filtered = [...results];

    // Keyword filter
    if (filters.keyword.trim()) {
      const keyword = filters.keyword.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.title.toLowerCase().includes(keyword) ||
          s.keywords?.some((k) => k.toLowerCase().includes(keyword))
      );
    }

    // Minimum engagement filter
    if (filters.minEngagement > 0) {
      filtered = filtered.filter((s) => (s.score || 0) >= filters.minEngagement);
    }

    // Sort
    if (filters.sortBy === 'engagement') {
      filtered.sort((a, b) => (b.score || 0) - (a.score || 0));
    } else if (filters.sortBy === 'date') {
      filtered.sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime());
    } else if (filters.sortBy === 'comments') {
      filtered.sort((a, b) => (b.commentCount || 0) - (a.commentCount || 0));
    }

    return filtered;
  }, [results, filters]);

  const techSources = AVAILABLE_SOURCES.filter((s) => s.category === 'tech');
  const newsSources = AVAILABLE_SOURCES.filter((s) => s.category === 'news');

  // Clear topic and reset
  const clearTopic = () => {
    setFilters(f => ({ ...f, keyword: '' }));
    setResults([]);
    setHasAutoScanned(false);
    // Update URL without the topic param
    window.history.replaceState({}, '', '/dashboard/research');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Research</h1>
        <p className="text-muted-foreground">
          {topicFromUrl
            ? `Researching stories about "${topicFromUrl}"`
            : 'Scan sources for trending stories'}
        </p>
      </div>

      {/* Topic indicator from Scanner */}
      {topicFromUrl && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="default">Topic</Badge>
                <span className="font-medium">{topicFromUrl}</span>
                <span className="text-sm text-muted-foreground">
                  from Scanner
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={clearTopic}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Results with Filters */}
      {results.length > 0 && !scanMutation.isPending && (
        <div className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold">
              Results ({filteredResults.length} of {results.length} stories)
            </h2>
            <div className="flex items-center gap-2">
              {/* Quick keyword search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="keyword-search"
                  placeholder="Filter by keyword..."
                  value={filters.keyword}
                  onChange={(e) => setFilters((f) => ({ ...f, keyword: e.target.value }))}
                  className="pl-8 w-48"
                  aria-label="Filter results by keyword"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-1" aria-hidden="true" />
                Filters
                <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${showFilters ? 'rotate-180' : ''}`} aria-hidden="true" />
              </Button>
            </div>
          </div>

          {/* Advanced Filters */}
          <Collapsible open={showFilters} onOpenChange={setShowFilters}>
            <CollapsibleContent>
              <Card className="bg-muted/30">
                <CardContent className="pt-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                      <Label htmlFor="filter-hours">Time Range</Label>
                      <Select
                        value={String(filters.hoursBack)}
                        onValueChange={(v) => setFilters((f) => ({ ...f, hoursBack: Number(v) }))}
                      >
                        <SelectTrigger id="filter-hours">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="6">Last 6 hours</SelectItem>
                          <SelectItem value="12">Last 12 hours</SelectItem>
                          <SelectItem value="24">Last 24 hours</SelectItem>
                          <SelectItem value="48">Last 48 hours</SelectItem>
                          <SelectItem value="72">Last 72 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="filter-engagement">Min. Engagement</Label>
                      <Select
                        value={String(filters.minEngagement)}
                        onValueChange={(v) => setFilters((f) => ({ ...f, minEngagement: Number(v) }))}
                      >
                        <SelectTrigger id="filter-engagement">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Any</SelectItem>
                          <SelectItem value="10">10+ points</SelectItem>
                          <SelectItem value="50">50+ points</SelectItem>
                          <SelectItem value="100">100+ points</SelectItem>
                          <SelectItem value="500">500+ points</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="filter-sort">Sort By</Label>
                      <Select
                        value={filters.sortBy}
                        onValueChange={(v) => setFilters((f) => ({ ...f, sortBy: v as ResultFilters['sortBy'] }))}
                      >
                        <SelectTrigger id="filter-sort">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="engagement">Engagement</SelectItem>
                          <SelectItem value="date">Most Recent</SelectItem>
                          <SelectItem value="comments">Most Comments</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFilters(DEFAULT_FILTERS)}
                      >
                        Reset Filters
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>

          {/* Filtered Results */}
          {filteredResults.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">
                  No stories match your filters. Try adjusting the criteria.
                </p>
                <Button
                  variant="link"
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  className="mt-2"
                >
                  Reset filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredResults.map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                isSelected={isSelected(story.id)}
                onToggle={() => toggleSelection(story)}
                canSelect={canAddMore || isSelected(story.id)}
              />
            ))
          )}
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
