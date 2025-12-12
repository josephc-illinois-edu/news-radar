'use client';

import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

interface ScoreFilterProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

export function ScoreFilter({ value, onChange, className }: ScoreFilterProps) {
  const handleChange = (values: number[]) => {
    onChange(values[0]);
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <Label htmlFor="score-filter" className="text-sm font-medium">
          Min Engagement Score
        </Label>
        <span className="text-sm font-mono text-muted-foreground">{value}</span>
      </div>

      <Slider
        id="score-filter"
        min={0}
        max={100}
        step={10}
        value={[value]}
        onValueChange={handleChange}
        aria-label="Minimum engagement score filter"
        className="w-full"
      />

      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>All</span>
        <span>High engagement only</span>
      </div>
    </div>
  );
}
