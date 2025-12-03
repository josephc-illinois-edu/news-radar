/**
 * Analytics API
 * GET /api/analytics - Get analytics dashboard data
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { AnalyticsDashboard, TimeRange, TimeSeriesDataPoint } from '@/types/analytics';

function generateTimeSeries(days: number, baseValue: number, variance: number): TimeSeriesDataPoint[] {
  const data: TimeSeriesDataPoint[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.floor(baseValue + (Math.random() - 0.5) * variance * 2),
    });
  }

  return data;
}

function getDaysFromRange(range: TimeRange): number {
  const mapping: Record<TimeRange, number> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365,
    'all': 365,
  };
  return mapping[range] || 30;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const timeRange = (searchParams.get('timeRange') || '30d') as TimeRange;
    const days = getDaysFromRange(timeRange);

    // In production, these would be calculated from real data
    const dashboard: AnalyticsDashboard = {
      overview: {
        totalArticles: 47,
        totalPublished: 38,
        totalViews: 12450,
        totalEngagements: 1823,
        avgReadTime: 4.2,
        topPlatform: 'linkedin',
      },
      timeSeries: {
        views: generateTimeSeries(Math.min(days, 30), 400, 150),
        engagements: generateTimeSeries(Math.min(days, 30), 60, 25),
        articles: generateTimeSeries(Math.min(days, 30), 2, 1),
      },
      platformMetrics: [
        {
          platform: 'linkedin',
          posts: 15,
          views: 5200,
          engagements: 823,
          clicks: 412,
          shares: 145,
          engagementRate: 15.8,
        },
        {
          platform: 'twitter',
          posts: 12,
          views: 3800,
          engagements: 512,
          clicks: 234,
          shares: 89,
          engagementRate: 13.5,
        },
        {
          platform: 'facebook',
          posts: 8,
          views: 2100,
          engagements: 312,
          clicks: 156,
          shares: 67,
          engagementRate: 14.9,
        },
        {
          platform: 'medium',
          posts: 3,
          views: 1350,
          engagements: 176,
          clicks: 89,
          shares: 23,
          engagementRate: 13.0,
        },
      ],
      topArticles: [
        {
          id: 'art-1',
          title: 'The Future of AI in Content Creation',
          publishedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
          platform: 'linkedin',
          views: 2340,
          engagements: 345,
          clicks: 189,
          shares: 56,
          engagementRate: 14.7,
        },
        {
          id: 'art-2',
          title: '10 Productivity Tips for Remote Workers',
          publishedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
          platform: 'facebook',
          views: 1890,
          engagements: 278,
          clicks: 134,
          shares: 45,
          engagementRate: 14.7,
        },
        {
          id: 'art-3',
          title: 'Understanding Market Trends in 2025',
          publishedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
          platform: 'twitter',
          views: 1560,
          engagements: 234,
          clicks: 98,
          shares: 67,
          engagementRate: 15.0,
        },
        {
          id: 'art-4',
          title: 'How to Build a Personal Brand',
          publishedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
          platform: 'linkedin',
          views: 1230,
          engagements: 189,
          clicks: 87,
          shares: 34,
          engagementRate: 15.4,
        },
        {
          id: 'art-5',
          title: 'The Impact of Climate Change on Business',
          publishedAt: new Date(Date.now() - 86400000 * 14).toISOString(),
          platform: 'medium',
          views: 980,
          engagements: 145,
          clicks: 56,
          shares: 23,
          engagementRate: 14.8,
        },
      ],
      contentAnalytics: {
        byLength: [
          { length: 'Short (200-400)', count: 12, avgEngagement: 12.3 },
          { length: 'Medium (600-900)', count: 18, avgEngagement: 15.8 },
          { length: 'Long (1200+)', count: 8, avgEngagement: 11.2 },
        ],
        byStyle: [
          { style: 'Conversational', count: 25, avgEngagement: 14.5 },
          { style: 'Academic', count: 13, avgEngagement: 12.8 },
        ],
        byTone: [
          { tone: 'Optimistic', count: 15, avgEngagement: 16.2 },
          { tone: 'Balanced', count: 18, avgEngagement: 13.4 },
          { tone: 'Critical', count: 5, avgEngagement: 11.8 },
        ],
        bestPublishTime: [
          { hour: 9, avgEngagement: 15.2 },
          { hour: 12, avgEngagement: 14.8 },
          { hour: 17, avgEngagement: 16.1 },
          { hour: 20, avgEngagement: 13.5 },
        ],
      },
    };

    return NextResponse.json(dashboard);
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
