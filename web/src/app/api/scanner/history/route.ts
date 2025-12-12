/**
 * Scanner History API
 * GET /api/scanner/history - List scan history
 * POST /api/scanner/history - Save a scan to history
 * DELETE /api/scanner/history - Clear all history
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';

export interface ScanHistoryEntry {
  id: string;
  scannedAt: string;
  config: {
    sources: string[];
    hoursBack: number;
    minScore: number;
    keywords: string[];
  };
  topicsFound: number;
  storiesFound: number;
  topTopics: string[];
  sourceStats?: Record<string, number>;
  errors?: string[];
}

// Demo history for when Supabase is not configured
function getDemoHistory(): ScanHistoryEntry[] {
  const now = new Date();
  return [
    {
      id: 'demo-1',
      scannedAt: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
      config: {
        sources: ['hackernews', 'lobsters', 'guardian'],
        hoursBack: 24,
        minScore: 0,
        keywords: [],
      },
      topicsFound: 12,
      storiesFound: 87,
      topTopics: ['artificial intelligence', 'climate change', 'cryptocurrency'],
    },
    {
      id: 'demo-2',
      scannedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      config: {
        sources: ['hackernews', 'lobsters'],
        hoursBack: 12,
        minScore: 50,
        keywords: ['ai'],
      },
      topicsFound: 8,
      storiesFound: 45,
      topTopics: ['machine learning', 'openai', 'llm'],
    },
    {
      id: 'demo-3',
      scannedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
      config: {
        sources: ['guardian', 'bbc'],
        hoursBack: 48,
        minScore: 0,
        keywords: [],
      },
      topicsFound: 15,
      storiesFound: 120,
      topTopics: ['politics', 'economy', 'technology'],
    },
  ];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Demo mode if Supabase not configured
    if (!isSupabaseConfigured()) {
      const demoHistory = getDemoHistory();
      return NextResponse.json({
        entries: demoHistory.slice(offset, offset + limit),
        total: demoHistory.length,
        demo: true,
      });
    }

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({
        entries: getDemoHistory(),
        total: 3,
        demo: true,
      });
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({
        entries: [],
        total: 0,
        error: 'Not authenticated',
      });
    }

    // Fetch history
    const { data, error, count } = await supabase
      .from('scan_history')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('scanned_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching scan history:', error);
      return NextResponse.json(
        { error: 'Failed to fetch history' },
        { status: 500 }
      );
    }

    const entries: ScanHistoryEntry[] = (data || []).map((row) => ({
      id: row.id,
      scannedAt: row.scanned_at,
      config: row.config,
      topicsFound: row.topics_found,
      storiesFound: row.stories_found,
      topTopics: row.top_topics || [],
      sourceStats: row.source_stats,
      errors: row.errors,
    }));

    return NextResponse.json({
      entries,
      total: count || 0,
    });
  } catch (error) {
    console.error('Scanner history GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get history' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Demo mode - just return success
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        id: `demo-${Date.now()}`,
        success: true,
        demo: true,
      });
    }

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({
        id: `demo-${Date.now()}`,
        success: true,
        demo: true,
      });
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Insert history entry
    const { data, error } = await supabase
      .from('scan_history')
      .insert({
        user_id: user.id,
        config: body.config,
        topics_found: body.topicsFound || 0,
        stories_found: body.storiesFound || 0,
        top_topics: body.topTopics || [],
        source_stats: body.sourceStats,
        errors: body.errors,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving scan history:', error);
      return NextResponse.json(
        { error: 'Failed to save history' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: data.id,
      success: true,
    });
  } catch (error) {
    console.error('Scanner history POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save history' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Demo mode
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: true, demo: true });
    }

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ success: true, demo: true });
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Delete all history for user
    const { error } = await supabase
      .from('scan_history')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('Error clearing scan history:', error);
      return NextResponse.json(
        { error: 'Failed to clear history' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Scanner history DELETE error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to clear history' },
      { status: 500 }
    );
  }
}
