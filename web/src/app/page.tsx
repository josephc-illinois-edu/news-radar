import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function Home() {
  const supabase = await createClient();

  // Check if user is logged in
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      redirect('/dashboard');
    }
  } else {
    // Demo mode - go directly to dashboard
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <main className="flex-1">
        <section className="container flex flex-col items-center justify-center gap-6 py-24 md:py-32">
          <h1 className="text-center text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            News Radar Studio
          </h1>
          <p className="max-w-[600px] text-center text-lg text-muted-foreground">
            AI-powered content creation platform. Research topics, generate articles,
            and publish across multiple platforms with a single click.
          </p>
          <div className="flex gap-4">
            <Button asChild size="lg">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/signup">Create Account</Link>
            </Button>
          </div>
        </section>

        {/* Features Section */}
        <section className="container py-16">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-lg border p-6">
              <h3 className="mb-2 text-xl font-semibold">Research</h3>
              <p className="text-muted-foreground">
                Scan multiple news sources to discover trending topics and gather information.
              </p>
            </div>
            <div className="rounded-lg border p-6">
              <h3 className="mb-2 text-xl font-semibold">Create</h3>
              <p className="text-muted-foreground">
                Generate high-quality articles with AI assistance, complete with sources and citations.
              </p>
            </div>
            <div className="rounded-lg border p-6">
              <h3 className="mb-2 text-xl font-semibold">Publish</h3>
              <p className="text-muted-foreground">
                Distribute content across Facebook, LinkedIn, Twitter, and more platforms.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="container text-center text-sm text-muted-foreground">
          News Radar Studio v0.3.0
        </div>
      </footer>
    </div>
  );
}
