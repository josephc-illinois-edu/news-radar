# Implementation Guide - Step-by-Step Execution

**Purpose**: Follow these steps sequentially. Each step is complete and self-contained. No need to revisit previous decisions.

**Reference**: See `ARCHITECTURE.md` for all architectural decisions.

---

## Pre-Setup: Account Creation (15 minutes)

### 1. Create Supabase Account
- Go to https://supabase.com
- Sign up (free)
- Create new project: `news-radar-prod`
- **Save these immediately**:
  - Project URL: `https://xxxxx.supabase.co`
  - Anon public key: `eyJhbG...`
  - Service role key: `eyJhbG...` (keep secret!)

### 2. Create Vercel Account
- Go to https://vercel.com
- Sign up with GitHub
- Note: We'll deploy later, just need account now

### 3. Get Unsplash API Key
- Go to https://unsplash.com/developers
- Register as developer (free)
- Create app: "News Radar Blog"
- **Save**: Access Key

---

## Phase 1: Database Setup (30 minutes)

### Step 1.1: Run Database Migrations

1. Open Supabase dashboard → SQL Editor
2. Run this SQL (copy/paste entire block):

```sql
-- Create articles table
create table articles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  subtitle text,
  content text not null,
  excerpt text not null,
  featured_image_url text not null,
  featured_image_alt text,
  og_image_url text,
  status text not null default 'draft',
  publish_at timestamp with time zone not null,
  published_at timestamp with time zone,
  keywords text[] not null default '{}',
  tags text[] not null default '{}',
  source_urls text[] not null default '{}',
  source_names text[] not null default '{}',
  view_count integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create indexes
create index articles_status_idx on articles(status);
create index articles_publish_at_idx on articles(publish_at);
create index articles_slug_idx on articles(slug);
create index articles_published_at_idx on articles(published_at desc);

-- Enable RLS
alter table articles enable row level security;

-- Public read policy
create policy "Public read published articles" on articles
  for select using (status = 'published' and publish_at <= now());

-- Create stories table
create table stories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null,
  source_name text not null,
  score integer,
  comment_count integer,
  engagement_velocity numeric,
  keywords text[],
  detected_at timestamp with time zone default now(),
  used_in_article_id uuid references articles(id)
);
```

3. Verify: Tables should appear in Supabase → Table Editor

### Step 1.2: Test Database Connection

1. Supabase → Settings → API
2. Copy the connection examples
3. Test with: `curl https://xxxxx.supabase.co/rest/v1/articles`

---

## Phase 2: Next.js Setup (1 hour)

### Step 2.1: Create Next.js Project

```bash
# In a NEW directory (not news-radar)
npx create-next-app@latest news-radar-web

# Choose these options:
# ✅ TypeScript: Yes
# ✅ ESLint: Yes
# ✅ Tailwind: Yes
# ✅ src/ directory: No
# ✅ App Router: Yes
# ✅ Import alias: Yes (@/*)

cd news-radar-web
```

### Step 2.2: Install Dependencies

```bash
npm install @supabase/supabase-js
npm install date-fns
npm install @vercel/og
npx shadcn-ui@latest init

# When prompted:
# Style: Default
# Color: Slate
# CSS variables: Yes
```

### Step 2.3: Add shadcn Components

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add separator
```

### Step 2.4: Create Environment File

Create `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
UNSPLASH_ACCESS_KEY=your_unsplash_key
```

### Step 2.5: Create Supabase Client

Create `lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type Article = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  content: string;
  excerpt: string;
  featured_image_url: string;
  featured_image_alt?: string;
  status: string;
  publish_at: string;
  published_at?: string;
  keywords: string[];
  tags: string[];
  source_urls: string[];
  source_names: string[];
  created_at: string;
};
```

---

## Phase 3: Build Homepage (2 hours)

### Step 3.1: Update next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
}

module.exports = nextConfig
```

### Step 3.2: Create Article Card Component

Create `components/ArticleCard.tsx`:
```typescript
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Article } from '@/lib/supabase';

export function ArticleCard({ article }: { article: Article }) {
  return (
    <Link href={`/articles/${article.slug}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <div className="relative h-48 w-full">
          <Image
            src={article.featured_image_url}
            alt={article.featured_image_alt || article.title}
            fill
            className="object-cover"
          />
        </div>
        <div className="p-6">
          <div className="flex gap-2 mb-3">
            {article.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
          <h2 className="text-2xl font-bold mb-2 line-clamp-2">
            {article.title}
          </h2>
          <p className="text-muted-foreground mb-4 line-clamp-3">
            {article.excerpt}
          </p>
          <time className="text-sm text-muted-foreground">
            {format(new Date(article.publish_at), 'MMMM d, yyyy')}
          </time>
        </div>
      </Card>
    </Link>
  );
}
```

### Step 3.3: Create Homepage

Replace `app/page.tsx`:
```typescript
import { supabase } from '@/lib/supabase';
import { ArticleCard } from '@/components/ArticleCard';

export const revalidate = 60; // Revalidate every 60 seconds

async function getArticles() {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('status', 'published')
    .lte('publish_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return data;
}

export default async function Home() {
  const articles = await getArticles();

  return (
    <main className="container mx-auto px-4 py-12 max-w-6xl">
      <header className="mb-12">
        <h1 className="text-5xl font-bold mb-4">News Radar</h1>
        <p className="text-xl text-muted-foreground">
          Political analysis with accountability, clarity, and depth
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </main>
  );
}
```

---

## Phase 4: Build Article Page (1 hour)

### Step 4.1: Create Article Page

Create `app/articles/[slug]/page.tsx`:
```typescript
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export const revalidate = 60;

async function getArticle(slug: string) {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error || !data) return null;
  return data;
}

export default async function ArticlePage({
  params,
}: {
  params: { slug: string };
}) {
  const article = await getArticle(params.slug);

  if (!article) {
    notFound();
  }

  return (
    <article className="container mx-auto px-4 py-12 max-w-3xl">
      <header className="mb-8">
        <div className="flex gap-2 mb-4">
          {article.tags.map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </div>
        <h1 className="text-5xl font-bold mb-4">{article.title}</h1>
        {article.subtitle && (
          <p className="text-2xl text-muted-foreground mb-6">
            {article.subtitle}
          </p>
        )}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <time>{format(new Date(article.publish_at), 'MMMM d, yyyy')}</time>
          <span>•</span>
          <span>{Math.ceil(article.content.split(' ').length / 200)} min read</span>
        </div>
      </header>

      <div className="relative w-full h-96 mb-8">
        <Image
          src={article.featured_image_url}
          alt={article.featured_image_alt || article.title}
          fill
          className="object-cover rounded-lg"
          priority
        />
      </div>

      <div
        className="prose prose-lg dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: article.content }}
      />

      <Separator className="my-8" />

      <footer>
        <h3 className="font-bold mb-2">Sources:</h3>
        <ul className="list-disc pl-6 space-y-1">
          {article.source_urls.map((url, idx) => (
            <li key={url}>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {article.source_names[idx] || url}
              </a>
            </li>
          ))}
        </ul>
      </footer>
    </article>
  );
}
```

---

## Phase 5: Deploy to Vercel (30 minutes)

### Step 5.1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
gh repo create news-radar-web --public --source=. --remote=origin
git push -u origin main
```

### Step 5.2: Deploy on Vercel

1. Go to https://vercel.com/new
2. Import `news-radar-web` repository
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy
5. **Save your Vercel URL**: `https://news-radar-web.vercel.app`

### Step 5.3: Test

1. Visit your Vercel URL
2. Should see empty homepage (no articles yet)
3. No errors in console

---

## Phase 6: Automation Scripts (2 hours)

### Step 6.1: Create Publication Script

Create `scripts/generate-and-publish.ts` in `news-radar` (original repo):
```typescript
import { createClient } from '@supabase/supabase-js';
import { createVoiceGenerator } from './src/generators/voice.js';
import fs from 'fs/promises';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fetchUnsplashImage(keyword: string): Promise<string> {
  const response = await fetch(
    `https://api.unsplash.com/photos/random?query=${keyword}&orientation=landscape`,
    {
      headers: {
        Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
      },
    }
  );
  const data = await response.json();
  return data.urls.regular;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

async function main() {
  // Read scan results
  const scanResults = JSON.parse(
    await fs.readFile('scan_results.json', 'utf-8')
  );

  const topStory = scanResults[0];

  // Generate article
  const generator = createVoiceGenerator({
    length: 'long',
    platform: 'blog',
    tone: { urgency: 8, criticism: 7 },
  });

  const article = generator.generate(topStory);

  // Fetch image
  const imageUrl = await fetchUnsplashImage(topStory.keywords[0] || 'news');

  // Publish to Supabase
  const { error } = await supabase.from('articles').insert({
    slug: generateSlug(article.title),
    title: article.title,
    content: article.content,
    excerpt: article.content.slice(0, 200) + '...',
    featured_image_url: imageUrl,
    status: 'published',
    publish_at: new Date().toISOString(),
    published_at: new Date().toISOString(),
    keywords: topStory.keywords,
    tags: topStory.topics,
    source_urls: [topStory.url],
    source_names: [topStory.sourceName],
  });

  if (error) {
    console.error('Publication failed:', error);
    process.exit(1);
  }

  console.log('✅ Article published successfully');
}

main();
```

### Step 6.2: Update package.json

Add to `news-radar/package.json`:
```json
{
  "scripts": {
    "publish:article": "tsx scripts/generate-and-publish.ts"
  }
}
```

---

## Phase 7: GitHub Actions (1 hour)

### Step 7.1: Add GitHub Secrets

In `news-radar` repo → Settings → Secrets and variables → Actions:
- Add `SUPABASE_URL`
- Add `SUPABASE_SERVICE_ROLE_KEY`
- Add `UNSPLASH_ACCESS_KEY`

### Step 7.2: Create Workflow

Create `.github/workflows/generate-content.yml`:
```yaml
name: Generate Daily Articles

on:
  schedule:
    - cron: '0 13 * * *'  # 8am EST
    - cron: '0 18 * * *'  # 1pm EST
    - cron: '0 23 * * *'  # 6pm EST
  workflow_dispatch:

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install

      - name: Build
        run: npm run build

      - name: Scan news
        run: npm run scan -- --sources bbc,guardian,npr,techcrunch --max-results 10 > scan_results.json

      - name: Generate and publish
        run: npm run publish:article
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          UNSPLASH_ACCESS_KEY: ${{ secrets.UNSPLASH_ACCESS_KEY }}
```

### Step 7.3: Test Workflow

1. Go to Actions tab in GitHub
2. Select "Generate Daily Articles"
3. Click "Run workflow"
4. Wait 2-3 minutes
5. Check Supabase → articles table for new entry
6. Visit your Vercel site to see it appear

---

## Validation Checklist

After completing all phases:

- [ ] Can see articles on homepage
- [ ] Can click and read full article
- [ ] Images load from Unsplash
- [ ] GitHub Action runs successfully
- [ ] New articles appear after Action runs
- [ ] Site is responsive on mobile
- [ ] No console errors
- [ ] Vercel deployment succeeds

---

## Troubleshooting

### Problem: Articles don't appear on homepage
**Check**: Supabase → Table Editor → articles → status = 'published' AND publish_at <= now

### Problem: Images don't load
**Check**: next.config.js has `images.unsplash.com` in remotePatterns

### Problem: GitHub Action fails
**Check**: Secrets are set correctly in GitHub repo settings

### Problem: RLS blocks articles
**Check**: Supabase → Authentication → Policies → "Public read" policy exists

---

## Next Steps After MVP

Once everything works:
1. Add OG image generation
2. Improve design/styling
3. Add RSS feed
4. Add newsletter signup
5. Analytics
