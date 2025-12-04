/**
 * Publish Article API
 * POST /api/articles/:id/publish - Publish an article
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ApiResponse, DBArticle } from '@/types/database';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    // Return demo response if Supabase is not configured
    if (!supabase) {
      return NextResponse.json<ApiResponse<DBArticle>>({
        data: {
          id,
          title: 'Demo Article',
          content: 'Demo content',
          status: 'published',
          view_count: 0,
          published_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        message: 'Article published (demo mode)'
      });
    }

    const { data, error } = await supabase
      .from('articles')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json<ApiResponse<null>>(
          { error: 'Article not found' },
          { status: 404 }
        );
      }
      return NextResponse.json<ApiResponse<null>>(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<DBArticle>>({
      data,
      message: 'Article published successfully'
    });
  } catch (error) {
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
