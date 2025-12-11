/**
 * Update Substack Article API
 * POST /api/articles/:id/update-substack - Update an already published article on Substack
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ApiResponse } from '@/types/database';

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

    if (!supabase) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Check Substack configuration
    if (!isSubstackConfigured()) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Substack not configured. Set SUBSTACK_EMAIL, SUBSTACK_PASSWORD, and SUBSTACK_PUBLICATION_URL.' },
        { status: 400 }
      );
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

    // Get the published post record for this article
    const { data: publishedPost } = await supabase
      .from('published_posts')
      .select('*')
      .eq('article_id', id)
      .eq('platform', 'substack')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(1)
      .single();

    try {
      const { SubstackPublisher } = await import('@/lib/substack-publisher');
      const publisher = new SubstackPublisher();

      // If we have an existing Substack post, update it. Otherwise, publish new.
      if (publishedPost?.post_url) {
        // Update existing post
        const result = await publisher.update(publishedPost.post_url, {
          id: article.id,
          title: article.title,
          content: article.content,
          created_at: article.created_at,
        });

        if (!result.success) {
          return NextResponse.json<ApiResponse<null>>(
            { error: `Substack update failed: ${result.error}` },
            { status: 500 }
          );
        }

        // Update the published_posts record
        await supabase
          .from('published_posts')
          .update({
            updated_at: new Date().toISOString(),
          })
          .eq('id', publishedPost.id);

        return NextResponse.json<ApiResponse<{ substackUrl: string }>>({
          data: { substackUrl: publishedPost.post_url },
          message: 'Article updated on Substack successfully'
        });

      } else {
        // No existing Substack post - publish new
        const result = await publisher.publish({
          id: article.id,
          title: article.title,
          content: article.content,
          created_at: article.created_at,
        });

        if (!result.success) {
          return NextResponse.json<ApiResponse<null>>(
            { error: `Substack publish failed: ${result.error}` },
            { status: 500 }
          );
        }

        // Record the published post
        await supabase.from('published_posts').insert({
          article_id: id,
          platform: 'substack',
          status: 'published',
          post_url: result.postUrl,
          external_post_id: result.postId,
          published_at: new Date().toISOString(),
        });

        // Update article status if not already published
        if (article.status !== 'published') {
          await supabase
            .from('articles')
            .update({
              status: 'published',
              published_at: new Date().toISOString()
            })
            .eq('id', id);
        }

        return NextResponse.json<ApiResponse<{ substackUrl: string }>>({
          data: { substackUrl: result.postUrl || '' },
          message: `Article published to Substack: ${result.postUrl}`
        });
      }

    } catch (err) {
      console.error('Substack error:', err);
      return NextResponse.json<ApiResponse<null>>(
        { error: `Substack operation failed: ${err instanceof Error ? err.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Update Substack error:', error);
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
