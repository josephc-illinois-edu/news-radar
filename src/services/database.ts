/**
 * @fileoverview Supabase Database Service
 * @description Service layer for database operations with type safety
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { GeneratedArticle } from '../types.js';
import type { FetchedContent } from '../utils/content-fetcher.js';

/**
 * Database types matching Supabase schema
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

/**
 * Input types for creating records
 */

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

export interface CreateSourceInput {
  article_id: string;
  url: string;
  title?: string;
  author?: string;
  published_date?: Date;
  source_name?: string;
  facts?: string[];
  quotes?: string[];
  numbers?: string[];
  similarity_score?: number;
  matched_phrases?: string[];
}

/**
 * Database Service Class
 */
export class DatabaseService {
  private supabase: SupabaseClient;
  private userId?: string;

  constructor(userId?: string) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        'Missing Supabase credentials. Add SUPABASE_URL and SUPABASE_ANON_KEY to your .env file.'
      );
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.userId = userId;
  }

  /**
   * Set the user ID for operations that require authentication
   */
  setUserId(userId: string): void {
    this.userId = userId;
  }

  // ==================== ARTICLES ====================

  /**
   * Create a new article
   */
  async createArticle(input: CreateArticleInput): Promise<DBArticle> {
    const { data, error } = await this.supabase
      .from('articles')
      .insert({
        ...input,
        user_id: this.userId,
        status: input.status || 'draft',
        view_count: 0,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create article: ${error.message}`);
    return data;
  }

  /**
   * Get article by ID
   */
  async getArticle(id: string): Promise<DBArticle | null> {
    const { data, error } = await this.supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to get article: ${error.message}`);
    }

    return data;
  }

  /**
   * List articles with optional filters
   */
  async listArticles(options: {
    status?: 'draft' | 'published' | 'archived';
    limit?: number;
    offset?: number;
  } = {}): Promise<DBArticle[]> {
    let query = this.supabase
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false });

    if (options.status) {
      query = query.eq('status', options.status);
    }

    if (this.userId) {
      query = query.eq('user_id', this.userId);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to list articles: ${error.message}`);
    return data || [];
  }

  /**
   * Update article
   */
  async updateArticle(
    id: string,
    updates: Partial<CreateArticleInput>
  ): Promise<DBArticle> {
    const { data, error } = await this.supabase
      .from('articles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update article: ${error.message}`);
    return data;
  }

  /**
   * Delete article
   */
  async deleteArticle(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('articles')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete article: ${error.message}`);
  }

  /**
   * Publish article (change status to published)
   */
  async publishArticle(id: string): Promise<DBArticle> {
    const { data, error } = await this.supabase
      .from('articles')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to publish article: ${error.message}`);
    return data;
  }

  /**
   * Archive article
   */
  async archiveArticle(id: string): Promise<DBArticle> {
    return this.updateArticle(id, { status: 'archived' });
  }

  // ==================== SOURCES ====================

  /**
   * Add source to article
   */
  async createSource(input: CreateSourceInput): Promise<DBSource> {
    const { data, error } = await this.supabase
      .from('sources')
      .insert({
        ...input,
        published_date: input.published_date?.toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create source: ${error.message}`);
    return data;
  }

  /**
   * Get sources for an article
   */
  async getArticleSources(articleId: string): Promise<DBSource[]> {
    const { data, error } = await this.supabase
      .from('sources')
      .select('*')
      .eq('article_id', articleId);

    if (error) throw new Error(`Failed to get sources: ${error.message}`);
    return data || [];
  }

  // ==================== REVISIONS ====================

  /**
   * Create article revision
   */
  async createRevision(
    articleId: string,
    title: string,
    content: string,
    changeSummary?: string
  ): Promise<DBArticleRevision> {
    // Get the current version number
    const { data: revisions, error: countError } = await this.supabase
      .from('article_revisions')
      .select('version_number')
      .eq('article_id', articleId)
      .order('version_number', { ascending: false })
      .limit(1);

    if (countError) throw new Error(`Failed to count revisions: ${countError.message}`);

    const nextVersion = revisions && revisions.length > 0 ? revisions[0].version_number + 1 : 1;

    const { data, error } = await this.supabase
      .from('article_revisions')
      .insert({
        article_id: articleId,
        title,
        content,
        version_number: nextVersion,
        change_summary: changeSummary,
        user_id: this.userId,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create revision: ${error.message}`);
    return data;
  }

  /**
   * Get revisions for an article
   */
  async getArticleRevisions(articleId: string): Promise<DBArticleRevision[]> {
    const { data, error } = await this.supabase
      .from('article_revisions')
      .select('*')
      .eq('article_id', articleId)
      .order('version_number', { ascending: false });

    if (error) throw new Error(`Failed to get revisions: ${error.message}`);
    return data || [];
  }

  // ==================== TAGS ====================

  /**
   * Create tag
   */
  async createTag(name: string, description?: string, color?: string): Promise<DBTag> {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const { data, error } = await this.supabase
      .from('tags')
      .insert({ name, slug, description, color })
      .select()
      .single();

    if (error) {
      // Tag might already exist
      if (error.code === '23505') {
        const { data: existing } = await this.supabase
          .from('tags')
          .select('*')
          .eq('slug', slug)
          .single();
        if (existing) return existing;
      }
      throw new Error(`Failed to create tag: ${error.message}`);
    }

    return data;
  }

  /**
   * Get or create tag by name
   */
  async getOrCreateTag(name: string): Promise<DBTag> {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const { data: existing } = await this.supabase
      .from('tags')
      .select('*')
      .eq('slug', slug)
      .single();

    if (existing) return existing;

    return this.createTag(name);
  }

  /**
   * Add tag to article
   */
  async addTagToArticle(articleId: string, tagId: string): Promise<void> {
    const { error } = await this.supabase
      .from('article_tags')
      .insert({ article_id: articleId, tag_id: tagId });

    if (error && error.code !== '23505') {
      // Ignore duplicate key errors
      throw new Error(`Failed to add tag to article: ${error.message}`);
    }
  }

  /**
   * Get tags for an article
   */
  async getArticleTags(articleId: string): Promise<DBTag[]> {
    const { data, error } = await this.supabase
      .from('article_tags')
      .select('tags(*)')
      .eq('article_id', articleId);

    if (error) throw new Error(`Failed to get article tags: ${error.message}`);
    return (data || []).map((item: any) => item.tags);
  }

  // ==================== ANALYTICS ====================

  /**
   * Track analytics event
   */
  async trackEvent(
    articleId: string,
    eventType: 'view' | 'share' | 'copy' | 'export',
    platform?: string
  ): Promise<void> {
    const { error } = await this.supabase.from('analytics_events').insert({
      article_id: articleId,
      event_type: eventType,
      platform,
      user_id: this.userId,
    });

    if (error) throw new Error(`Failed to track event: ${error.message}`);

    // Increment view count on article if it's a view event
    if (eventType === 'view') {
      await this.supabase.rpc('increment_view_count', { article_id: articleId });
    }
  }

  /**
   * Get analytics for an article
   */
  async getArticleAnalytics(articleId: string): Promise<{
    total_views: number;
    total_shares: number;
    total_copies: number;
    total_exports: number;
  }> {
    const { data, error } = await this.supabase
      .from('analytics_events')
      .select('event_type')
      .eq('article_id', articleId);

    if (error) throw new Error(`Failed to get analytics: ${error.message}`);

    const events = data || [];
    return {
      total_views: events.filter((e) => e.event_type === 'view').length,
      total_shares: events.filter((e) => e.event_type === 'share').length,
      total_copies: events.filter((e) => e.event_type === 'copy').length,
      total_exports: events.filter((e) => e.event_type === 'export').length,
    };
  }

  // ==================== HELPER METHODS ====================

  /**
   * Save complete article with sources (convenience method)
   */
  async saveArticleWithSources(
    article: GeneratedArticle,
    sources: FetchedContent[],
    voiceConfig: {
      length: string;
      platform: string;
      style: string;
      tone: {
        humor: number;
        urgency: number;
        optimism: number;
        criticism: number;
      };
    }
  ): Promise<DBArticle> {
    // Create article
    const dbArticle = await this.createArticle({
      title: article.title,
      content: article.content,
      word_count: article.wordCount,
      reading_time_minutes: article.readingTimeMinutes,
      platform: voiceConfig.platform as any,
      length: voiceConfig.length as any,
      style: voiceConfig.style as any,
      tone_humor: voiceConfig.tone.humor,
      tone_urgency: voiceConfig.tone.urgency,
      tone_optimism: voiceConfig.tone.optimism,
      tone_criticism: voiceConfig.tone.criticism,
      keywords: article.citations.map((c) => c.replace(/^- \[.+\]\(.+\)$/, '')),
      hashtags: article.suggestedHashtags,
      status: 'draft',
    });

    // Create sources
    for (const source of sources) {
      await this.createSource({
        article_id: dbArticle.id,
        url: source.url,
        title: source.title,
        author: source.author,
        published_date: source.publishedDate,
        facts: source.facts,
        quotes: source.quotes,
        numbers: source.numbers,
      });
    }

    // Create initial revision
    await this.createRevision(
      dbArticle.id,
      article.title,
      article.content,
      'Initial version'
    );

    return dbArticle;
  }

  // ==================== TAGS ====================

  /**
   * Get tag by ID or slug
   */
  async getTag(idOrSlug: string): Promise<DBTag | null> {
    // Try by ID first
    let query = this.supabase.from('tags').select('*').eq('id', idOrSlug).single();
    let { data, error } = await query;

    // If not found, try by slug
    if (error || !data) {
      query = this.supabase.from('tags').select('*').eq('slug', idOrSlug).single();
      const result = await query;
      data = result.data;
      error = result.error;
    }

    if (error) return null;
    return data;
  }

  /**
   * List all tags
   */
  async listTags(options?: {
    limit?: number;
    offset?: number;
  }): Promise<DBTag[]> {
    let query = this.supabase
      .from('tags')
      .select('*')
      .order('name', { ascending: true });

    if (options?.limit) query = query.limit(options.limit);
    if (options?.offset) query = query.range(options.offset, options.offset + (options.limit || 20) - 1);

    const { data, error } = await query;

    if (error) throw new Error(`Failed to list tags: ${error.message}`);
    return data || [];
  }

  /**
   * Update tag
   */
  async updateTag(
    id: string,
    updates: {
      name?: string;
      description?: string;
      color?: string;
    }
  ): Promise<DBTag> {
    const updateData: any = { ...updates };

    // Update slug if name changed
    if (updates.name) {
      updateData.slug = updates.name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
    }

    const { data, error } = await this.supabase
      .from('tags')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update tag: ${error.message}`);
    return data;
  }

  /**
   * Delete tag
   */
  async deleteTag(id: string): Promise<void> {
    const { error } = await this.supabase.from('tags').delete().eq('id', id);

    if (error) throw new Error(`Failed to delete tag: ${error.message}`);
  }

  /**
   * Remove tag from article
   */
  async removeTagFromArticle(articleId: string, tagId: string): Promise<void> {
    const { error } = await this.supabase
      .from('article_tags')
      .delete()
      .eq('article_id', articleId)
      .eq('tag_id', tagId);

    if (error) throw new Error(`Failed to remove tag from article: ${error.message}`);
  }

  /**
   * Get all articles with a specific tag
   */
  async getArticlesByTag(tagId: string, options?: {
    status?: 'draft' | 'published' | 'archived';
    limit?: number;
  }): Promise<DBArticle[]> {
    let query = this.supabase
      .from('article_tags')
      .select('article_id, articles(*)')
      .eq('tag_id', tagId);

    const { data, error } = await query;

    if (error) throw new Error(`Failed to get articles by tag: ${error.message}`);

    let articles = (data || []).map((row: any) => row.articles);

    // Filter by status if specified
    if (options?.status) {
      articles = articles.filter((a: DBArticle) => a.status === options.status);
    }

    // Apply limit
    if (options?.limit) {
      articles = articles.slice(0, options.limit);
    }

    return articles;
  }

  /**
   * Get tag usage count
   */
  async getTagUsageCount(tagId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('article_tags')
      .select('*', { count: 'exact', head: true })
      .eq('tag_id', tagId);

    if (error) throw new Error(`Failed to get tag usage count: ${error.message}`);
    return count || 0;
  }
}

/**
 * Create database service instance
 */
export function createDatabaseService(userId?: string): DatabaseService {
  return new DatabaseService(userId);
}
