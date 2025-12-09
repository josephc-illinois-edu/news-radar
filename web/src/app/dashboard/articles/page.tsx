'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useArticles, useDeleteArticle, usePublishArticle } from '@/hooks/use-articles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ArticleFilters } from '@/components/articles/article-filters';
import { Trash2, Send, Archive, X } from 'lucide-react';
import type { ArticleFilters as Filters } from '@/types/database';

export default function ArticlesPage() {
  const [filters, setFilters] = useState<Filters>({
    limit: 20,
    offset: 0,
  });
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<'delete' | 'publish' | 'archive' | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const { data, isLoading, error, refetch } = useArticles({
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

  // Bulk selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked && data?.data) {
      setSelectedIds(new Set(data.data.map((a) => a.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setBulkAction(null);
  };

  // Bulk action handlers
  const handleBulkAction = async () => {
    if (!bulkAction || selectedIds.size === 0) return;

    setBulkProcessing(true);
    const ids = Array.from(selectedIds);

    try {
      if (bulkAction === 'delete') {
        // Delete all selected articles
        await Promise.all(ids.map((id) => deleteArticle.mutateAsync(id)));
      } else if (bulkAction === 'publish') {
        // Publish all selected articles
        await Promise.all(ids.map((id) => publishArticle.mutateAsync(id)));
      } else if (bulkAction === 'archive') {
        // Archive all selected - would need an archive mutation
        // For now, just simulate with a timeout
        await new Promise((r) => setTimeout(r, 500));
      }

      // Clear selection and close dialog
      clearSelection();
      refetch();
    } catch (err) {
      console.error('Bulk action failed:', err);
    } finally {
      setBulkProcessing(false);
    }
  };

  const allSelected = data?.data && data.data.length > 0 && data.data.every((a) => selectedIds.has(a.id));
  const someSelected = selectedIds.size > 0;

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

      {/* Bulk Action Bar */}
      {someSelected && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {selectedIds.size} article{selectedIds.size !== 1 ? 's' : ''} selected
            </span>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              <X className="h-4 w-4 mr-1" aria-hidden="true" />
              Clear
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkAction('publish')}
            >
              <Send className="h-4 w-4 mr-1" aria-hidden="true" />
              Publish
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkAction('archive')}
            >
              <Archive className="h-4 w-4 mr-1" aria-hidden="true" />
              Archive
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkAction('delete')}
            >
              <Trash2 className="h-4 w-4 mr-1" aria-hidden="true" />
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Action Confirmation Dialog */}
      <Dialog open={bulkAction !== null} onOpenChange={() => setBulkAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkAction === 'delete' && 'Delete Articles'}
              {bulkAction === 'publish' && 'Publish Articles'}
              {bulkAction === 'archive' && 'Archive Articles'}
            </DialogTitle>
            <DialogDescription>
              {bulkAction === 'delete' &&
                `Are you sure you want to delete ${selectedIds.size} article${selectedIds.size !== 1 ? 's' : ''}? This action cannot be undone.`}
              {bulkAction === 'publish' &&
                `Publish ${selectedIds.size} article${selectedIds.size !== 1 ? 's' : ''}? They will become publicly visible.`}
              {bulkAction === 'archive' &&
                `Archive ${selectedIds.size} article${selectedIds.size !== 1 ? 's' : ''}? They will be hidden from the main list.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkAction(null)}>
              Cancel
            </Button>
            <Button
              variant={bulkAction === 'delete' ? 'destructive' : 'default'}
              onClick={handleBulkAction}
              disabled={bulkProcessing}
            >
              {bulkProcessing
                ? 'Processing...'
                : bulkAction === 'delete'
                ? 'Delete'
                : bulkAction === 'publish'
                ? 'Publish'
                : 'Archive'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-4 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
          ))
        ) : data?.data.length === 0 ? (
          <div className="rounded-lg border p-8 text-center text-muted-foreground">
            No articles found. Create your first article to get started.
          </div>
        ) : (
          data?.data.map((article) => (
            <div
              key={article.id}
              className={`rounded-lg border p-4 transition-colors ${
                selectedIds.has(article.id) ? 'bg-muted/50 border-primary' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selectedIds.has(article.id)}
                  onCheckedChange={(checked) => handleSelectOne(article.id, !!checked)}
                  aria-label={`Select ${article.title}`}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/dashboard/articles/${article.id}`}
                    className="font-medium hover:underline line-clamp-2"
                  >
                    {article.title}
                  </Link>
                  {article.excerpt && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {article.excerpt}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <StatusBadge status={article.status} />
                    {article.platform && (
                      <Badge variant="outline" className="capitalize text-xs">
                        {article.platform}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {article.word_count?.toLocaleString() || 0} words
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(article.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Actions for ${article.title}`}
                    >
                      <MoreIcon className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/articles/${article.id}`}>View</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/articles/${article.id}/edit`}>Edit</Link>
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
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(checked) => handleSelectAll(!!checked)}
                  aria-label="Select all articles"
                />
              </TableHead>
              <TableHead className="w-[350px]">Title</TableHead>
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
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[280px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[40px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[30px]" /></TableCell>
                </TableRow>
              ))
            ) : data?.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No articles found. Create your first article to get started.
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((article) => (
                <TableRow key={article.id} data-selected={selectedIds.has(article.id) || undefined}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(article.id)}
                      onCheckedChange={(checked) => handleSelectOne(article.id, !!checked)}
                      aria-label={`Select ${article.title}`}
                    />
                  </TableCell>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Actions for ${article.title}`}
                        >
                          <MoreIcon className="h-4 w-4" aria-hidden="true" />
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
