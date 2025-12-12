'use client';

import { useState, KeyboardEvent } from 'react';
import { X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

interface KeywordFilterProps {
  keywords: string[];
  onAddKeyword: (keyword: string) => void;
  onRemoveKeyword: (keyword: string) => void;
  placeholder?: string;
}

export function KeywordFilter({
  keywords,
  onAddKeyword,
  onRemoveKeyword,
  placeholder = 'Filter by keyword...',
}: KeywordFilterProps) {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    const trimmed = inputValue.trim().toLowerCase();
    if (trimmed && !keywords.includes(trimmed)) {
      onAddKeyword(trimmed);
      setInputValue('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="keyword-input" className="text-sm font-medium">
        Keywords
      </Label>

      <div className="flex gap-2">
        <Input
          id="keyword-input"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1"
          aria-describedby="keyword-help"
        />
        <Button
          type="button"
          size="icon"
          variant="secondary"
          onClick={handleAdd}
          disabled={!inputValue.trim()}
          aria-label="Add keyword"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <p id="keyword-help" className="text-xs text-muted-foreground">
        Press Enter or click + to add. Stories will be filtered to match any keyword.
      </p>

      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1" role="list" aria-label="Active keyword filters">
          {keywords.map((keyword) => (
            <Badge
              key={keyword}
              variant="secondary"
              className="gap-1 pr-1"
              role="listitem"
            >
              {keyword}
              <button
                type="button"
                onClick={() => onRemoveKeyword(keyword)}
                className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                aria-label={`Remove ${keyword} filter`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
