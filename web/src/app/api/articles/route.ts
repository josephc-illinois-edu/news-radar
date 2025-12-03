/**
 * Articles API - List and Create
 * GET /api/articles - List articles with filters
 * POST /api/articles - Create new article
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ArticleFilters, CreateArticleInput, ApiResponse, DBArticle } from '@/types/database';

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

    let query = supabase
      .from('articles')
      .select('*', { count: 'exact' })
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
