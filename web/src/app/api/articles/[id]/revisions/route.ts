/**
 * Article Revisions API
 * GET /api/articles/:id/revisions - Get revision history
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ApiResponse, DBArticleRevision } from '@/types/database';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('article_revisions')
      .select('*')
      .eq('article_id', id)
      .order('version_number', { ascending: false });

    if (error) {
      return NextResponse.json<ApiResponse<null>>(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<DBArticleRevision[]>>({ data: data || [] });
  } catch (error) {
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
