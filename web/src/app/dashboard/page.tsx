import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';

async function getStats() {
  const supabase = await createClient();

  // Return demo stats if Supabase is not configured
  if (!supabase) {
    return {
      total: 3,
      published: 1,
      drafts: 2,
    };
  }

  const [articlesResult, publishedResult, draftsResult] = await Promise.all([
    supabase.from('articles').select('*', { count: 'exact', head: true }),
    supabase.from('articles').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('articles').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
  ]);

  return {
    total: articlesResult.count || 0,
    published: publishedResult.count || 0,
    drafts: draftsResult.count || 0,
  };
}

export default async function DashboardPage() {
  const stats = await getStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to News Radar Studio</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All articles in database</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.published}</div>
            <p className="text-xs text-muted-foreground">Live articles</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.drafts}</div>
            <p className="text-xs text-muted-foreground">Work in progress</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks to get started</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <a
              href="/dashboard/create"
              className="flex items-center gap-2 rounded-lg border p-3 hover:bg-accent transition-colors"
            >
              <span className="text-2xl">+</span>
              <div>
                <p className="font-medium">Create Article</p>
                <p className="text-sm text-muted-foreground">Generate new content with AI</p>
              </div>
            </a>
            <a
              href="/dashboard/research"
              className="flex items-center gap-2 rounded-lg border p-3 hover:bg-accent transition-colors"
            >
              <span className="text-2xl">🔍</span>
              <div>
                <p className="font-medium">Research Topics</p>
                <p className="text-sm text-muted-foreground">Scan sources for trending stories</p>
              </div>
            </a>
            <a
              href="/dashboard/articles"
              className="flex items-center gap-2 rounded-lg border p-3 hover:bg-accent transition-colors"
            >
              <span className="text-2xl">📄</span>
              <div>
                <p className="font-medium">Manage Articles</p>
                <p className="text-sm text-muted-foreground">View and edit your content</p>
              </div>
            </a>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest actions</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No recent activity yet. Start by creating your first article!</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
