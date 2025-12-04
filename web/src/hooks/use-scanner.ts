'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  ScannerDashboard,
  ScanRequest,
  ScanResponse,
  TrendingTopic,
  RSSFeed,
  AITrendPrediction,
  AddFeedRequest,
  ValidateFeedResponse,
} from '@/types/scanner';

// === Query Keys ===

export const scannerKeys = {
  all: ['scanner'] as const,
  dashboard: () => [...scannerKeys.all, 'dashboard'] as const,
  trending: () => [...scannerKeys.all, 'trending'] as const,
  feeds: () => [...scannerKeys.all, 'feeds'] as const,
  config: () => [...scannerKeys.all, 'config'] as const,
};

// === Dashboard ===

export function useScannerDashboard() {
  return useQuery({
    queryKey: scannerKeys.dashboard(),
    queryFn: async (): Promise<ScannerDashboard> => {
      const response = await fetch('/api/scanner');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to load scanner data');
      }
      return response.json();
    },
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000, // Consider data stale after 30 seconds
  });
}

// === Trending Topics ===

export function useTrendingTopics() {
  return useQuery({
    queryKey: scannerKeys.trending(),
    queryFn: async (): Promise<TrendingTopic[]> => {
      const response = await fetch('/api/scanner/trending');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to load trending topics');
      }
      return response.json();
    },
    staleTime: 30000,
  });
}

// === Manual Scan ===

export function useTriggerScan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options?: ScanRequest): Promise<ScanResponse> => {
      const response = await fetch('/api/scanner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options || {}),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Scan failed');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate all scanner queries to refresh data
      queryClient.invalidateQueries({ queryKey: scannerKeys.all });
    },
  });
}

// === RSS Feeds ===

export function useRSSFeeds() {
  return useQuery({
    queryKey: scannerKeys.feeds(),
    queryFn: async (): Promise<RSSFeed[]> => {
      const response = await fetch('/api/scanner/feeds');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to load feeds');
      }
      return response.json();
    },
  });
}

export function useAddRSSFeed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feed: AddFeedRequest): Promise<RSSFeed> => {
      const response = await fetch('/api/scanner/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feed),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add feed');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scannerKeys.feeds() });
    },
  });
}

export function useDeleteRSSFeed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feedId: string): Promise<void> => {
      const response = await fetch(`/api/scanner/feeds?id=${feedId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete feed');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scannerKeys.feeds() });
    },
  });
}

export function useValidateRSSFeed() {
  return useMutation({
    mutationFn: async (url: string): Promise<ValidateFeedResponse> => {
      const response = await fetch('/api/scanner/feeds', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Validation failed');
      }

      return response.json();
    },
  });
}

export function useToggleFeedEnabled() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ feedId, enabled }: { feedId: string; enabled: boolean }): Promise<RSSFeed> => {
      const response = await fetch(`/api/scanner/feeds?id=${feedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update feed');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scannerKeys.feeds() });
    },
  });
}

// === AI Prediction ===

export function useAIPrediction() {
  return useMutation({
    mutationFn: async (topicId: string): Promise<AITrendPrediction> => {
      const response = await fetch('/api/scanner/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Prediction failed');
      }

      return response.json();
    },
  });
}

export function useBatchPrediction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (topicIds: string[]): Promise<AITrendPrediction[]> => {
      const response = await fetch('/api/scanner/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicIds }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Batch prediction failed');
      }

      const data = await response.json();
      return data.predictions;
    },
    onSuccess: () => {
      // Refresh trending to show updated AI scores
      queryClient.invalidateQueries({ queryKey: scannerKeys.trending() });
    },
  });
}

// === Story Selection for Comparison ===

interface SelectedStory {
  id: string;
  title: string;
  url: string;
  sourceName: string;
}

// Local storage key for selected stories
const SELECTED_STORIES_KEY = 'scanner-selected-stories';

export function useStorySelection() {
  const getSelected = (): SelectedStory[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(SELECTED_STORIES_KEY);
    return stored ? JSON.parse(stored) : [];
  };

  const setSelected = (stories: SelectedStory[]) => {
    localStorage.setItem(SELECTED_STORIES_KEY, JSON.stringify(stories));
  };

  const addStory = (story: SelectedStory) => {
    const current = getSelected();
    if (current.length >= 5) return; // Max 5 for comparison
    if (current.some(s => s.id === story.id)) return; // Already selected
    setSelected([...current, story]);
  };

  const removeStory = (storyId: string) => {
    const current = getSelected();
    setSelected(current.filter(s => s.id !== storyId));
  };

  const clearSelection = () => {
    localStorage.removeItem(SELECTED_STORIES_KEY);
  };

  const isSelected = (storyId: string): boolean => {
    return getSelected().some(s => s.id === storyId);
  };

  return {
    getSelected,
    addStory,
    removeStory,
    clearSelection,
    isSelected,
  };
}
