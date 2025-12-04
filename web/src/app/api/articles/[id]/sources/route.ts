/**
 * Article Sources API
 * GET /api/articles/:id/sources - Get article sources
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ApiResponse, DBSource } from '@/types/database';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    // Return empty array if Supabase is not configured
    if (!supabase) {
      return NextResponse.json<ApiResponse<DBSource[]>>({ data: [] });
    }

    const { data, error } = await supabase
      .from('sources')
      .select('*')
      .eq('article_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json<ApiResponse<null>>(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<DBSource[]>>({ data: data || [] });
  } catch (error) {
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
