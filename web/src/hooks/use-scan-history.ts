'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ScanConfig } from '@/types/scanner';

// === Types ===

export interface ScanHistoryEntry {
  id: string;
  scannedAt: string;
  config: ScanConfig;
  topicsFound: number;
  storiesFound: number;
  topTopics: string[];
  sourceStats?: Record<string, number>;
  errors?: string[];
}

export interface ScanHistoryResponse {
  entries: ScanHistoryEntry[];
  total: number;
  demo?: boolean;
}

export interface SaveHistoryRequest {
  config: ScanConfig;
  topicsFound: number;
  storiesFound: number;
  topTopics: string[];
  sourceStats?: Record<string, number>;
  errors?: string[];
}

// === Query Keys ===

export const historyKeys = {
  all: ['scanner', 'history'] as const,
  list: (params?: { limit?: number; offset?: number }) =>
    [...historyKeys.all, 'list', params] as const,
};

// === Hooks ===

/**
 * Fetch scan history with pagination
 */
export function useScanHistory(params?: { limit?: number; offset?: number }) {
  const { limit = 20, offset = 0 } = params || {};

  return useQuery({
    queryKey: historyKeys.list({ limit, offset }),
    queryFn: async (): Promise<ScanHistoryResponse> => {
      const searchParams = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      const response = await fetch(`/api/scanner/history?${searchParams}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to load scan history');
      }
      return response.json();
    },
    staleTime: 60000, // 1 minute
  });
}

/**
 * Save a scan to history
 */
export function useSaveToHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SaveHistoryRequest): Promise<{ id: string; success: boolean }> => {
      const response = await fetch('/api/scanner/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save to history');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: historyKeys.all });
    },
  });
}

/**
 * Clear all scan history
 */
export function useClearHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ success: boolean }> => {
      const response = await fetch('/api/scanner/history', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to clear history');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: historyKeys.all });
    },
  });
}

/**
 * Format history entry for display
 */
export function formatHistoryEntry(entry: ScanHistoryEntry) {
  const date = new Date(entry.scannedAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  let relativeTime: string;
  if (diffMins < 1) relativeTime = 'Just now';
  else if (diffMins < 60) relativeTime = `${diffMins}m ago`;
  else if (diffHours < 24) relativeTime = `${diffHours}h ago`;
  else if (diffDays < 7) relativeTime = `${diffDays}d ago`;
  else relativeTime = date.toLocaleDateString();

  return {
    ...entry,
    relativeTime,
    formattedDate: date.toLocaleString(),
    sourcesCount: entry.config.sources.length,
    hasErrors: (entry.errors?.length || 0) > 0,
  };
}
