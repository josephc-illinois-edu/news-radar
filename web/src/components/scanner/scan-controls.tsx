'use client';

import { ChevronDown, RotateCcw, Play, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { SourceSelector } from './source-selector';
import { TimeRangePicker } from './time-range-picker';
import { ScoreFilter } from './score-filter';
import { KeywordFilter } from './keyword-filter';
import type { ScanConfig, TimeRange } from '@/types/scanner';
import { cn } from '@/lib/utils';

interface ScanControlsProps {
  config: ScanConfig;
  onConfigChange: <K extends keyof ScanConfig>(key: K, value: ScanConfig[K]) => void;
  onToggleSource: (slug: string) => void;
  onAddKeyword: (keyword: string) => void;
  onRemoveKeyword: (keyword: string) => void;
  onReset: () => void;
  onScan: () => void;
  isScanning?: boolean;
  isCollapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  lastScanTime?: string | null;
}

export function ScanControls({
  config,
  onConfigChange,
  onToggleSource,
  onAddKeyword,
  onRemoveKeyword,
  onReset,
  onScan,
  isScanning = false,
  isCollapsed,
  onCollapsedChange,
  lastScanTime,
}: ScanControlsProps) {
  const hasChangesFromDefault =
    config.sources.length !== 3 ||
    config.hoursBack !== 24 ||
    config.minScore !== 0 ||
    config.keywords.length > 0;

  return (
    <Card className="mb-6">
      <Collapsible open={!isCollapsed} onOpenChange={(open) => onCollapsedChange(!open)}>
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 -ml-2 hover:bg-transparent"
              aria-expanded={!isCollapsed}
            >
              <Settings2 className="h-4 w-4" />
              <span className="font-medium">Scan Controls</span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 transition-transform duration-200',
                  !isCollapsed && 'rotate-180'
                )}
              />
            </Button>
          </CollapsibleTrigger>

          <div className="flex items-center gap-2">
            {lastScanTime && (
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Last scan: {formatRelativeTime(lastScanTime)}
              </span>
            )}

            <Button
              onClick={onScan}
              disabled={isScanning || config.sources.length === 0}
              size="sm"
              className="gap-2"
            >
              <Play className="h-3.5 w-3.5" />
              {isScanning ? 'Scanning...' : 'Scan Now'}
            </Button>
          </div>
        </div>

        <CollapsibleContent>
          <CardContent className="pt-4 pb-4">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Left column: Source selector */}
              <SourceSelector
                selectedSources={config.sources}
                onToggleSource={onToggleSource}
              />

              {/* Right column: Filters */}
              <div className="space-y-6">
                <TimeRangePicker
                  value={config.hoursBack}
                  onChange={(value: TimeRange) => onConfigChange('hoursBack', value)}
                />

                <ScoreFilter
                  value={config.minScore}
                  onChange={(value) => onConfigChange('minScore', value)}
                />

                <KeywordFilter
                  keywords={config.keywords}
                  onAddKeyword={onAddKeyword}
                  onRemoveKeyword={onRemoveKeyword}
                />
              </div>
            </div>

            {/* Actions row */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{config.sources.length} sources</span>
                <span>•</span>
                <span>{config.hoursBack}h window</span>
                {config.minScore > 0 && (
                  <>
                    <span>•</span>
                    <span>min score {config.minScore}</span>
                  </>
                )}
                {config.keywords.length > 0 && (
                  <>
                    <span>•</span>
                    <span>{config.keywords.length} keyword{config.keywords.length !== 1 ? 's' : ''}</span>
                  </>
                )}
              </div>

              {hasChangesFromDefault && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onReset}
                  className="gap-1.5 text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </Button>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return date.toLocaleDateString();
}
