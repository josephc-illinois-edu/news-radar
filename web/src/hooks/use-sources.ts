'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  NewsSource,
  SourcesResponse,
  CreateSourceRequest,
  UpdateSourceRequest,
} from '@/types/sources';

// === Query Keys ===

export const sourcesKeys = {
  all: ['sources'] as const,
  list: () => [...sourcesKeys.all, 'list'] as const,
  detail: (id: string) => [...sourcesKeys.all, 'detail', id] as const,
};

// === List Sources ===

export function useSources() {
  return useQuery({
    queryKey: sourcesKeys.list(),
    queryFn: async (): Promise<SourcesResponse> => {
      const response = await fetch('/api/sources');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to load sources');
      }
      return response.json();
    },
    staleTime: 60000, // Sources don't change often
  });
}

// === Get Single Source ===

export function useSource(id: string) {
  return useQuery({
    queryKey: sourcesKeys.detail(id),
    queryFn: async (): Promise<{ source: NewsSource }> => {
      const response = await fetch(`/api/sources/${id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to load source');
      }
      return response.json();
    },
    enabled: !!id,
  });
}

// === Create Source ===

export function useCreateSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSourceRequest): Promise<{ source: NewsSource }> => {
      const response = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create source');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sourcesKeys.all });
    },
  });
}

// === Update Source ===

export function useUpdateSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateSourceRequest;
    }): Promise<{ source: NewsSource }> => {
      const response = await fetch(`/api/sources/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update source');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: sourcesKeys.all });
      queryClient.invalidateQueries({ queryKey: sourcesKeys.detail(variables.id) });
    },
  });
}

// === Toggle Source Enabled ===

export function useToggleSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      enabled,
    }: {
      id: string;
      enabled: boolean;
    }): Promise<{ source: NewsSource }> => {
      const response = await fetch(`/api/sources/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: enabled }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to toggle source');
      }

      return response.json();
    },
    onMutate: async ({ id, enabled }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: sourcesKeys.list() });

      // Snapshot previous value
      const previousSources = queryClient.getQueryData<SourcesResponse>(sourcesKeys.list());

      // Optimistically update
      if (previousSources) {
        const updatedSources = previousSources.sources.map((s) =>
          s.id === id || s.slug === id ? { ...s, is_enabled: enabled } : s
        );
        queryClient.setQueryData<SourcesResponse>(sourcesKeys.list(), {
          sources: updatedSources,
          system: updatedSources.filter((s) => s.is_system),
          custom: updatedSources.filter((s) => !s.is_system),
        });
      }

      return { previousSources };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousSources) {
        queryClient.setQueryData(sourcesKeys.list(), context.previousSources);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: sourcesKeys.all });
    },
  });
}

// === Delete Source ===

export function useDeleteSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`/api/sources/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete source');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sourcesKeys.all });
    },
  });
}

// === Enabled Sources (for scanner) ===

export function useEnabledSources() {
  const { data, ...rest } = useSources();

  const enabledSources = data?.sources.filter((s) => s.is_enabled) || [];
  const enabledSlugs = enabledSources.map((s) => s.slug);

  return {
    ...rest,
    data: enabledSources,
    slugs: enabledSlugs,
  };
}
