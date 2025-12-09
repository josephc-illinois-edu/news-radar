'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  useSources,
  useToggleSource,
  useCreateSource,
  useDeleteSource,
} from '@/hooks/use-sources';
import {
  SOURCE_LIBRARY,
  getSourcesByTier,
  type NewsSource,
  type SourceCategory,
  type SourcePreset,
} from '@/types/sources';
import { Plus, Trash2, ExternalLink, AlertCircle, Rss, Globe, Settings2, Star, Sparkles } from 'lucide-react';

export default function SourcesPage() {
  const { data, isLoading, error } = useSources();
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  if (isLoading) {
    return <SourcesSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-md bg-destructive/10 p-4 text-destructive">
        Failed to load sources: {error.message}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { system, custom } = data;
  const enabledCount = data.sources.filter(s => s.is_enabled).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">News Sources</h1>
          <p className="text-muted-foreground">
            Manage which sources to scan for news stories
          </p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add RSS Feed
            </Button>
          </DialogTrigger>
          <AddSourceDialog onClose={() => setAddDialogOpen(false)} />
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{enabledCount}</div>
            <p className="text-sm text-muted-foreground">Active Sources</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{system.length}</div>
            <p className="text-sm text-muted-foreground">Built-in Sources</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{custom.length}</div>
            <p className="text-sm text-muted-foreground">Custom Feeds</p>
          </CardContent>
        </Card>
      </div>

      {/* Built-in Sources */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Built-in Sources</h2>
        </div>
        <div className="grid gap-3">
          {system.map((source) => (
            <SourceCard key={source.id} source={source} />
          ))}
        </div>
      </div>

      {/* Custom Feeds */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Rss className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Custom Feeds</h2>
        </div>
        {custom.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Rss className="mx-auto mb-3 h-8 w-8 opacity-50" />
              <p>No custom feeds added yet.</p>
              <p className="text-sm">Click &quot;Add RSS Feed&quot; to add your own sources.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {custom.map((source) => (
              <SourceCard key={source.id} source={source} showDelete />
            ))}
          </div>
        )}
      </div>

      {/* Source Library */}
      <div className="space-y-6">
        {/* Premium Tier */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold">Premium Sources</h2>
            <Badge variant="secondary" className="text-xs">Real engagement data</Badge>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {getSourcesByTier('premium').map((preset) => (
              <PresetCard key={preset.slug} preset={preset} />
            ))}
          </div>
        </div>

        {/* Quality Tier */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold">Quality Sources</h2>
            <Badge variant="outline" className="text-xs">Reliable RSS feeds</Badge>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {getSourcesByTier('quality').map((preset) => (
              <PresetCard key={preset.slug} preset={preset} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// === Source Card Component ===

function SourceCard({ source, showDelete }: { source: NewsSource; showDelete?: boolean }) {
  const toggleSource = useToggleSource();
  const deleteSource = useDeleteSource();

  const handleToggle = (checked: boolean) => {
    toggleSource.mutate({ id: source.id, enabled: checked });
  };

  const handleDelete = () => {
    if (confirm(`Delete "${source.name}"? This cannot be undone.`)) {
      deleteSource.mutate(source.id);
    }
  };

  const config = source.config as Record<string, unknown>;
  const feedUrl = config.url || (config.urls as string[] | undefined)?.[0];

  return (
    <Card className={!source.is_enabled ? 'opacity-60' : undefined}>
      <CardContent className="flex items-center justify-between py-4">
        <div className="flex items-center gap-4">
          <span className="text-2xl" role="img" aria-label={source.name}>
            {source.icon || '📰'}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{source.name}</span>
              <Badge variant="outline" className="text-xs">
                {source.category}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {source.source_type}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {source.last_scanned_at && (
                <span>Last scan: {formatTimeAgo(source.last_scanned_at)}</span>
              )}
              {source.stories_found > 0 && (
                <span>{source.stories_found} stories</span>
              )}
              {source.last_error && (
                <span className="flex items-center gap-1 text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  Error
                </span>
              )}
              {feedUrl && typeof feedUrl === 'string' && (
                <a
                  href={feedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-foreground"
                  aria-label={`Open ${source.name} feed in new tab`}
                >
                  <ExternalLink className="h-3 w-3" />
                  Feed
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {showDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              disabled={deleteSource.isPending}
              aria-label={`Delete ${source.name}`}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
          <div className="flex items-center gap-2">
            <Label htmlFor={`toggle-${source.id}`} className="sr-only">
              Enable {source.name}
            </Label>
            <Switch
              id={`toggle-${source.id}`}
              checked={source.is_enabled}
              onCheckedChange={handleToggle}
              disabled={toggleSource.isPending}
              aria-label={source.is_enabled ? `Disable ${source.name}` : `Enable ${source.name}`}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// === Add Source Dialog ===

function AddSourceDialog({ onClose }: { onClose: () => void }) {
  const createSource = useCreateSource();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState<SourceCategory>('news');
  const [icon, setIcon] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createSource.mutateAsync({
        name,
        icon: icon || undefined,
        category,
        source_type: 'rss',
        config: { url },
      });
      onClose();
    } catch (err) {
      // Error handled by mutation
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Add RSS Feed</DialogTitle>
        <DialogDescription>
          Add a custom RSS feed to scan for news stories.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="feed-name">Name</Label>
            <Input
              id="feed-name"
              placeholder="My Tech Blog"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="feed-url">RSS Feed URL</Label>
            <Input
              id="feed-url"
              type="url"
              placeholder="https://example.com/feed.xml"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="feed-category">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as SourceCategory)}>
                <SelectTrigger id="feed-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tech">Tech</SelectItem>
                  <SelectItem value="news">News</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="science">Science</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="feed-icon">Icon (emoji)</Label>
              <Input
                id="feed-icon"
                placeholder="📰"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                maxLength={2}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createSource.isPending || !name || !url}>
            {createSource.isPending ? 'Adding...' : 'Add Feed'}
          </Button>
        </DialogFooter>
        {createSource.isError && (
          <p className="mt-2 text-sm text-destructive">{createSource.error.message}</p>
        )}
      </form>
    </DialogContent>
  );
}

// === Preset Card ===

function PresetCard({ preset }: { preset: SourcePreset }) {
  const createSource = useCreateSource();
  const { data } = useSources();

  // Check if this source is already added
  const isAdded = data?.sources.some(s => s.slug === preset.slug);

  const handleAdd = async () => {
    try {
      await createSource.mutateAsync({
        name: preset.name,
        slug: preset.slug,
        icon: preset.icon,
        category: preset.category,
        source_type: preset.source_type,
        config: preset.config,
      });
    } catch (err) {
      // May fail if already added
    }
  };

  return (
    <Card className={isAdded ? 'border-primary/50 bg-primary/5' : undefined}>
      <CardContent className="flex items-center justify-between py-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xl flex-shrink-0">{preset.icon}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{preset.name}</span>
              <Badge variant="outline" className="text-xs">
                {preset.category}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate" title={preset.description}>
              {preset.description}
            </p>
          </div>
        </div>
        {isAdded ? (
          <Badge variant="secondary" className="flex-shrink-0">Added</Badge>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={handleAdd}
            disabled={createSource.isPending}
            className="flex-shrink-0"
          >
            <Plus className="mr-1 h-3 w-3" />
            Add
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// === Skeleton ===

function SourcesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-8 w-12" />
              <Skeleton className="mt-2 h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="py-4">
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// === Helper ===

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}
