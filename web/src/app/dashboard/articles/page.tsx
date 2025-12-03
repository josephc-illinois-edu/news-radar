'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useArticles, useDeleteArticle, usePublishArticle } from '@/hooks/use-articles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { ArticleFilters } from '@/components/articles/article-filters';
import type { ArticleFilters as Filters } from '@/types/database';

export default function ArticlesPage() {
  const [filters, setFilters] = useState<Filters>({
    limit: 20,
    offset: 0,
  });
  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useArticles({
    ...filters,
    search: search || undefined,
  });
  const deleteArticle = useDeleteArticle();
  const publishArticle = usePublishArticle();

  const handleSearch = (value: string) => {
    setSearch(value);
    setFilters((prev) => ({ ...prev, offset: 0 }));
  };

  const handleFilterChange = (newFilters: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters, offset: 0 }));
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this article?')) {
      await deleteArticle.mutateAsync(id);
    }
  };

  const handlePublish = async (id: string) => {
    await publishArticle.mutateAsync(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Articles</h1>
          <p className="text-muted-foreground">Manage your content library</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/create">Create Article</Link>
        </Button>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex-1">
          <Input
            placeholder="Search articles..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <ArticleFilters filters={filters} onChange={handleFilterChange} />
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-destructive">
          Error loading articles: {error.message}
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[400px]">Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Words</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-[300px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[40px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[30px]" /></TableCell>
                </TableRow>
              ))
            ) : data?.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No articles found. Create your first article to get started.
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((article) => (
                <TableRow key={article.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/articles/${article.id}`}
                      className="font-medium hover:underline"
                    >
                      {article.title}
                    </Link>
                    {article.excerpt && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {article.excerpt}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={article.status} />
                  </TableCell>
                  <TableCell>
                    {article.platform && (
                      <Badge variant="outline" className="capitalize">
                        {article.platform}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {article.word_count?.toLocaleString() || '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(article.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreIcon className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/articles/${article.id}`}>
                            View
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/articles/${article.id}/edit`}>
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        {article.status === 'draft' && (
                          <DropdownMenuItem onClick={() => handlePublish(article.id)}>
                            Publish
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(article.id)}
                          className="text-destructive"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data && data.hasMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => setFilters((prev) => ({ ...prev, offset: (prev.offset || 0) + 20 }))}
          >
            Load More
          </Button>
        </div>
      )}
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

function MoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
    </svg>
  );
}
