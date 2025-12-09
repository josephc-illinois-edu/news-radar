'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  ScanOptions,
  ScanResult,
  StoryResult,
  DiffAnalysis,
  ComparisonNote,
  ComparisonSession,
} from '@/types/research';

// === Query Keys ===

export const researchKeys = {
  all: ['research'] as const,
  scan: () => [...researchKeys.all, 'scan'] as const,
  comparison: (articleIds: string[]) => [...researchKeys.all, 'comparison', articleIds.sort().join(',')] as const,
  notes: (sessionId: string) => [...researchKeys.all, 'notes', sessionId] as const,
};

// === Scanning ===

async function scanSources(options: ScanOptions): Promise<ScanResult> {
  const response = await fetch('/api/research/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Scan failed');
  }

  return response.json();
}

export function useScanSources() {
  return useMutation({
    mutationFn: scanSources,
  });
}

// === Comparison Session ===

const COMPARISON_STORAGE_KEY = 'research-comparison-session';
const COMPARISON_NOTES_KEY = 'research-comparison-notes';

export function useComparisonSession(articleIds: string[]) {
  return useQuery({
    queryKey: researchKeys.comparison(articleIds),
    queryFn: async (): Promise<ComparisonSession | null> => {
      if (typeof window === 'undefined') return null;

      // Try to load from localStorage
      const storageKey = `${COMPARISON_STORAGE_KEY}-${articleIds.sort().join(',')}`;
      const stored = localStorage.getItem(storageKey);

      if (stored) {
        return JSON.parse(stored) as ComparisonSession;
      }

      return null;
    },
    enabled: articleIds.length >= 2,
  });
}

export function useSaveComparisonSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (session: ComparisonSession): Promise<ComparisonSession> => {
      const articleIds = session.articles.map(a => a.id);
      const storageKey = `${COMPARISON_STORAGE_KEY}-${articleIds.sort().join(',')}`;

      const updatedSession = {
        ...session,
        updatedAt: new Date().toISOString(),
      };

      localStorage.setItem(storageKey, JSON.stringify(updatedSession));
      return updatedSession;
    },
    onSuccess: (session) => {
      const articleIds = session.articles.map(a => a.id);
      queryClient.invalidateQueries({ queryKey: researchKeys.comparison(articleIds) });
    },
  });
}

// === AI Diff Analysis ===

export function useAIDiffAnalysis() {
  return useMutation({
    mutationFn: async (articles: StoryResult[]): Promise<DiffAnalysis> => {
      const response = await fetch('/api/research/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articles }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Analysis failed');
      }

      const { data } = await response.json();
      return data;
    },
  });
}

// === Comparison Notes (localStorage-based for MVP) ===

export function useComparisonNotes(sessionId: string) {
  const queryClient = useQueryClient();
  const storageKey = `${COMPARISON_NOTES_KEY}-${sessionId}`;

  const query = useQuery({
    queryKey: researchKeys.notes(sessionId),
    queryFn: (): ComparisonNote[] => {
      if (typeof window === 'undefined') return [];
      const stored = localStorage.getItem(storageKey);
      return stored ? (JSON.parse(stored) as ComparisonNote[]) : [];
    },
    enabled: !!sessionId,
  });

  const addNote = useMutation({
    mutationFn: async (note: Omit<ComparisonNote, 'id' | 'createdAt'>): Promise<ComparisonNote> => {
      const notes = query.data || [];
      const newNote: ComparisonNote = {
        ...note,
        id: `note-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        createdAt: new Date().toISOString(),
      };
      const updated = [...notes, newNote];
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return newNote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: researchKeys.notes(sessionId) });
    },
  });

  const deleteNote = useMutation({
    mutationFn: async (noteId: string): Promise<void> => {
      const notes = query.data || [];
      const updated = notes.filter(n => n.id !== noteId);
      localStorage.setItem(storageKey, JSON.stringify(updated));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: researchKeys.notes(sessionId) });
    },
  });

  const updateNote = useMutation({
    mutationFn: async ({ noteId, content }: { noteId: string; content: string }): Promise<ComparisonNote> => {
      const notes = query.data || [];
      const updated = notes.map(n =>
        n.id === noteId ? { ...n, content } : n
      );
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated.find(n => n.id === noteId)!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: researchKeys.notes(sessionId) });
    },
  });

  return {
    notes: query.data || [],
    isLoading: query.isLoading,
    addNote,
    deleteNote,
    updateNote,
  };
}

// === Article Selection for Comparison ===

const SELECTED_ARTICLES_KEY = 'research-selected-articles';

export function useArticleSelection() {
  const [selected, setSelectedState] = useState<StoryResult[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage after hydration to avoid mismatch
  useEffect(() => {
    const stored = localStorage.getItem(SELECTED_ARTICLES_KEY);
    if (stored) {
      setSelectedState(JSON.parse(stored));
    }
    setIsHydrated(true);
  }, []);

  const setSelected = useCallback((articles: StoryResult[]) => {
    setSelectedState(articles);
    localStorage.setItem(SELECTED_ARTICLES_KEY, JSON.stringify(articles));
  }, []);

  const addArticle = useCallback((article: StoryResult) => {
    setSelectedState(prev => {
      if (prev.length >= 5) return prev; // Max 5 articles
      if (prev.some(a => a.id === article.id)) return prev; // Already selected
      const updated = [...prev, article];
      localStorage.setItem(SELECTED_ARTICLES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeArticle = useCallback((articleId: string) => {
    setSelectedState(prev => {
      const updated = prev.filter(a => a.id !== articleId);
      localStorage.setItem(SELECTED_ARTICLES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedState([]);
    localStorage.removeItem(SELECTED_ARTICLES_KEY);
  }, []);

  const isSelected = useCallback((articleId: string): boolean => {
    return selected.some(a => a.id === articleId);
  }, [selected]);

  const toggleSelection = useCallback((article: StoryResult) => {
    if (isSelected(article.id)) {
      removeArticle(article.id);
    } else {
      addArticle(article);
    }
  }, [isSelected, removeArticle, addArticle]);

  return {
    selected,
    setSelected,
    addArticle,
    removeArticle,
    clearSelection,
    isSelected,
    toggleSelection,
    canAddMore: selected.length < 5,
    isHydrated,
  };
}
