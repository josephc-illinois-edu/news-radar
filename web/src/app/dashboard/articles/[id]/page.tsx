'use client';

import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useArticle, useArticleSources, useArticleRevisions, useDeleteArticle, usePublishArticle } from '@/hooks/use-articles';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

export default function ArticleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data: article, isLoading, error } = useArticle(id);
  const { data: sources } = useArticleSources(id);
  const { data: revisions } = useArticleRevisions(id);
  const deleteArticle = useDeleteArticle();
  const publishArticle = usePublishArticle();

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this article?')) {
      await deleteArticle.mutateAsync(id);
      router.push('/dashboard/articles');
    }
  };

  const handlePublish = async () => {
    await publishArticle.mutateAsync(id);
  };

  if (isLoading) {
    return <ArticleSkeleton />;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/articles"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Articles
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm">{article.title.slice(0, 30)}...</span>
          </div>
          <h1 className="text-3xl font-bold">{article.title}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <StatusBadge status={article.status} />
            {article.platform && (
              <Badge variant="outline" className="capitalize">
                {article.platform}
              </Badge>
            )}
            <span>·</span>
            <span>{article.word_count?.toLocaleString() || 0} words</span>
            <span>·</span>
            <span>{article.reading_time_minutes || 1} min read</span>
          </div>
        </div>
        <div className="flex gap-2">
          {article.status === 'draft' && (
            <Button onClick={handlePublish} disabled={publishArticle.isPending}>
              {publishArticle.isPending ? 'Publishing...' : 'Publish'}
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href={`/dashboard/articles/${id}/edit`}>Edit</Link>
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteArticle.isPending}>
            Delete
          </Button>
        </div>
      </div>

      <Tabs defaultValue="content" className="space-y-4">
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="sources">Sources ({sources?.length || 0})</TabsTrigger>
          <TabsTrigger value="revisions">Revisions ({revisions?.length || 0})</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <article className="prose prose-neutral dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap">{article.content}</div>
              </article>
            </CardContent>
          </Card>

          {article.hashtags && article.hashtags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Hashtags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {article.hashtags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="sources" className="space-y-4">
          {sources && sources.length > 0 ? (
            sources.map((source) => (
              <Card key={source.id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {source.title || source.url}
                    </a>
                  </CardTitle>
                  {source.author && (
                    <CardDescription>By {source.author}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {source.facts && source.facts.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-1">Facts ({source.facts.length})</p>
                      <ul className="text-sm text-muted-foreground list-disc list-inside">
                        {source.facts.slice(0, 3).map((fact, i) => (
                          <li key={i}>{fact}</li>
                        ))}
                        {source.facts.length > 3 && (
                          <li className="text-muted-foreground">
                            +{source.facts.length - 3} more
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                  {source.quotes && source.quotes.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-1">Quotes ({source.quotes.length})</p>
                      <ul className="text-sm text-muted-foreground">
                        {source.quotes.slice(0, 2).map((quote, i) => (
                          <li key={i} className="italic">"{quote}"</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {source.similarity_score !== undefined && (
                    <p className="text-xs text-muted-foreground">
                      Similarity: {(source.similarity_score * 100).toFixed(1)}%
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No sources linked to this article.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="revisions" className="space-y-4">
          {revisions && revisions.length > 0 ? (
            revisions.map((revision) => (
              <Card key={revision.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      Version {revision.version_number}
                    </CardTitle>
                    <span className="text-sm text-muted-foreground">
                      {new Date(revision.created_at).toLocaleString()}
                    </span>
                  </div>
                  {revision.change_summary && (
                    <CardDescription>{revision.change_summary}</CardDescription>
                  )}
                </CardHeader>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No revision history available.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="metadata" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">ID</dt>
                  <dd className="font-mono text-xs">{article.id}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="capitalize">{article.status}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Platform</dt>
                  <dd className="capitalize">{article.platform || 'Not set'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Length</dt>
                  <dd className="capitalize">{article.length || 'Not set'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Style</dt>
                  <dd className="capitalize">{article.style || 'Not set'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">View Count</dt>
                  <dd>{article.view_count}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Created</dt>
                  <dd>{new Date(article.created_at).toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Updated</dt>
                  <dd>{new Date(article.updated_at).toLocaleString()}</dd>
                </div>
                {article.published_at && (
                  <div>
                    <dt className="text-muted-foreground">Published</dt>
                    <dd>{new Date(article.published_at).toLocaleString()}</dd>
                  </div>
                )}
              </dl>

              <Separator className="my-4" />

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Tone Settings</p>
                <dl className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Humor</dt>
                    <dd>{article.tone_humor ?? '-'}/10</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Urgency</dt>
                    <dd>{article.tone_urgency ?? '-'}/10</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Optimism</dt>
                    <dd>{article.tone_optimism ?? '-'}/10</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Criticism</dt>
                    <dd>{article.tone_criticism ?? '-'}/10</dd>
                  </div>
                </dl>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
    published: 'default',
    draft: 'secondary',
    archived: 'outline',
  };

  return (
    <Badge variant={variants[status] || 'outline'} className="capitalize">
      {status}
    </Badge>
  );
}

function ArticleSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}
