'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SOURCE_LIBRARY, type SourcePreset, type SourceCategory } from '@/types/sources';

interface SourceSelectorProps {
  selectedSources: string[];
  onToggleSource: (slug: string) => void;
  className?: string;
}

const CATEGORY_LABELS: Record<SourceCategory, string> = {
  tech: 'Tech',
  news: 'News',
  business: 'Business',
  science: 'Science',
  custom: 'Custom',
};

const CATEGORY_ORDER: SourceCategory[] = ['tech', 'news', 'science', 'business'];

function groupByCategory(sources: SourcePreset[]): Map<SourceCategory, SourcePreset[]> {
  const grouped = new Map<SourceCategory, SourcePreset[]>();
  for (const category of CATEGORY_ORDER) {
    grouped.set(category, []);
  }
  for (const source of sources) {
    const list = grouped.get(source.category) || [];
    list.push(source);
    grouped.set(source.category, list);
  }
  return grouped;
}

export function SourceSelector({ selectedSources, onToggleSource, className }: SourceSelectorProps) {
  const grouped = groupByCategory(SOURCE_LIBRARY);
  const selectedCount = selectedSources.length;
  const totalCount = SOURCE_LIBRARY.length;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <Label className="text-sm font-medium">Sources</Label>
        <span className="text-xs text-muted-foreground">
          {selectedCount}/{totalCount} selected
        </span>
      </div>

      <ScrollArea className="h-[180px] rounded-md border p-3">
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([category, sources]) => {
            if (sources.length === 0) return null;
            const categorySelected = sources.filter(s => selectedSources.includes(s.slug)).length;

            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {CATEGORY_LABELS[category]}
                  </span>
                  {categorySelected > 0 && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {categorySelected}
                    </Badge>
                  )}
                </div>

                <div className="space-y-1.5">
                  {sources.map(source => {
                    const isSelected = selectedSources.includes(source.slug);
                    const checkboxId = `source-${source.slug}`;

                    return (
                      <div
                        key={source.slug}
                        className="flex items-center gap-2 py-1 px-1 rounded hover:bg-muted/50 transition-colors"
                      >
                        <Checkbox
                          id={checkboxId}
                          checked={isSelected}
                          onCheckedChange={() => onToggleSource(source.slug)}
                          aria-describedby={`${checkboxId}-desc`}
                        />
                        <Label
                          htmlFor={checkboxId}
                          className="flex-1 flex items-center gap-2 cursor-pointer text-sm font-normal"
                        >
                          <span>{source.icon}</span>
                          <span>{source.name}</span>
                          {source.tier === 'premium' && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 ml-auto">
                              API
                            </Badge>
                          )}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
