'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TIME_RANGES,
  type AnalyticsDashboard,
  type TimeRange,
} from '@/types/analytics';
import { PLATFORM_INFO } from '@/types/publish';

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [data, setData] = useState<AnalyticsDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/analytics?timeRange=${timeRange}`);
      const result = await response.json();
      if (!response.ok || result.error) {
        setError(result.error || 'Failed to load analytics');
        setData(null);
      } else {
        setData(result);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setError('Failed to load analytics');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Loading analytics data...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-8 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Track your content performance</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{error || 'Failed to load analytics data'}</p>
            <Button onClick={loadAnalytics} variant="outline" className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Track your content performance</p>
        </div>
        <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TIME_RANGES).map(([id, config]) => (
              <SelectItem key={id} value={id}>{config.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Views</CardDescription>
            <CardTitle className="text-3xl">{formatNumber(data.overview.totalViews)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Across {data.overview.totalPublished} published articles
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Engagements</CardDescription>
            <CardTitle className="text-3xl">{formatNumber(data.overview.totalEngagements)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Likes, comments, shares combined
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg. Read Time</CardDescription>
            <CardTitle className="text-3xl">{data.overview.avgReadTime} min</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Average time readers spend
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Top Platform</CardDescription>
            <CardTitle className="text-3xl capitalize">
              {PLATFORM_INFO[data.overview.topPlatform]?.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Best performing platform
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Platform Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Performance</CardTitle>
            <CardDescription>Engagement metrics by platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.platformMetrics.map((platform) => (
                <div key={platform.platform} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {PLATFORM_INFO[platform.platform]?.name}
                      </span>
                      <Badge variant="outline">{platform.posts} posts</Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {platform.engagementRate.toFixed(1)}% engagement
                    </span>
                  </div>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>{formatNumber(platform.views)} views</span>
                    <span>{formatNumber(platform.engagements)} engagements</span>
                    <span>{formatNumber(platform.clicks)} clicks</span>
                    <span>{formatNumber(platform.shares)} shares</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${Math.min(platform.engagementRate * 5, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Articles */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Articles</CardTitle>
            <CardDescription>Articles with highest engagement</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.topArticles.map((article, i) => (
                <div key={article.id} className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-sm font-medium">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{article.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        {PLATFORM_INFO[article.platform]?.name}
                      </Badge>
                      <span>{formatNumber(article.views)} views</span>
                      <span>·</span>
                      <span>{article.engagementRate.toFixed(1)}% rate</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Analytics */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* By Length */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance by Length</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.contentAnalytics.byLength.map((item) => (
                <div key={item.length} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{item.length}</p>
                    <p className="text-xs text-muted-foreground">{item.count} articles</p>
                  </div>
                  <Badge variant={item.avgEngagement > 14 ? 'default' : 'secondary'}>
                    {item.avgEngagement.toFixed(1)}% avg
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* By Style */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance by Style</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.contentAnalytics.byStyle.map((item) => (
                <div key={item.style} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{item.style}</p>
                    <p className="text-xs text-muted-foreground">{item.count} articles</p>
                  </div>
                  <Badge variant={item.avgEngagement > 13 ? 'default' : 'secondary'}>
                    {item.avgEngagement.toFixed(1)}% avg
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Best Times */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Best Publishing Times</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.contentAnalytics.bestPublishTime.map((item) => (
                <div key={item.hour} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">
                      {item.hour === 0
                        ? '12 AM'
                        : item.hour < 12
                        ? `${item.hour} AM`
                        : item.hour === 12
                        ? '12 PM'
                        : `${item.hour - 12} PM`}
                    </p>
                  </div>
                  <Badge variant={item.avgEngagement > 15 ? 'default' : 'secondary'}>
                    {item.avgEngagement.toFixed(1)}% avg
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trends - Simple visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Trends</CardTitle>
          <CardDescription>Activity over time ({TIME_RANGES[timeRange].name})</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Views</span>
                <span className="text-sm text-muted-foreground">
                  {formatNumber(data.timeSeries.views.reduce((a, b) => a + b.value, 0))} total
                </span>
              </div>
              <div className="flex items-end gap-1 h-16">
                {data.timeSeries.views.slice(-14).map((point, i) => {
                  const max = Math.max(...data.timeSeries.views.map(p => p.value));
                  const height = (point.value / max) * 100;
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-primary/20 hover:bg-primary/40 transition-colors rounded-t"
                      style={{ height: `${height}%` }}
                      title={`${point.date}: ${point.value}`}
                    />
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Engagements</span>
                <span className="text-sm text-muted-foreground">
                  {formatNumber(data.timeSeries.engagements.reduce((a, b) => a + b.value, 0))} total
                </span>
              </div>
              <div className="flex items-end gap-1 h-16">
                {data.timeSeries.engagements.slice(-14).map((point, i) => {
                  const max = Math.max(...data.timeSeries.engagements.map(p => p.value));
                  const height = (point.value / max) * 100;
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-green-500/20 hover:bg-green-500/40 transition-colors rounded-t"
                      style={{ height: `${height}%` }}
                      title={`${point.date}: ${point.value}`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
