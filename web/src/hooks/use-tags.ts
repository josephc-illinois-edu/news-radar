'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  DBTag,
  TagFilters,
  CreateTagInput,
  PaginatedResponse,
  ApiResponse,
} from '@/types/database';

const API_BASE = '/api/tags';

// Fetch helpers
async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

// Query keys
export const tagKeys = {
  all: ['tags'] as const,
  lists: () => [...tagKeys.all, 'list'] as const,
  list: (filters: TagFilters) => [...tagKeys.lists(), filters] as const,
  detail: (id: string) => [...tagKeys.all, 'detail', id] as const,
};

// Hooks
export function useTags(filters: TagFilters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.offset) params.set('offset', String(filters.offset));

  return useQuery({
    queryKey: tagKeys.list(filters),
    queryFn: () =>
      fetchJson<PaginatedResponse<DBTag>>(`${API_BASE}?${params.toString()}`),
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTagInput) =>
      fetchJson<ApiResponse<DBTag>>(API_BASE, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.lists() });
    },
  });
}
