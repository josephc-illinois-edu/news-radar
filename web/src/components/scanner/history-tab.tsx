'use client';

import { Clock, Trash2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useScanHistory, useClearHistory, formatHistoryEntry } from '@/hooks/use-scan-history';
import type { ScanConfig } from '@/types/scanner';

interface HistoryTabProps {
  onApplyConfig?: (config: ScanConfig) => void;
}

export function HistoryTab({ onApplyConfig }: HistoryTabProps) {
  const { data, isLoading, error, refetch } = useScanHistory({ limit: 20 });
  const clearHistory = useClearHistory();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertCircle className="h-8 w-8 mx-auto text-destructive mb-2" />
          <p className="text-destructive">Failed to load history</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const entries = data?.entries || [];

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No scan history yet</p>
          <p className="text-sm mt-1">Run a scan to start building your history</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with clear button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {data?.total || entries.length} scan{(data?.total || entries.length) !== 1 ? 's' : ''} recorded
          {data?.demo && <Badge variant="outline" className="ml-2">Demo</Badge>}
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear History
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear scan history?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete all your scan history. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => clearHistory.mutate()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Clear All
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* History list */}
      <div className="space-y-2">
        {entries.map((entry) => {
          const formatted = formatHistoryEntry(entry);
          return (
            <Card key={entry.id} className="hover:bg-accent/30 transition-colors">
              <CardContent className="py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{formatted.relativeTime}</span>
                      {formatted.hasErrors && (
                        <Badge variant="destructive" className="text-xs">
                          Errors
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {formatted.formattedDate}
                    </p>

                    {/* Config summary */}
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-xs">
                        {formatted.sourcesCount} source{formatted.sourcesCount !== 1 ? 's' : ''}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {entry.config.hoursBack}h window
                      </Badge>
                      {entry.config.minScore > 0 && (
                        <Badge variant="outline" className="text-xs">
                          min {entry.config.minScore}
                        </Badge>
                      )}
                      {entry.config.keywords.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {entry.config.keywords.length} keyword{entry.config.keywords.length !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>

                    {/* Results summary */}
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span>{entry.topicsFound} topics</span>
                      <span>{entry.storiesFound} stories</span>
                    </div>

                    {/* Top topics */}
                    {entry.topTopics.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {entry.topTopics.slice(0, 3).map((topic) => (
                          <Badge key={topic} variant="secondary" className="text-xs">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Apply config button */}
                  {onApplyConfig && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onApplyConfig(entry.config)}
                      className="shrink-0"
                    >
                      Apply
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
