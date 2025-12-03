/**
 * Engagement API
 * GET /api/engage - List engagements with filters
 * POST /api/engage - Create reply to engagement
 * PATCH /api/engage - Update engagement status
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Engagement, EngagementFilters, EngagementStats } from '@/types/engage';

// Demo engagements (production would fetch from social APIs)
const demoEngagements: Engagement[] = [
  {
    id: 'eng-1',
    platform: 'twitter',
    type: 'comment',
    status: 'pending',
    postId: 'post-1',
    postUrl: 'https://twitter.com/user/status/123',
    authorId: 'user-1',
    authorName: 'Jane Smith',
    authorUsername: '@janesmith',
    authorFollowers: 1250,
    content: 'Great article! Really helped me understand the topic better.',
    sentiment: 'positive',
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    articleId: 'article-1',
  },
  {
    id: 'eng-2',
    platform: 'linkedin',
    type: 'comment',
    status: 'pending',
    postId: 'post-2',
    postUrl: 'https://linkedin.com/feed/update/456',
    authorId: 'user-2',
    authorName: 'Bob Johnson',
    authorUsername: 'bob-johnson-123',
    authorFollowers: 5800,
    content: 'Interesting perspective. Have you considered the impact on small businesses?',
    sentiment: 'neutral',
    createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    articleId: 'article-1',
  },
  {
    id: 'eng-3',
    platform: 'facebook',
    type: 'comment',
    status: 'pending',
    postId: 'post-3',
    postUrl: 'https://facebook.com/post/789',
    authorId: 'user-3',
    authorName: 'Alice Brown',
    authorFollowers: 320,
    content: 'This is misleading. The data clearly shows otherwise.',
    sentiment: 'negative',
    createdAt: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
    articleId: 'article-2',
  },
  {
    id: 'eng-4',
    platform: 'twitter',
    type: 'mention',
    status: 'pending',
    postId: 'post-4',
    postUrl: 'https://twitter.com/user/status/456',
    authorId: 'user-4',
    authorName: 'Tech News Daily',
    authorUsername: '@technewsdaily',
    authorFollowers: 45000,
    content: 'Sharing this excellent analysis from @newsradar - must read!',
    sentiment: 'positive',
    createdAt: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
    articleId: 'article-1',
  },
  {
    id: 'eng-5',
    platform: 'linkedin',
    type: 'like',
    status: 'pending',
    postId: 'post-2',
    authorId: 'user-5',
    authorName: 'Sarah Williams',
    authorUsername: 'sarah-williams',
    authorFollowers: 12500,
    createdAt: new Date(Date.now() - 600000).toISOString(), // 10 min ago
    articleId: 'article-1',
  },
];

function filterEngagements(engagements: Engagement[], filters: EngagementFilters): Engagement[] {
  return engagements.filter(eng => {
    if (filters.platform && eng.platform !== filters.platform) return false;
    if (filters.type && eng.type !== filters.type) return false;
    if (filters.status && eng.status !== filters.status) return false;
    if (filters.sentiment && eng.sentiment !== filters.sentiment) return false;
    if (filters.articleId && eng.articleId !== filters.articleId) return false;
    if (filters.search) {
      const search = filters.search.toLowerCase();
      const matchesContent = eng.content?.toLowerCase().includes(search);
      const matchesAuthor = eng.authorName.toLowerCase().includes(search);
      if (!matchesContent && !matchesAuthor) return false;
    }
    return true;
  });
}

function calculateStats(engagements: Engagement[]): EngagementStats {
  const stats: EngagementStats = {
    total: engagements.length,
    pending: 0,
    replied: 0,
    ignored: 0,
    flagged: 0,
    byPlatform: {} as any,
    byType: {} as any,
    bySentiment: {} as any,
  };

  engagements.forEach(eng => {
    // Status counts
    stats[eng.status]++;

    // By platform
    stats.byPlatform[eng.platform] = (stats.byPlatform[eng.platform] || 0) + 1;

    // By type
    stats.byType[eng.type] = (stats.byType[eng.type] || 0) + 1;

    // By sentiment
    if (eng.sentiment) {
      stats.bySentiment[eng.sentiment] = (stats.bySentiment[eng.sentiment] || 0) + 1;
    }
  });

  return stats;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const filters: EngagementFilters = {
      platform: searchParams.get('platform') as any,
      type: searchParams.get('type') as any,
      status: searchParams.get('status') as any,
      sentiment: searchParams.get('sentiment') as any,
      articleId: searchParams.get('articleId') || undefined,
      search: searchParams.get('search') || undefined,
    };

    // In production, fetch from database/social APIs
    const filtered = filterEngagements(demoEngagements, filters);
    const stats = calculateStats(demoEngagements);

    return NextResponse.json({
      data: filtered,
      stats,
      total: filtered.length,
    });
  } catch (error) {
    console.error('Fetch engagements error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch engagements' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { engagementId, content } = await request.json();

    if (!engagementId || !content) {
      return NextResponse.json(
        { error: 'Engagement ID and content are required' },
        { status: 400 }
      );
    }

    // In production, this would:
    // 1. Post reply via platform API
    // 2. Update engagement status in database

    return NextResponse.json({
      message: 'Reply posted successfully',
      engagement: {
        id: engagementId,
        status: 'replied',
        respondedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Reply error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to post reply' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { engagementIds, action } = await request.json();

    if (!engagementIds || !action) {
      return NextResponse.json(
        { error: 'Engagement IDs and action are required' },
        { status: 400 }
      );
    }

    const statusMap: Record<string, string> = {
      ignore: 'ignored',
      flag: 'flagged',
      unflag: 'pending',
    };

    const newStatus = statusMap[action];
    if (!newStatus) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    // In production, update database
    return NextResponse.json({
      message: `Updated ${engagementIds.length} engagement(s)`,
      status: newStatus,
    });
  } catch (error) {
    console.error('Update engagement error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update engagements' },
      { status: 500 }
    );
  }
}
