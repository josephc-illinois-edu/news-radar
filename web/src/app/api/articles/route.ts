/**
 * Articles API - List and Create
 * GET /api/articles - List articles with filters
 * POST /api/articles - Create new article
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ArticleFilters, CreateArticleInput, ApiResponse, DBArticle } from '@/types/database';

// Demo articles for when Supabase is not configured
const demoArticles: DBArticle[] = [
  {
    id: 'demo-1',
    title: 'Getting Started with News Radar Studio',
    content: 'Welcome to News Radar Studio! This is a demo article showing the capabilities of the platform.',
    status: 'published',
    platform: 'blog',
    word_count: 150,
    reading_time_minutes: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    view_count: 42,
  },
  {
    id: 'demo-2',
    title: 'AI-Powered Content Creation',
    content: 'Learn how to use AI to generate high-quality articles from multiple sources.',
    status: 'draft',
    platform: 'linkedin',
    word_count: 200,
    reading_time_minutes: 1,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    view_count: 0,
  },
  {
    id: 'demo-3',
    title: 'Multi-Platform Publishing Guide',
    content: 'Publish your content across Facebook, LinkedIn, Twitter, and more with a single click.',
    status: 'draft',
    platform: 'facebook',
    word_count: 350,
    reading_time_minutes: 2,
    created_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date(Date.now() - 172800000).toISOString(),
    view_count: 15,
  },
];

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const filters: ArticleFilters = {
      status: searchParams.get('status') as ArticleFilters['status'] || undefined,
      platform: searchParams.get('platform') || undefined,
      search: searchParams.get('search') || undefined,
      tagId: searchParams.get('tagId') || undefined,
      limit: parseInt(searchParams.get('limit') || '20'),
      offset: parseInt(searchParams.get('offset') || '0'),
    };

    // Return demo data if Supabase is not configured
    if (!supabase) {
      let filtered = [...demoArticles];
      if (filters.status) {
        filtered = filtered.filter(a => a.status === filters.status);
      }
      if (filters.search) {
        const search = filters.search.toLowerCase();
        filtered = filtered.filter(a =>
          a.title.toLowerCase().includes(search) ||
          a.content?.toLowerCase().includes(search)
        );
      }
      return NextResponse.json({
        data: filtered,
        total: filtered.length,
        limit: filters.limit || 20,
        offset: 0,
        hasMore: false,
      });
    }

    let query = supabase
      .from('articles')
      .select(`
        *,
        published_posts (
          id,
          platform,
          status,
          post_url,
          published_at,
          updated_at
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.platform) {
      query = query.eq('platform', filters.platform);
    }

    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json<ApiResponse<null>>(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: data || [],
      total: count,
      limit: filters.limit || 20,
      offset: filters.offset || 0,
      hasMore: (count || 0) > (filters.offset || 0) + (data?.length || 0),
    });
  } catch (error) {
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body: CreateArticleInput = await request.json();

    // Validate required fields
    if (!body.title || !body.content) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    // Return demo response if Supabase is not configured
    if (!supabase) {
      const demoArticle: DBArticle = {
        id: `demo-${Date.now()}`,
        ...body,
        status: body.status || 'draft',
        view_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return NextResponse.json<ApiResponse<DBArticle>>(
        { data: demoArticle, message: 'Article created (demo mode)' },
        { status: 201 }
      );
    }

    const { data, error } = await supabase
      .from('articles')
      .insert({
        ...body,
        status: body.status || 'draft',
        view_count: 0,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json<ApiResponse<null>>(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<DBArticle>>(
      { data, message: 'Article created successfully' },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
