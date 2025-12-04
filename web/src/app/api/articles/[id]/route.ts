/**
 * Single Article API - Get, Update, Delete
 * GET /api/articles/:id - Get article by ID
 * PATCH /api/articles/:id - Update article
 * DELETE /api/articles/:id - Delete article
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { UpdateArticleInput, ApiResponse, DBArticle } from '@/types/database';

type RouteContext = { params: Promise<{ id: string }> };

// Demo article for when Supabase is not configured
const getDemoArticle = (id: string): DBArticle => ({
  id,
  title: 'Demo Article',
  content: 'This is demo content for the article.',
  status: 'draft',
  view_count: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    // Return demo data if Supabase is not configured
    if (!supabase) {
      return NextResponse.json<ApiResponse<DBArticle>>({ data: getDemoArticle(id) });
    }

    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', id)
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

    return NextResponse.json<ApiResponse<DBArticle>>({ data });
  } catch (error) {
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const body: UpdateArticleInput = await request.json();

    // Return demo response if Supabase is not configured
    if (!supabase) {
      return NextResponse.json<ApiResponse<DBArticle>>({
        data: { ...getDemoArticle(id), ...body },
        message: 'Article updated (demo mode)'
      });
    }

    const { data, error } = await supabase
      .from('articles')
      .update(body)
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
      message: 'Article updated successfully'
    });
  } catch (error) {
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    // Return success if Supabase is not configured
    if (!supabase) {
      return NextResponse.json<ApiResponse<null>>({
        message: 'Article deleted (demo mode)'
      });
    }

    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json<ApiResponse<null>>(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<null>>({
      message: 'Article deleted successfully'
    });
  } catch (error) {
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
