'use client';

import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface ScanProgressProps {
  /** Total number of sources to scan */
  totalSources: number;
  /** Number of sources completed */
  completedSources: number;
  /** Names of completed sources */
  completedNames?: string[];
  /** Current source being scanned */
  currentSource?: string;
  /** Any errors encountered */
  errors?: string[];
  /** Whether the scan is in progress */
  isScanning: boolean;
  className?: string;
}

export function ScanProgress({
  totalSources,
  completedSources,
  completedNames = [],
  currentSource,
  errors = [],
  isScanning,
  className,
}: ScanProgressProps) {
  if (!isScanning && completedSources === 0) {
    return null;
  }

  const progress = totalSources > 0
    ? Math.round((completedSources / totalSources) * 100)
    : 0;

  const isDone = completedSources >= totalSources && !isScanning;
  const hasErrors = errors.length > 0;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        {isScanning ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : isDone ? (
          hasErrors ? (
            <AlertCircle className="h-4 w-4 text-amber-500" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          )
        ) : null}

        <div className="flex-1">
          <Progress value={progress} className="h-2" />
        </div>

        <span className="text-sm font-medium tabular-nums min-w-[4rem] text-right">
          {completedSources}/{totalSources}
        </span>
      </div>

      {/* Status text */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {isScanning && currentSource && (
          <span>Scanning {currentSource}...</span>
        )}

        {isDone && !hasErrors && (
          <span className="text-green-600">Scan complete</span>
        )}

        {isDone && hasErrors && (
          <span className="text-amber-600">
            Completed with {errors.length} error{errors.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Completed sources */}
      {completedNames.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {completedNames.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground"
            >
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              {name}
            </span>
          ))}
          {isScanning && currentSource && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              {currentSource}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Simplified progress for inline use
 */
export function ScanProgressInline({
  totalSources,
  completedSources,
  isScanning,
}: Pick<ScanProgressProps, 'totalSources' | 'completedSources' | 'isScanning'>) {
  if (!isScanning) return null;

  const progress = totalSources > 0
    ? Math.round((completedSources / totalSources) * 100)
    : 0;

  return (
    <div className="flex items-center gap-2">
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      <Progress value={progress} className="h-1.5 w-20" />
      <span className="text-xs tabular-nums">
        {completedSources}/{totalSources}
      </span>
    </div>
  );
}
