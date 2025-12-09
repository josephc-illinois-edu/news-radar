/**
 * Sources utility - shared functions for fetching news sources from DB
 */
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import type { NewsSource, RSSSourceConfig } from '@/types/sources';
import { DEFAULT_SOURCES } from '@/types/sources';

/**
 * Get all enabled sources from database (or defaults in demo mode)
 */
export async function getEnabledSources(): Promise<NewsSource[]> {
  if (!isSupabaseConfigured()) {
    return DEFAULT_SOURCES.filter(s => s.is_enabled);
  }

  const supabase = await createClient();
  if (!supabase) {
    return DEFAULT_SOURCES.filter(s => s.is_enabled);
  }

  const { data: sources, error } = await supabase
    .from('news_sources')
    .select('*')
    .eq('is_enabled', true);

  if (error || !sources) {
    console.error('Failed to fetch sources:', error);
    return DEFAULT_SOURCES.filter(s => s.is_enabled);
  }

  return sources;
}

/**
 * Get all sources (enabled and disabled) from database
 */
export async function getAllSources(): Promise<NewsSource[]> {
  if (!isSupabaseConfigured()) {
    return DEFAULT_SOURCES;
  }

  const supabase = await createClient();
  if (!supabase) {
    return DEFAULT_SOURCES;
  }

  const { data: sources, error } = await supabase
    .from('news_sources')
    .select('*')
    .order('is_system', { ascending: false })
    .order('name');

  if (error || !sources) {
    console.error('Failed to fetch sources:', error);
    return DEFAULT_SOURCES;
  }

  return sources;
}

/**
 * Get source by slug
 */
export async function getSourceBySlug(slug: string): Promise<NewsSource | null> {
  if (!isSupabaseConfigured()) {
    return DEFAULT_SOURCES.find(s => s.slug === slug) || null;
  }

  const supabase = await createClient();
  if (!supabase) {
    return DEFAULT_SOURCES.find(s => s.slug === slug) || null;
  }

  const { data: source, error } = await supabase
    .from('news_sources')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !source) {
    return null;
  }

  return source;
}

/**
 * Get feed URLs from a source's config
 */
export function getSourceFeedUrls(source: NewsSource): string[] {
  const config = source.config as RSSSourceConfig;
  return config.urls || (config.url ? [config.url] : []);
}

/**
 * Get enabled source slugs (for backward compatibility)
 */
export async function getEnabledSourceSlugs(): Promise<string[]> {
  const sources = await getEnabledSources();
  return sources.map(s => s.slug);
}
