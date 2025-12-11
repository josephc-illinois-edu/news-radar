'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  DBArticle,
  DBArticleRevision,
  DBSource,
  ArticleFilters,
  CreateArticleInput,
  UpdateArticleInput,
  PaginatedResponse,
  ApiResponse,
} from '@/types/database';

const API_BASE = '/api/articles';

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
export const articleKeys = {
  all: ['articles'] as const,
  lists: () => [...articleKeys.all, 'list'] as const,
  list: (filters: ArticleFilters) => [...articleKeys.lists(), filters] as const,
  details: () => [...articleKeys.all, 'detail'] as const,
  detail: (id: string) => [...articleKeys.details(), id] as const,
  revisions: (id: string) => [...articleKeys.detail(id), 'revisions'] as const,
  sources: (id: string) => [...articleKeys.detail(id), 'sources'] as const,
};

// Hooks
export function useArticles(filters: ArticleFilters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.platform) params.set('platform', filters.platform);
  if (filters.search) params.set('search', filters.search);
  if (filters.tagId) params.set('tagId', filters.tagId);
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.offset) params.set('offset', String(filters.offset));

  return useQuery({
    queryKey: articleKeys.list(filters),
    queryFn: () =>
      fetchJson<PaginatedResponse<DBArticle>>(`${API_BASE}?${params.toString()}`),
  });
}

export function useArticle(id: string) {
  return useQuery({
    queryKey: articleKeys.detail(id),
    queryFn: () => fetchJson<ApiResponse<DBArticle>>(`${API_BASE}/${id}`),
    enabled: !!id,
    select: (data) => data.data,
  });
}

export function useArticleRevisions(articleId: string) {
  return useQuery({
    queryKey: articleKeys.revisions(articleId),
    queryFn: () =>
      fetchJson<ApiResponse<DBArticleRevision[]>>(`${API_BASE}/${articleId}/revisions`),
    enabled: !!articleId,
    select: (data) => data.data,
  });
}

export function useArticleSources(articleId: string) {
  return useQuery({
    queryKey: articleKeys.sources(articleId),
    queryFn: () =>
      fetchJson<ApiResponse<DBSource[]>>(`${API_BASE}/${articleId}/sources`),
    enabled: !!articleId,
    select: (data) => data.data,
  });
}

export function useCreateArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateArticleInput) =>
      fetchJson<ApiResponse<DBArticle>>(API_BASE, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: articleKeys.lists() });
    },
  });
}

export function useUpdateArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...input }: UpdateArticleInput & { id: string }) =>
      fetchJson<ApiResponse<DBArticle>>(`${API_BASE}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: articleKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: articleKeys.lists() });
    },
  });
}

export function useDeleteArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      fetchJson<ApiResponse<null>>(`${API_BASE}/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: articleKeys.lists() });
    },
  });
}

export function usePublishArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      fetchJson<ApiResponse<DBArticle>>(`${API_BASE}/${id}/publish`, {
        method: 'POST',
      }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: articleKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: articleKeys.lists() });
    },
  });
}

export function useUpdateSubstack() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      fetchJson<ApiResponse<{ substackUrl: string }>>(`${API_BASE}/${id}/update-substack`, {
        method: 'POST',
      }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: articleKeys.detail(id) });
    },
  });
}
