# News Radar Web Platform - Architecture Blueprint

## Core Decisions (FINAL - No Revisiting)

### Tech Stack
- **Frontend**: Next.js 14 (App Router) + Tailwind CSS + shadcn/ui
- **Database**: Supabase PostgreSQL (free tier)
- **Hosting**: Vercel (free tier)
- **Automation**: GitHub Actions (public repo)
- **Images**: Unsplash API (external URLs only, never upload)
- **Cost**: $0 (designed to stay within free tiers)

### Data Flow
```
GitHub Actions (3x daily: 8am, 1pm, 6pm)
  ↓ Run CLI scan
  ↓ Generate article with voice generator
  ↓ Fetch Unsplash image URL
  ↓ POST to Supabase API
Supabase (stores article + publish_at timestamp)
  ↓ Query by Next.js
Next.js (displays articles where publish_at <= now)
  ↓ Serves to users
```

### Publishing Schedule
- **8am EST**: Morning article (overnight news, political focus)
- **1pm EST**: Midday article (trending topics, analysis)
- **6pm EST**: Evening article (day's developments, deeper dive)

### Image Strategy
- **Never upload images** to Supabase (bandwidth preservation)
- Store Unsplash URLs in database: `featured_image_url: string`
- Use Next.js Image component with external domains
- OG images generated on-demand via Vercel Edge Function

### Content Strategy
- **Length**: 1500-2500 words (substantive, Facebook-ready)
- **Style**: Academic voice (college-level vocab, accessible)
- **Topics**: Politics, accountability, democratic erosion
- **Sources**: 2+ sources per article, explicitly cited
- **No engagement bait**: No "What do you think?" endings

## Database Schema (Supabase)

### Tables

#### articles
```sql
create table articles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  subtitle text,
  content text not null,
  excerpt text not null,

  -- Images (external URLs only)
  featured_image_url text not null,
  featured_image_alt text,
  og_image_url text,

  -- Publishing
  status text not null default 'draft',
  publish_at timestamp with time zone not null,
  published_at timestamp with time zone,

  -- Metadata
  keywords text[] not null default '{}',
  tags text[] not null default '{}',
  source_urls text[] not null default '{}',
  source_names text[] not null default '{}',

  -- Analytics (future)
  view_count integer default 0,

  -- Timestamps
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Indexes
create index articles_status_idx on articles(status);
create index articles_publish_at_idx on articles(publish_at);
create index articles_slug_idx on articles(slug);
create index articles_published_at_idx on articles(published_at desc);

-- RLS (Row Level Security)
alter table articles enable row level security;

-- Public read access for published articles
create policy "Public read access" on articles
  for select using (status = 'published' and publish_at <= now());
```

#### stories (scraped news - for reference)
```sql
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

## File Structure

```
news-radar-web/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Homepage (latest articles)
│   ├── articles/
│   │   └── [slug]/
│   │       └── page.tsx        # Article detail page
│   ├── api/
│   │   ├── og/
│   │   │   └── [slug]/
│   │   │       └── route.ts    # OG image generator
│   │   └── publish/
│   │       └── route.ts        # Supabase webhook endpoint (optional)
│   └── globals.css
├── components/
│   ├── ArticleCard.tsx
│   ├── ArticleContent.tsx
│   ├── Header.tsx
│   └── Footer.tsx
├── lib/
│   ├── supabase.ts             # Supabase client
│   ├── utils.ts
│   └── constants.ts
├── public/
│   └── images/
├── .github/
│   └── workflows/
│       └── generate-content.yml
├── scripts/
│   └── publish-article.ts      # Called by GitHub Actions
└── README.md
```

## Environment Variables

### Supabase (.env.local)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...  # For GitHub Actions only
```

### Unsplash (.env + GitHub Secrets)
```bash
UNSPLASH_ACCESS_KEY=xxx
```

## GitHub Actions Workflow

### Schedule
- **8am EST** = 1pm UTC → `0 13 * * *`
- **1pm EST** = 6pm UTC → `0 18 * * *`
- **6pm EST** = 11pm UTC → `0 23 * * *`

### Workflow File
```yaml
# .github/workflows/generate-content.yml
name: Generate and Publish Article

on:
  schedule:
    - cron: '0 13 * * *'  # 8am EST
    - cron: '0 18 * * *'  # 1pm EST
    - cron: '0 23 * * *'  # 6pm EST
  workflow_dispatch:  # Manual trigger for testing

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

      - name: Build TypeScript
        run: npm run build

      - name: Scan news sources
        run: npm run scan -- --sources hackernews,bbc,guardian,npr,techcrunch --max-results 10 > scan_results.json

      - name: Generate article
        run: node scripts/generate-and-publish.js
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          UNSPLASH_ACCESS_KEY: ${{ secrets.UNSPLASH_ACCESS_KEY }}
```

## Next.js Configuration

### next.config.js
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    serverActions: true,
  },
}

module.exports = nextConfig
```

## API Integrations

### Unsplash Image Fetching
```typescript
// lib/images.ts
export async function fetchArticleImage(keywords: string[]): Promise<string> {
  const query = keywords[0] || 'news';

  const response = await fetch(
    `https://api.unsplash.com/photos/random?query=${query}&orientation=landscape`,
    {
      headers: {
        Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
      },
    }
  );

  const data = await response.json();
  return data.urls.regular; // Store this URL in database
}
```

### Supabase API (from GitHub Actions)
```typescript
// scripts/publish-article.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role bypasses RLS
);

async function publishArticle(article: Article) {
  const { data, error } = await supabase
    .from('articles')
    .insert({
      slug: generateSlug(article.title),
      title: article.title,
      content: article.content,
      excerpt: article.excerpt,
      featured_image_url: article.image_url,
      status: 'published',
      publish_at: new Date().toISOString(),
      keywords: article.keywords,
      source_urls: article.source_urls,
    });

  if (error) throw error;
  return data;
}
```

## Design System

### Theme
- **Primary**: Slate/Gray (professional, news-oriented)
- **Accent**: Blue (trust, credibility)
- **Typography**:
  - Headlines: Inter (modern, readable)
  - Body: Georgia or Lora (editorial, long-form reading)
- **Layout**: Single column, max-width 680px (optimal reading)

### Component Library
- Use shadcn/ui for consistency
- Components: Button, Card, Badge, Separator
- No custom CSS beyond Tailwind utilities

## Build Phases

### Phase 1: Foundation (Days 1-2)
- [ ] Create Next.js project
- [ ] Set up Supabase project
- [ ] Run database migrations
- [ ] Connect Next.js to Supabase
- [ ] Deploy to Vercel
- **Deliverable**: Empty site that can read from Supabase

### Phase 2: Display Layer (Days 3-4)
- [ ] Homepage with article list
- [ ] Article detail page
- [ ] OG image generation
- [ ] Responsive design
- **Deliverable**: Site displays articles (manually added to Supabase)

### Phase 3: Automation (Days 5-6)
- [ ] GitHub Actions workflow
- [ ] Script to generate articles
- [ ] Script to fetch images
- [ ] Script to publish to Supabase
- **Deliverable**: Automated article generation 3x daily

### Phase 4: Polish (Days 7-8)
- [ ] SEO optimization
- [ ] Performance tuning
- [ ] Error handling
- [ ] Documentation
- **Deliverable**: Production-ready platform

## Key Constraints (DO NOT VIOLATE)

1. **Zero Image Upload**: Always external URLs
2. **Free Tier Limits**:
   - Supabase: 2GB bandwidth/month
   - Vercel: 100GB bandwidth/month
   - No paid services
3. **Article Length**: 1500-2500 words minimum
4. **Voice Consistency**: Use existing voice generator, academic style
5. **No Manual Intervention**: Fully automated after setup

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-11-18 | Use external image URLs only | Preserve Supabase bandwidth |
| 2025-11-18 | Public GitHub repo | Unlimited Actions minutes |
| 2025-11-18 | 3x daily publishing | Maintain consistent content flow |
| 2025-11-18 | No engagement prompts | Authentic voice, not clickbait |

## Future Enhancements (After MVP)

- [ ] Newsletter integration (ConvertKit/Mailchimp free tier)
- [ ] RSS feed
- [ ] Social media auto-posting
- [ ] Analytics (Vercel Analytics - free)
- [ ] Search functionality
- [ ] Article categories/topics
- [ ] Related articles section
