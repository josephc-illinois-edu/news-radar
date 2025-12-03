'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ArticleFilters as Filters } from '@/types/database';

interface ArticleFiltersProps {
  filters: Filters;
  onChange: (filters: Partial<Filters>) => void;
}

export function ArticleFilters({ filters, onChange }: ArticleFiltersProps) {
  return (
    <div className="flex gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Status: {filters.status || 'All'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup
            value={filters.status || ''}
            onValueChange={(value) =>
              onChange({ status: value as Filters['status'] || undefined })
            }
          >
            <DropdownMenuRadioItem value="">All</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="draft">Draft</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="published">Published</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="archived">Archived</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Platform: {filters.platform || 'All'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup
            value={filters.platform || ''}
            onValueChange={(value) => onChange({ platform: value || undefined })}
          >
            <DropdownMenuRadioItem value="">All</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="facebook">Facebook</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="linkedin">LinkedIn</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="newsletter">Newsletter</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="blog">Blog</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {(filters.status || filters.platform) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange({ status: undefined, platform: undefined })}
        >
          Clear filters
        </Button>
      )}
    </div>
  );
}
