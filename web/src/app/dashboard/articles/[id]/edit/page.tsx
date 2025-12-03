'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useArticle, useUpdateArticle } from '@/hooks/use-articles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function ArticleEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data: article, isLoading, error } = useArticle(id);
  const updateArticle = useUpdateArticle();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [platform, setPlatform] = useState('');
  const [status, setStatus] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  // Initialize form when article loads
  useEffect(() => {
    if (article) {
      setTitle(article.title);
      setContent(article.content);
      setPlatform(article.platform || '');
      setStatus(article.status);
      setHashtags(article.hashtags?.join(', ') || '');
    }
  }, [article]);

  // Track changes
  useEffect(() => {
    if (article) {
      const hasChanges =
        title !== article.title ||
        content !== article.content ||
        platform !== (article.platform || '') ||
        status !== article.status ||
        hashtags !== (article.hashtags?.join(', ') || '');
      setIsDirty(hasChanges);
    }
  }, [title, content, platform, status, hashtags, article]);

  const handleSave = async () => {
    const hashtagsArray = hashtags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    await updateArticle.mutateAsync({
      id,
      title,
      content,
      platform: platform as any || undefined,
      status: status as any,
      hashtags: hashtagsArray.length > 0 ? hashtagsArray : undefined,
      word_count: content.split(/\s+/).filter(Boolean).length,
      reading_time_minutes: Math.ceil(content.split(/\s+/).filter(Boolean).length / 200),
    });

    setIsDirty(false);
    router.push(`/dashboard/articles/${id}`);
  };

  if (isLoading) {
    return <EditorSkeleton />;
  }

  if (error || !article) {
    return (
      <div className="space-y-4">
        <div className="rounded-md bg-destructive/10 p-4 text-destructive">
          {error?.message || 'Article not found'}
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/articles">Back to Articles</Link>
        </Button>
      </div>
    );
  }

  const wordCount = content.split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/articles"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Articles
            </Link>
            <span className="text-muted-foreground">/</span>
            <Link
              href={`/dashboard/articles/${id}`}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {article.title.slice(0, 20)}...
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm">Edit</span>
          </div>
          <h1 className="text-2xl font-bold">Edit Article</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/articles/${id}`}>Cancel</Link>
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isDirty || updateArticle.isPending}
          >
            {updateArticle.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Editor */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Title</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Article title"
                className="text-lg font-medium"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Content</CardTitle>
              <span className="text-sm text-muted-foreground">
                {wordCount.toLocaleString()} words · {Math.ceil(wordCount / 200)} min read
              </span>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="write">
                <TabsList className="mb-4">
                  <TabsTrigger value="write">Write</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
                <TabsContent value="write">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write your article content..."
                    className="min-h-[400px] w-full resize-y rounded-md border bg-background p-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                  />
                </TabsContent>
                <TabsContent value="preview">
                  <div className="min-h-[400px] rounded-md border p-4 prose prose-neutral dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap">{content || 'Nothing to preview'}</div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between capitalize">
                      {status || 'Select status'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full">
                    <DropdownMenuRadioGroup value={status} onValueChange={setStatus}>
                      <DropdownMenuRadioItem value="draft">Draft</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="published">Published</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="archived">Archived</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Platform</label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between capitalize">
                      {platform || 'Select platform'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full">
                    <DropdownMenuRadioGroup value={platform} onValueChange={setPlatform}>
                      <DropdownMenuRadioItem value="">None</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="facebook">Facebook</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="linkedin">LinkedIn</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="newsletter">Newsletter</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="blog">Blog</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Hashtags</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                placeholder="#tag1, #tag2, #tag3"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Separate with commas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Article Info</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{new Date(article.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span>{new Date(article.updated_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Views</span>
                <span>{article.view_count}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function EditorSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </div>
  );
}
