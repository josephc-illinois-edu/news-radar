'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ENGAGEMENT_TYPES,
  SENTIMENT_CONFIG,
  STATUS_CONFIG,
  type Engagement,
  type EngagementStats,
  type EngagementStatus,
  type SuggestedReply,
} from '@/types/engage';
import { PLATFORM_INFO } from '@/types/publish';

export default function EngagePage() {
  // State
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [stats, setStats] = useState<EngagementStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected engagement for reply
  const [selectedEngagement, setSelectedEngagement] = useState<Engagement | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestedReply[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isReplying, setIsReplying] = useState(false);

  // Selected for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Load engagements
  useEffect(() => {
    loadEngagements();
  }, [platformFilter, statusFilter, typeFilter, searchQuery]);

  const loadEngagements = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (platformFilter !== 'all') params.set('platform', platformFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (searchQuery) params.set('search', searchQuery);

      const response = await fetch(`/api/engage?${params}`);
      const data = await response.json();
      setEngagements(data.data || []);
      setStats(data.stats || null);
    } catch (err) {
      console.error('Failed to load engagements:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectEngagement = async (engagement: Engagement) => {
    setSelectedEngagement(engagement);
    setReplyContent('');
    setSuggestions([]);

    // Get AI suggestions if it's a comment
    if (engagement.content && engagement.type !== 'like') {
      setIsLoadingSuggestions(true);
      try {
        const response = await fetch('/api/engage/suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: engagement.content,
            authorName: engagement.authorName,
            sentiment: engagement.sentiment,
            platform: engagement.platform,
          }),
        });
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      } catch (err) {
        console.error('Failed to get suggestions:', err);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }
  };

  const handleReply = async () => {
    if (!selectedEngagement || !replyContent.trim()) return;

    setIsReplying(true);
    try {
      const response = await fetch('/api/engage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engagementId: selectedEngagement.id,
          content: replyContent,
        }),
      });

      if (response.ok) {
        // Update local state
        setEngagements(prev =>
          prev.map(e =>
            e.id === selectedEngagement.id
              ? { ...e, status: 'replied' as EngagementStatus }
              : e
          )
        );
        setSelectedEngagement(null);
        setReplyContent('');
      }
    } catch (err) {
      console.error('Failed to reply:', err);
    } finally {
      setIsReplying(false);
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedIds.length === 0) return;

    try {
      const response = await fetch('/api/engage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engagementIds: selectedIds,
          action,
        }),
      });

      if (response.ok) {
        loadEngagements();
        setSelectedIds([]);
      }
    } catch (err) {
      console.error('Bulk action failed:', err);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === engagements.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(engagements.map(e => e.id));
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Engage</h1>
        <p className="text-muted-foreground">Manage social media interactions</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Total Engagements</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <p className="text-xs text-muted-foreground">Pending Response</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{stats.replied}</div>
              <p className="text-xs text-muted-foreground">Replied</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">{stats.flagged}</div>
              <p className="text-xs text-muted-foreground">Flagged</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Filters & List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <Input
                    placeholder="Search comments..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={platformFilter} onValueChange={setPlatformFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Platforms</SelectItem>
                    {Object.entries(PLATFORM_INFO).map(([id, info]) => (
                      <SelectItem key={id} value={id}>{info.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {Object.entries(STATUS_CONFIG).map(([id, config]) => (
                      <SelectItem key={id} value={id}>{config.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {Object.entries(ENGAGEMENT_TYPES).map(([id, config]) => (
                      <SelectItem key={id} value={id}>{config.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Bulk Actions */}
          {selectedIds.length > 0 && (
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    {selectedIds.length} selected
                  </span>
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction('ignore')}>
                    Ignore
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction('flag')}>
                    Flag
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>
                    Clear
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Engagement List */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Engagements</CardTitle>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedIds.length === engagements.length && engagements.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="text-sm text-muted-foreground">Select all</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : engagements.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No engagements found
                </p>
              ) : (
                <div className="space-y-3">
                  {engagements.map((engagement) => (
                    <div
                      key={engagement.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedEngagement?.id === engagement.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => handleSelectEngagement(engagement)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedIds.includes(engagement.id)}
                          onCheckedChange={() => toggleSelect(engagement.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{engagement.authorName}</span>
                            {engagement.authorUsername && (
                              <span className="text-sm text-muted-foreground">
                                {engagement.authorUsername}
                              </span>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {PLATFORM_INFO[engagement.platform]?.name}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {ENGAGEMENT_TYPES[engagement.type]?.name}
                            </Badge>
                            {engagement.sentiment && (
                              <Badge
                                variant={
                                  engagement.sentiment === 'positive'
                                    ? 'default'
                                    : engagement.sentiment === 'negative'
                                    ? 'destructive'
                                    : 'secondary'
                                }
                                className="text-xs"
                              >
                                {SENTIMENT_CONFIG[engagement.sentiment]?.name}
                              </Badge>
                            )}
                          </div>
                          {engagement.content && (
                            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                              {engagement.content}
                            </p>
                          )}
                          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatTimeAgo(engagement.createdAt)}</span>
                            <span>·</span>
                            <Badge
                              variant={engagement.status === 'pending' ? 'outline' : 'secondary'}
                              className="text-xs"
                            >
                              {STATUS_CONFIG[engagement.status]?.name}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Reply Panel */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-base">Reply</CardTitle>
              <CardDescription>
                {selectedEngagement
                  ? `Responding to ${selectedEngagement.authorName}`
                  : 'Select an engagement to reply'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedEngagement ? (
                <>
                  {/* Original comment */}
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium">{selectedEngagement.authorName}</p>
                    <p className="text-sm mt-1">{selectedEngagement.content || '(No content)'}</p>
                  </div>

                  {/* AI Suggestions */}
                  {isLoadingSuggestions ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Suggested Replies</p>
                      <div className="h-16 bg-muted rounded animate-pulse" />
                    </div>
                  ) : suggestions.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Suggested Replies</p>
                      {suggestions.map((suggestion, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          className="w-full h-auto text-left justify-start p-2"
                          onClick={() => setReplyContent(suggestion.content)}
                        >
                          <div>
                            <span className="text-xs text-muted-foreground capitalize">
                              {suggestion.tone}
                            </span>
                            <p className="text-sm whitespace-normal">{suggestion.content}</p>
                          </div>
                        </Button>
                      ))}
                    </div>
                  ) : null}

                  {/* Reply input */}
                  <div className="space-y-2">
                    <Label>Your Reply</Label>
                    <Textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Type your reply..."
                      className="min-h-[100px]"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleReply}
                      disabled={!replyContent.trim() || isReplying}
                      className="flex-1"
                    >
                      {isReplying ? 'Sending...' : 'Send Reply'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleBulkAction('ignore')}
                    >
                      Ignore
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Click on an engagement to reply
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
