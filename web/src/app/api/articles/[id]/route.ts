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
  title: 'Demo Article: The Future of AI in Content Creation',
  content: `Artificial intelligence is transforming how we create and consume content. From automated writing assistants to image generation tools, AI is becoming an integral part of the creative process.

Key developments include:
- Large language models that can draft articles, stories, and marketing copy
- Image generation systems that create visuals from text descriptions
- Video synthesis tools that animate still images

The implications for content creators are significant. While some fear job displacement, others see AI as a powerful collaborator that enhances human creativity.

"AI won't replace writers, but writers who use AI will replace those who don't," says industry analyst Jane Smith.

What do you think about the future of AI in creative work? Share your thoughts in the comments.`,
  excerpt: 'Exploring how artificial intelligence is reshaping content creation',
  status: 'draft',
  platform: 'linkedin',
  word_count: 120,
  reading_time_minutes: 1,
  hashtags: ['#AI', '#ContentCreation', '#FutureOfWork'],
  featured_image_platform: 'linkedin',
  featured_image_style: 'modern',
  featured_image_url: undefined,
  featured_image_id: undefined,
  view_count: 42,
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
