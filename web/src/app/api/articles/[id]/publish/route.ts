/**
 * Publish Article API
 * POST /api/articles/:id/publish - Publish an article to Substack
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ApiResponse, DBArticle } from '@/types/database';

type RouteContext = { params: Promise<{ id: string }> };

// Check if Substack is configured
function isSubstackConfigured(): boolean {
  return !!(
    process.env.SUBSTACK_EMAIL &&
    process.env.SUBSTACK_PASSWORD &&
    process.env.SUBSTACK_PUBLICATION_URL
  );
}

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

    // Get the article
    const { data: article, error: fetchError } = await supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !article) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    // Publish to Substack if configured
    let substackResult = null;
    if (isSubstackConfigured()) {
      try {
        const { SubstackPublisher } = await import('@/lib/substack-publisher');
        const publisher = new SubstackPublisher();

        substackResult = await publisher.publish({
          id: article.id,
          title: article.title,
          content: article.content,
          created_at: article.created_at,
        });

        // Record the published post
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('published_posts').insert({
          article_id: id,
          platform: 'substack',
          status: substackResult.success ? 'published' : 'failed',
          url: substackResult.postUrl,
          post_id: substackResult.postId,
          published_at: substackResult.success ? new Date().toISOString() : null,
          error: substackResult.error,
          user_id: user?.id,
        });

        if (!substackResult.success) {
          return NextResponse.json<ApiResponse<null>>(
            { error: `Substack publishing failed: ${substackResult.error}` },
            { status: 500 }
          );
        }
      } catch (err) {
        console.error('Substack publish error:', err);
        return NextResponse.json<ApiResponse<null>>(
          { error: `Substack publishing failed: ${err instanceof Error ? err.message : 'Unknown error'}` },
          { status: 500 }
        );
      }
    }

    // Update article status
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
      return NextResponse.json<ApiResponse<null>>(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<DBArticle & { substackUrl?: string }>>({
      data: {
        ...data,
        substackUrl: substackResult?.postUrl,
      },
      message: substackResult?.postUrl
        ? `Article published to Substack: ${substackResult.postUrl}`
        : 'Article published successfully'
    });
  } catch (error) {
    console.error('Publish error:', error);
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
