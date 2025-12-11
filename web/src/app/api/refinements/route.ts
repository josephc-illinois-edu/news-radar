/**
 * Refinements API
 * POST /api/refinements - Log a refinement event for preference learning
 * GET /api/refinements - Get refinement history for an article
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { CreateRefinementInput, DBArticleRefinement } from '@/types/refinement';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: CreateRefinementInput = await request.json();

    // Validate required fields
    if (!body.article_id) {
      return NextResponse.json(
        { success: false, error: 'article_id is required' },
        { status: 400 }
      );
    }

    if (!body.selection_text?.trim()) {
      return NextResponse.json(
        { success: false, error: 'selection_text is required' },
        { status: 400 }
      );
    }

    if (!body.feedback_type) {
      return NextResponse.json(
        { success: false, error: 'feedback_type is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Demo mode if Supabase is not configured
    if (!supabase) {
      console.log('[Refinement logged - no Supabase]:', {
        article_id: body.article_id,
        feedback_type: body.feedback_type,
        applied: body.applied,
      });

      return NextResponse.json({
        success: true,
        data: {
          id: crypto.randomUUID(),
          logged: true,
          demo_mode: true,
        },
      });
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      // Allow anonymous logging in demo mode - just log locally
      console.log('[Refinement logged - no auth]:', {
        article_id: body.article_id,
        feedback_type: body.feedback_type,
        applied: body.applied,
      });

      return NextResponse.json({
        success: true,
        data: {
          id: crypto.randomUUID(),
          logged: true,
          demo_mode: true,
        },
      });
    }

    // Insert refinement record
    const { data, error } = await supabase
      .from('article_refinements')
      .insert({
        article_id: body.article_id,
        user_id: user.id,
        selection_text: body.selection_text,
        selection_start: body.selection_start,
        selection_end: body.selection_end,
        feedback_type: body.feedback_type,
        instruction: body.instruction,
        before_text: body.before_text,
        after_text: body.after_text,
        applied: body.applied,
        model: body.model,
        tokens_used: body.tokens_used,
        cost: body.cost,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to log refinement:', error);
      // Don't fail the request - refinement logging is non-critical
      return NextResponse.json({
        success: true,
        data: {
          id: crypto.randomUUID(),
          logged: false,
          error: error.message,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        logged: true,
      },
    });
  } catch (error) {
    console.error('Refinement API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to log refinement' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get('article_id');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const supabase = await createClient();

    // Demo mode if Supabase is not configured
    if (!supabase) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    let query = supabase
      .from('article_refinements')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (articleId) {
      query = query.eq('article_id', articleId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch refinements:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch refinements' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data as DBArticleRefinement[],
    });
  } catch (error) {
    console.error('Refinement API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch refinements' },
      { status: 500 }
    );
  }
}
