/**
 * @file Test suite for use-scanner.ts hooks
 * @description Tests for React Query hooks managing scanner functionality
 * 
 * Coverage targets:
 * - Query hooks: useScannerDashboard, useTrendingTopics, useRSSFeeds
 * - Mutation hooks: useTriggerScan, useAddRSSFeed, useDeleteRSSFeed, etc.
 * - Utility hooks: useStorySelection (localStorage)
 * 
 * @see web/src/hooks/use-scanner.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import {
  scannerKeys,
  useScannerDashboard,
  useTrendingTopics,
  useTriggerScan,
  useRSSFeeds,
  useAddRSSFeed,
  useDeleteRSSFeed,
  useValidateRSSFeed,
  useToggleFeedEnabled,
  useAIPrediction,
  useBatchPrediction,
  useStorySelection,
} from '../use-scanner';
import type { ScannerDashboard, TrendingTopic, RSSFeed } from '@/types/scanner';

// ============================================================================
// Test Setup
// ============================================================================

/**
 * Creates a fresh QueryClient for each test
 * Configured to disable retries and garbage collection for predictable tests
 */
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Wrapper component that provides React Query context
 */
function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// ============================================================================
// Mock Data
// ============================================================================

const mockDashboard: ScannerDashboard = {
  lastScanTime: new Date().toISOString(),
  totalStoriesScanned: 100,
  trendingTopics: [],
  topStories: [],
  sourceStats: [
    {
      sourceId: 'hackernews',
      sourceName: 'Hacker News',
      storiesFound: 25,
      avgEngagement: 150,
      lastSuccess: new Date().toISOString(),
      errorCount: 0,
    },
  ],
  recentScans: [],
};

const mockTrendingTopics: TrendingTopic[] = [
  {
    id: 'topic-1',
    name: 'AI Safety',
    slug: 'ai-safety',
    frequency: 15,
    sourceCount: 2,
    firstSeen: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    trendScore: 95,
    velocityScore: 80,
    aiPredictionScore: 75,
    relatedStories: ['story-1', 'story-2'],
    relatedKeywords: ['artificial intelligence', 'machine learning'],
  },
];

const mockRSSFeed: RSSFeed = {
  id: 'feed-1',
  url: 'https://example.com/feed.xml',
  name: 'Example Feed',
  category: 'tech',
  enabled: true,
  lastScanned: new Date().toISOString(),
  errorCount: 0,
  createdAt: new Date().toISOString(),
};

// ============================================================================
// Tests: Query Keys
// ============================================================================

describe('scannerKeys', () => {
  it('should return correct base key', () => {
    expect(scannerKeys.all).toEqual(['scanner']);
  });

  it('should return correct dashboard key', () => {
    expect(scannerKeys.dashboard()).toEqual(['scanner', 'dashboard']);
  });

  it('should return correct trending key', () => {
    expect(scannerKeys.trending()).toEqual(['scanner', 'trending']);
  });

  it('should return correct feeds key', () => {
    expect(scannerKeys.feeds()).toEqual(['scanner', 'feeds']);
  });

  it('should return correct config key', () => {
    expect(scannerKeys.config()).toEqual(['scanner', 'config']);
  });
});

// ============================================================================
// Tests: useScannerDashboard
// ============================================================================

describe('useScannerDashboard', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should fetch dashboard data successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockDashboard),
    });

    const { result } = renderHook(() => useScannerDashboard(), {
      wrapper: createWrapper(),
    });

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for data
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockDashboard);
    expect(mockFetch).toHaveBeenCalledWith('/api/scanner');
  });

  it('should handle fetch errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Server error' }),
    });

    const { result } = renderHook(() => useScannerDashboard(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Server error');
  });

  it('should use default error message when none provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({}),
    });

    const { result } = renderHook(() => useScannerDashboard(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Failed to load scanner data');
  });
});

// ============================================================================
// Tests: useTrendingTopics
// ============================================================================

describe('useTrendingTopics', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should fetch trending topics successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockTrendingTopics),
    });

    const { result } = renderHook(() => useTrendingTopics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockTrendingTopics);
    expect(mockFetch).toHaveBeenCalledWith('/api/scanner/trending');
  });

  it('should handle errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Failed to load' }),
    });

    const { result } = renderHook(() => useTrendingTopics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Failed to load');
  });
});

// ============================================================================
// Tests: useTriggerScan (Mutation)
// ============================================================================

describe('useTriggerScan', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should trigger scan with default options', async () => {
    const scanResponse = { success: true, storiesFound: 42 };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(scanResponse),
    });

    const { result } = renderHook(() => useTriggerScan(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({});

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/scanner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
  });

  it('should trigger scan with custom options', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const { result } = renderHook(() => useTriggerScan(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ sources: ['hackernews'], hoursBack: 24 });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/scanner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sources: ['hackernews'], hoursBack: 24 }),
    });
  });

  it('should handle scan errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Rate limited' }),
    });

    const { result } = renderHook(() => useTriggerScan(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({});

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Rate limited');
  });
});

// ============================================================================
// Tests: RSS Feed Hooks
// ============================================================================

describe('useRSSFeeds', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should fetch RSS feeds', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([mockRSSFeed]),
    });

    const { result } = renderHook(() => useRSSFeeds(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([mockRSSFeed]);
  });
});

describe('useAddRSSFeed', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should add new RSS feed', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockRSSFeed),
    });

    const { result } = renderHook(() => useAddRSSFeed(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ url: 'https://example.com/feed.xml', name: 'Example', category: 'tech' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/scanner/feeds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/feed.xml', name: 'Example', category: 'tech' }),
    });
  });
});

describe('useDeleteRSSFeed', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should delete RSS feed by ID', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });

    const { result } = renderHook(() => useDeleteRSSFeed(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('feed-1');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/scanner/feeds?id=feed-1', {
      method: 'DELETE',
    });
  });
});

// ============================================================================
// Tests: useStorySelection (localStorage)
// ============================================================================

describe('useStorySelection', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('should return empty array when no stories selected', () => {
    const { result } = renderHook(() => useStorySelection());
    expect(result.current.getSelected()).toEqual([]);
  });

  it('should add story to selection', () => {
    const { result } = renderHook(() => useStorySelection());
    
    const story = {
      id: 'story-1',
      title: 'Test Story',
      url: 'https://example.com',
      sourceName: 'Hacker News',
    };

    result.current.addStory(story);

    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('should not add more than 5 stories', () => {
    localStorageMock.getItem.mockReturnValue(JSON.stringify([
      { id: '1', title: 'Story 1', url: 'url1', sourceName: 'HN' },
      { id: '2', title: 'Story 2', url: 'url2', sourceName: 'HN' },
      { id: '3', title: 'Story 3', url: 'url3', sourceName: 'HN' },
      { id: '4', title: 'Story 4', url: 'url4', sourceName: 'HN' },
      { id: '5', title: 'Story 5', url: 'url5', sourceName: 'HN' },
    ]));

    const { result } = renderHook(() => useStorySelection());
    
    result.current.addStory({
      id: '6',
      title: 'Story 6',
      url: 'url6',
      sourceName: 'HN',
    });

    // setItem should not be called because we're at max capacity
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });

  it('should not add duplicate stories', () => {
    localStorageMock.getItem.mockReturnValue(JSON.stringify([
      { id: 'story-1', title: 'Story 1', url: 'url1', sourceName: 'HN' },
    ]));

    const { result } = renderHook(() => useStorySelection());
    
    result.current.addStory({
      id: 'story-1', // Same ID
      title: 'Story 1',
      url: 'url1',
      sourceName: 'HN',
    });

    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });

  it('should remove story from selection', () => {
    localStorageMock.getItem.mockReturnValue(JSON.stringify([
      { id: 'story-1', title: 'Story 1', url: 'url1', sourceName: 'HN' },
      { id: 'story-2', title: 'Story 2', url: 'url2', sourceName: 'HN' },
    ]));

    const { result } = renderHook(() => useStorySelection());
    result.current.removeStory('story-1');

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'scanner-selected-stories',
      JSON.stringify([{ id: 'story-2', title: 'Story 2', url: 'url2', sourceName: 'HN' }])
    );
  });

  it('should clear all selections', () => {
    const { result } = renderHook(() => useStorySelection());
    result.current.clearSelection();

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('scanner-selected-stories');
  });

  it('should check if story is selected', () => {
    localStorageMock.getItem.mockReturnValue(JSON.stringify([
      { id: 'story-1', title: 'Story 1', url: 'url1', sourceName: 'HN' },
    ]));

    const { result } = renderHook(() => useStorySelection());

    expect(result.current.isSelected('story-1')).toBe(true);
    expect(result.current.isSelected('story-999')).toBe(false);
  });
});

// ============================================================================
// Placeholder Tests (To Be Implemented)
// ============================================================================

describe.todo('useValidateRSSFeed');
describe.todo('useToggleFeedEnabled');
describe.todo('useAIPrediction');
describe.todo('useBatchPrediction');
