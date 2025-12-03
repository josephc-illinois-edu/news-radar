/**
 * Database types - shared between CLI and Web
 * Mirrors the schema from src/services/database.ts
 */

export interface DBUser {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

export interface DBArticle {
  id: string;
  user_id?: string;
  title: string;
  content: string;
  excerpt?: string;
  word_count?: number;
  reading_time_minutes?: number;
  platform?: 'facebook' | 'linkedin' | 'newsletter' | 'blog';
  length?: 'tweet' | 'short' | 'medium' | 'long';
  style?: 'conversational' | 'academic';
  tone_humor?: number;
  tone_urgency?: number;
  tone_optimism?: number;
  tone_criticism?: number;
  status: 'draft' | 'published' | 'archived';
  published_at?: string;
  keywords?: string[];
  hashtags?: string[];
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface DBArticleRevision {
  id: string;
  article_id: string;
  title: string;
  content: string;
  excerpt?: string;
  version_number: number;
  change_summary?: string;
  user_id?: string;
  created_at: string;
}

export interface DBSource {
  id: string;
  article_id: string;
  url: string;
  title?: string;
  author?: string;
  published_date?: string;
  source_name?: string;
  facts?: string[];
  quotes?: string[];
  numbers?: string[];
  similarity_score?: number;
  matched_phrases?: string[];
  created_at: string;
}

export interface DBTag {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  created_at: string;
}

export interface DBAnalyticsEvent {
  id: string;
  article_id: string;
  event_type: 'view' | 'share' | 'copy' | 'export';
  platform?: string;
  referrer?: string;
  user_agent?: string;
  user_id?: string;
  created_at: string;
}

// Input types for creating/updating records
export interface CreateArticleInput {
  title: string;
  content: string;
  excerpt?: string;
  word_count?: number;
  reading_time_minutes?: number;
  platform?: 'facebook' | 'linkedin' | 'newsletter' | 'blog';
  length?: 'tweet' | 'short' | 'medium' | 'long';
  style?: 'conversational' | 'academic';
  tone_humor?: number;
  tone_urgency?: number;
  tone_optimism?: number;
  tone_criticism?: number;
  keywords?: string[];
  hashtags?: string[];
  status?: 'draft' | 'published' | 'archived';
}

export interface UpdateArticleInput extends Partial<CreateArticleInput> {}

export interface CreateSourceInput {
  article_id: string;
  url: string;
  title?: string;
  author?: string;
  published_date?: string;
  source_name?: string;
  facts?: string[];
  quotes?: string[];
  numbers?: string[];
  similarity_score?: number;
  matched_phrases?: string[];
}

export interface CreateTagInput {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateTagInput extends Partial<CreateTagInput> {}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total?: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// Filter/Query types
export interface ArticleFilters {
  status?: 'draft' | 'published' | 'archived';
  platform?: string;
  search?: string;
  tagId?: string;
  limit?: number;
  offset?: number;
}

export interface TagFilters {
  search?: string;
  limit?: number;
  offset?: number;
}
