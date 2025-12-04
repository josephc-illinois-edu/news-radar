/**
 * Tags API - List and Create
 * GET /api/tags - List all tags
 * POST /api/tags - Create new tag
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { CreateTagInput, ApiResponse, DBTag } from '@/types/database';

// Demo tags for when Supabase is not configured
const demoTags: DBTag[] = [
  { id: 'tag-1', name: 'Technology', slug: 'technology', created_at: new Date().toISOString() },
  { id: 'tag-2', name: 'Business', slug: 'business', created_at: new Date().toISOString() },
  { id: 'tag-3', name: 'AI', slug: 'ai', created_at: new Date().toISOString() },
];

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');

    // Return demo data if Supabase is not configured
    if (!supabase) {
      let filtered = [...demoTags];
      if (search) {
        filtered = filtered.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
      }
      return NextResponse.json({
        data: filtered,
        total: filtered.length,
        limit,
        offset,
        hasMore: false,
      });
    }

    let query = supabase
      .from('tags')
      .select('*', { count: 'exact' })
      .order('name', { ascending: true });

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    if (limit) {
      query = query.limit(limit);
    }

    if (offset) {
      query = query.range(offset, offset + limit - 1);
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
      limit,
      offset,
      hasMore: (count || 0) > offset + (data?.length || 0),
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
    const body: CreateTagInput = await request.json();

    if (!body.name) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const slug = body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // Return demo response if Supabase is not configured
    if (!supabase) {
      return NextResponse.json<ApiResponse<DBTag>>(
        { data: { id: `tag-${Date.now()}`, name: body.name, slug, created_at: new Date().toISOString() }, message: 'Tag created (demo mode)' },
        { status: 201 }
      );
    }

    const { data, error } = await supabase
      .from('tags')
      .insert({
        ...body,
        slug,
      })
      .select()
      .single();

    if (error) {
      // Handle duplicate tag
      if (error.code === '23505') {
        const { data: existing } = await supabase
          .from('tags')
          .select('*')
          .eq('slug', slug)
          .single();

        if (existing) {
          return NextResponse.json<ApiResponse<DBTag>>({
            data: existing,
            message: 'Tag already exists'
          });
        }
      }
      return NextResponse.json<ApiResponse<null>>(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<DBTag>>(
      { data, message: 'Tag created successfully' },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
