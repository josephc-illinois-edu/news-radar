'use client';

import { ReactNode, useState } from 'react';
import { TrendingUp, List, History, Search } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';

export type ResultsTab = 'trending' | 'stories' | 'history';

interface ResultsTabsProps {
  defaultTab?: ResultsTab;
  trendingContent: ReactNode;
  storiesContent: ReactNode;
  historyContent?: ReactNode;
  trendingCount?: number;
  storiesCount?: number;
  historyCount?: number;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  showSearch?: boolean;
}

export function ResultsTabs({
  defaultTab = 'trending',
  trendingContent,
  storiesContent,
  historyContent,
  trendingCount,
  storiesCount,
  historyCount,
  searchValue = '',
  onSearchChange,
  showSearch = true,
}: ResultsTabsProps) {
  const [activeTab, setActiveTab] = useState<ResultsTab>(defaultTab);

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => setActiveTab(v as ResultsTab)}
      className="space-y-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TabsList aria-label="Scanner results view">
          <TabsTrigger value="trending" className="gap-1.5">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Trending</span>
            {trendingCount !== undefined && (
              <span className="text-xs text-muted-foreground">({trendingCount})</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="stories" className="gap-1.5">
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">Stories</span>
            {storiesCount !== undefined && (
              <span className="text-xs text-muted-foreground">({storiesCount})</span>
            )}
          </TabsTrigger>
          {historyContent && (
            <TabsTrigger value="history" className="gap-1.5">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
              {historyCount !== undefined && (
                <span className="text-xs text-muted-foreground">({historyCount})</span>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        {showSearch && onSearchChange && (
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Filter results..."
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8"
              aria-label="Filter results"
            />
          </div>
        )}
      </div>

      <TabsContent value="trending" className="mt-0">
        {trendingContent}
      </TabsContent>

      <TabsContent value="stories" className="mt-0">
        {storiesContent}
      </TabsContent>

      {historyContent && (
        <TabsContent value="history" className="mt-0">
          {historyContent}
        </TabsContent>
      )}
    </Tabs>
  );
}
