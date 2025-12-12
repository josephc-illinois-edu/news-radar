'use client';

import { Label } from '@/components/ui/label';
import { TIME_RANGE_OPTIONS, type TimeRange } from '@/types/scanner';
import { cn } from '@/lib/utils';

interface TimeRangePickerProps {
  value: number;
  onChange: (value: TimeRange) => void;
  className?: string;
}

const LABELS: Record<TimeRange, string> = {
  6: '6h',
  12: '12h',
  24: '24h',
  48: '48h',
};

export function TimeRangePicker({ value, onChange, className }: TimeRangePickerProps) {
  return (
    <div className={className}>
      <Label className="text-sm font-medium mb-3 block">Time Range</Label>

      <div
        className="inline-flex rounded-md border bg-muted/30 p-0.5"
        role="radiogroup"
        aria-label="Select time range for scanning"
      >
        {TIME_RANGE_OPTIONS.map(option => {
          const isSelected = value === option;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(option)}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                isSelected
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {LABELS[option]}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground mt-2">
        Scan stories from the last {value} hours
      </p>
    </div>
  );
}
