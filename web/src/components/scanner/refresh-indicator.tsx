'use client';

import { RefreshCw, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatCountdown } from '@/hooks/use-auto-refresh';
import { cn } from '@/lib/utils';

interface RefreshIndicatorProps {
  lastRefreshTime: string | null;
  secondsUntilRefresh: number;
  isEnabled: boolean;
  isPaused: boolean;
  onToggleEnabled: (enabled: boolean) => void;
  onRefreshNow: () => void;
  isRefreshing?: boolean;
  className?: string;
}

export function RefreshIndicator({
  lastRefreshTime,
  secondsUntilRefresh,
  isEnabled,
  isPaused,
  onToggleEnabled,
  onRefreshNow,
  isRefreshing = false,
  className,
}: RefreshIndicatorProps) {
  const formattedLastRefresh = lastRefreshTime
    ? formatRelativeTime(lastRefreshTime)
    : 'Never';

  const statusText = !isEnabled
    ? 'Auto-refresh off'
    : isPaused
    ? 'Paused (tab hidden)'
    : `Next in ${formatCountdown(secondsUntilRefresh)}`;

  return (
    <div className={cn('flex items-center gap-2 text-sm', className)}>
      {/* Last refresh time */}
      <span className="text-muted-foreground">
        Updated {formattedLastRefresh}
      </span>

      <span className="text-muted-foreground">•</span>

      {/* Auto-refresh status */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant={isEnabled && !isPaused ? 'default' : 'secondary'}
              className={cn(
                'cursor-pointer select-none',
                isPaused && 'opacity-60'
              )}
              onClick={() => onToggleEnabled(!isEnabled)}
            >
              {isPaused ? (
                <Pause className="h-3 w-3 mr-1" />
              ) : isEnabled ? (
                <Play className="h-3 w-3 mr-1" />
              ) : null}
              {statusText}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {isEnabled
                ? 'Click to disable auto-refresh'
                : 'Click to enable auto-refresh'}
            </p>
            {isPaused && <p className="text-xs opacity-70">Paused while tab is hidden</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Manual refresh button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onRefreshNow}
              disabled={isRefreshing}
              aria-label="Refresh now"
            >
              <RefreshCw
                className={cn(
                  'h-4 w-4',
                  isRefreshing && 'animate-spin'
                )}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Refresh now</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 10) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return date.toLocaleDateString();
}
