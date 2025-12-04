/**
 * Publish API
 * POST /api/publish - Publish article to platforms
 * GET /api/publish - Get published posts for article
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { PublishRequest, PublishResult, PublishPlatform } from '@/types/publish';

// Simulated platform publishers (production would use real APIs)
async function publishToFacebook(content: string, imageUrl?: string): Promise<PublishResult> {
  // Facebook Graph API integration would go here
  return {
    platform: 'facebook',
    status: 'published',
    url: 'https://facebook.com/post/demo-123',
    postId: 'demo-123',
    publishedAt: new Date().toISOString(),
  };
}

async function publishToLinkedIn(content: string, imageUrl?: string): Promise<PublishResult> {
  // LinkedIn API integration would go here
  return {
    platform: 'linkedin',
    status: 'published',
    url: 'https://linkedin.com/feed/update/demo-456',
    postId: 'demo-456',
    publishedAt: new Date().toISOString(),
  };
}

async function publishToTwitter(content: string, imageUrl?: string): Promise<PublishResult> {
  // Twitter/X API integration would go here
  const truncated = content.length > 280 ? content.slice(0, 277) + '...' : content;
  return {
    platform: 'twitter',
    status: 'published',
    url: 'https://twitter.com/user/status/demo-789',
    postId: 'demo-789',
    publishedAt: new Date().toISOString(),
  };
}

async function publishToMedium(content: string, title?: string): Promise<PublishResult> {
  // Medium API integration would go here
  return {
    platform: 'medium',
    status: 'published',
    url: 'https://medium.com/@user/demo-article',
    postId: 'demo-article',
    publishedAt: new Date().toISOString(),
  };
}

async function publishToWordPress(content: string, title?: string): Promise<PublishResult> {
  // WordPress REST API integration would go here
  return {
    platform: 'wordpress',
    status: 'published',
    url: 'https://example.com/blog/demo-post',
    postId: 'demo-post',
    publishedAt: new Date().toISOString(),
  };
}

async function publishToGhost(content: string, title?: string): Promise<PublishResult> {
  // Ghost Admin API integration would go here
  return {
    platform: 'ghost',
    status: 'published',
    url: 'https://example.ghost.io/demo-post',
    postId: 'demo-post',
    publishedAt: new Date().toISOString(),
  };
}

const publishers: Record<PublishPlatform, (content: string, extra?: string) => Promise<PublishResult>> = {
  facebook: publishToFacebook,
  linkedin: publishToLinkedIn,
  twitter: publishToTwitter,
  medium: publishToMedium,
  wordpress: publishToWordPress,
  ghost: publishToGhost,
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check auth if Supabase is configured
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body: PublishRequest = await request.json();

    if (!body.articleId) {
      return NextResponse.json({ error: 'Article ID is required' }, { status: 400 });
    }

    if (!body.platforms || body.platforms.length === 0) {
      return NextResponse.json({ error: 'At least one platform is required' }, { status: 400 });
    }

    // Demo article for when Supabase is not configured
    let article = { id: body.articleId, title: 'Demo Article', content: 'Demo content for publishing.' };

    // Fetch the article if Supabase is configured
    if (supabase) {
      const { data, error: articleError } = await supabase
        .from('articles')
        .select('*')
        .eq('id', body.articleId)
        .single();

      if (articleError || !data) {
        return NextResponse.json({ error: 'Article not found' }, { status: 404 });
      }
      article = data;
    }

    // If scheduled, save the schedule and return
    if (body.scheduledAt) {
      const scheduledDate = new Date(body.scheduledAt);
      if (scheduledDate <= new Date()) {
        return NextResponse.json({ error: 'Scheduled time must be in the future' }, { status: 400 });
      }

      // Save scheduled posts if Supabase is configured
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        const scheduledPosts = body.platforms.map(platform => ({
          article_id: body.articleId,
          platform,
          status: 'scheduled',
          scheduled_at: body.scheduledAt,
          content: body.customContent?.[platform] || article.content,
          image_url: body.imageUrl,
          user_id: user?.id,
        }));

        const { data: savedPosts, error: saveError } = await supabase
          .from('published_posts')
          .insert(scheduledPosts)
          .select();

        if (saveError) {
          console.error('Failed to schedule posts:', saveError);
          return NextResponse.json({ error: 'Failed to schedule posts' }, { status: 500 });
        }

        return NextResponse.json({
          message: 'Posts scheduled successfully',
          scheduledAt: body.scheduledAt,
          posts: savedPosts,
        });
      }

      // Demo mode for scheduling
      return NextResponse.json({
        message: 'Posts scheduled successfully (demo mode)',
        scheduledAt: body.scheduledAt,
        posts: body.platforms.map(p => ({ platform: p, status: 'scheduled' })),
      });
    }

    // Publish immediately
    const results: PublishResult[] = [];

    for (const platform of body.platforms) {
      try {
        const content = body.customContent?.[platform] || article.content;
        const publisher = publishers[platform];
        const result = await publisher(content, article.title);
        results.push(result);

        // Save the published post record if Supabase is configured
        if (supabase) {
          const { data: { user } } = await supabase.auth.getUser();
          await supabase.from('published_posts').insert({
            article_id: body.articleId,
            platform,
            status: result.status,
            url: result.url,
            post_id: result.postId,
            published_at: result.publishedAt,
            user_id: user?.id,
          });
        }
      } catch (err) {
        results.push({
          platform,
          status: 'failed',
          error: err instanceof Error ? err.message : 'Publishing failed',
        });
      }
    }

    // Update article status if any publish succeeded
    const anySuccess = results.some(r => r.status === 'published');
    if (anySuccess && supabase) {
      await supabase
        .from('articles')
        .update({ status: 'published', published_at: new Date().toISOString() })
        .eq('id', body.articleId);
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Publish error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Publishing failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Return demo data if Supabase is not configured
    if (!supabase) {
      return NextResponse.json({ data: [] });
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const articleId = request.nextUrl.searchParams.get('articleId');

    let query = supabase
      .from('published_posts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (articleId) {
      query = query.eq('article_id', articleId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Fetch published posts error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}
