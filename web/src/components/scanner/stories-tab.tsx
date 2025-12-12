'use client';

import { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { StoryResult } from '@/types/research';

type SortField = 'title' | 'sourceName' | 'engagementVelocity' | 'publishedAt';
type SortDirection = 'asc' | 'desc';

interface StoriesTabProps {
  stories: StoryResult[];
  searchQuery?: string;
  keywords?: string[];
  isSelected: (id: string) => boolean;
  onToggleSelection: (story: StoryResult) => void;
  canSelect: (id: string) => boolean;
}

export function StoriesTab({
  stories,
  searchQuery = '',
  keywords = [],
  isSelected,
  onToggleSelection,
  canSelect,
}: StoriesTabProps) {
  const [sortField, setSortField] = useState<SortField>('engagementVelocity');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredAndSorted = useMemo(() => {
    let result = [...stories];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (story) =>
          story.title.toLowerCase().includes(query) ||
          story.sourceName.toLowerCase().includes(query) ||
          story.keywords.some((k) => k.toLowerCase().includes(query))
      );
    }

    // Filter by keywords (match ANY keyword)
    if (keywords.length > 0) {
      result = result.filter((story) => {
        const storyText = `${story.title} ${story.contentSnippet || ''} ${story.keywords.join(' ')}`.toLowerCase();
        return keywords.some((keyword) => storyText.includes(keyword.toLowerCase()));
      });
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'sourceName':
          comparison = a.sourceName.localeCompare(b.sourceName);
          break;
        case 'engagementVelocity':
          comparison = (a.engagementVelocity || 0) - (b.engagementVelocity || 0);
          break;
        case 'publishedAt':
          comparison = new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [stories, searchQuery, keywords, sortField, sortDirection]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 text-muted-foreground/50" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-4 w-4" />
    ) : (
      <ArrowDown className="h-4 w-4" />
    );
  };

  if (filteredAndSorted.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        {stories.length === 0
          ? 'No stories found. Try scanning for new content.'
          : 'No stories match your filters.'}
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <span className="sr-only">Select</span>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('title')}
                className="gap-1 -ml-3 font-medium"
              >
                Title
                <SortIcon field="title" />
              </Button>
            </TableHead>
            <TableHead className="hidden md:table-cell">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('sourceName')}
                className="gap-1 -ml-3 font-medium"
              >
                Source
                <SortIcon field="sourceName" />
              </Button>
            </TableHead>
            <TableHead className="hidden sm:table-cell w-28">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('engagementVelocity')}
                className="gap-1 -ml-3 font-medium"
              >
                Velocity
                <SortIcon field="engagementVelocity" />
              </Button>
            </TableHead>
            <TableHead className="hidden lg:table-cell w-32">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('publishedAt')}
                className="gap-1 -ml-3 font-medium"
              >
                Published
                <SortIcon field="publishedAt" />
              </Button>
            </TableHead>
            <TableHead className="w-12">
              <span className="sr-only">Link</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredAndSorted.map((story) => {
            const selected = isSelected(story.id);
            const selectable = canSelect(story.id);

            return (
              <TableRow
                key={story.id}
                className={selected ? 'bg-primary/5' : undefined}
              >
                <TableCell>
                  <Checkbox
                    checked={selected}
                    onCheckedChange={() => onToggleSelection(story)}
                    disabled={!selectable && !selected}
                    aria-label={`Select ${story.title}`}
                  />
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium line-clamp-1">{story.title}</div>
                    <div className="flex flex-wrap gap-1">
                      {story.keywords.slice(0, 3).map((keyword) => (
                        <Badge key={keyword} variant="outline" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                    <div className="md:hidden">
                      <Badge variant="secondary" className="text-xs">
                        {story.sourceName}
                      </Badge>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge variant="secondary">{story.sourceName}</Badge>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-right tabular-nums">
                  {story.engagementVelocity > 0 ? Math.round(story.engagementVelocity) : '-'}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                  {formatRelativeTime(story.publishedAt)}
                </TableCell>
                <TableCell>
                  <a
                    href={story.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent"
                    aria-label={`Open ${story.title} in new tab`}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <div className="px-4 py-2 border-t text-xs text-muted-foreground">
        Showing {filteredAndSorted.length} of {stories.length} stories
      </div>
    </div>
  );
}

function formatRelativeTime(dateString: string): string {
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
