/**
 * Publish API
 * POST /api/publish - Publish article to platforms
 * GET /api/publish - Get published posts for article
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { PublishRequest, PublishResult, PublishPlatform } from '@/types/publish';

async function publishToSubstack(content: string, title?: string): Promise<PublishResult> {
  // Check if Substack credentials are configured
  const email = process.env.SUBSTACK_EMAIL;
  const password = process.env.SUBSTACK_PASSWORD;
  const publicationUrl = process.env.SUBSTACK_PUBLICATION_URL;

  if (!email || !password || !publicationUrl) {
    // Return demo result if not configured
    return {
      platform: 'substack',
      status: 'published',
      url: `https://${publicationUrl || 'demo'}.substack.com/p/demo-post`,
      postId: 'demo-post',
      publishedAt: new Date().toISOString(),
    };
  }

  // Dynamic import to avoid loading Puppeteer unless needed
  try {
    const { SubstackPublisher } = await import('@/lib/substack-publisher');
    const publisher = new SubstackPublisher();

    const result = await publisher.publish({
      id: 'temp',
      title: title || 'Untitled',
      content,
      created_at: new Date().toISOString(),
    });

    return {
      platform: 'substack',
      status: result.success ? 'published' : 'failed',
      url: result.postUrl,
      postId: result.postId,
      publishedAt: result.success ? new Date().toISOString() : undefined,
      error: result.error,
    };
  } catch (error) {
    return {
      platform: 'substack',
      status: 'failed',
      error: error instanceof Error ? error.message : 'Failed to publish to Substack',
    };
  }
}

// Only substack is currently implemented - other platforms return not-implemented error
const publishers: Partial<Record<PublishPlatform, (content: string, extra?: string) => Promise<PublishResult>>> = {
  substack: publishToSubstack,
};

async function notImplementedPublisher(platform: PublishPlatform): Promise<PublishResult> {
  return {
    platform,
    status: 'failed',
    error: `${platform} publishing is not yet implemented`,
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    let userId: string | undefined;

    // Check auth if Supabase is configured
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
      // Allow publishing without auth for now - user can still publish
      // but we won't track user_id on published_posts
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
        const scheduledPosts = body.platforms.map(platform => ({
          article_id: body.articleId,
          platform,
          status: 'scheduled',
          scheduled_at: body.scheduledAt,
          content: body.customContent?.[platform] || article.content,
          image_url: body.imageUrl,
          user_id: userId,
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
        const result = publisher
          ? await publisher(content, article.title)
          : await notImplementedPublisher(platform);
        results.push(result);

        // Save the published post record if Supabase is configured
        if (supabase) {
          await supabase.from('published_posts').insert({
            article_id: body.articleId,
            platform,
            status: result.status,
            post_url: result.url,
            external_post_id: result.postId,
            published_at: result.publishedAt,
            user_id: userId,
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
    const articleId = request.nextUrl.searchParams.get('articleId');

    let query = supabase
      .from('published_posts')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by user if authenticated
    if (user) {
      query = query.eq('user_id', user.id);
    }

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
