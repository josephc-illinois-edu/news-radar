# Quick Reference - News Radar Platform

**When resuming work, start here. Everything you need to know.**

---

## Project Status

Current phase: **[UPDATE AS YOU GO]**
- [ ] Phase 1: Database Setup
- [ ] Phase 2: Next.js Setup
- [ ] Phase 3: Homepage
- [ ] Phase 4: Article Pages
- [ ] Phase 5: Vercel Deployment
- [ ] Phase 6: Automation Scripts
- [ ] Phase 7: GitHub Actions

---

## Key Files

| File | Purpose |
|------|---------|
| `ARCHITECTURE.md` | All architectural decisions (read first) |
| `IMPLEMENTATION_GUIDE.md` | Step-by-step build instructions |
| `QUICK_REFERENCE.md` | This file - quick lookups |

---

## Two Repositories

### 1. news-radar (this one)
- **Purpose**: CLI tool, article generation, GitHub Actions
- **Location**: `C:\Users\josephc\Projects\news-radar`
- **Key commands**:
  ```bash
  npm run scan -- --sources bbc,guardian,npr
  npm run write -- --story "Title" --style academic
  npm run publish:article  # After Phase 6
  ```

### 2. news-radar-web (created in Phase 2)
- **Purpose**: Next.js frontend, hosted on Vercel
- **Location**: Create in Phase 2
- **Key commands**:
  ```bash
  npm run dev      # Local development
  npm run build    # Build for production
  ```

---

## Environment Variables

### Supabase
```bash
# Get from: supabase.com → Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...  # Secret! For GitHub Actions only
```

### Unsplash
```bash
# Get from: unsplash.com/developers
UNSPLASH_ACCESS_KEY=xxx
```

### Where to Put Them
- **news-radar-web/.env.local**: All variables (local development)
- **Vercel Dashboard**: `NEXT_PUBLIC_*` variables only
- **GitHub Secrets**: `SUPABASE_*` and `UNSPLASH_*` (for Actions)

---

## Common Commands

### Generate Article Manually
```bash
cd C:\Users\josephc\Projects\news-radar

# Scan for stories
npm run scan -- --sources bbc,guardian,npr --max-results 10

# Write about a story
npm run write -- \
  --story "House votes to release Epstein files" \
  --platform facebook \
  --style academic \
  --length long
```

### Test GitHub Action Locally
```bash
# Scan and save results
npm run scan -- --sources bbc,guardian,npr > scan_results.json

# Generate and publish
npm run publish:article
```

### Deploy Next.js Changes
```bash
cd news-radar-web
git add .
git commit -m "Update"
git push  # Auto-deploys to Vercel
```

---

## URLs

### Production
- **Website**: https://news-radar-web.vercel.app (update after deploy)
- **Supabase Dashboard**: https://supabase.com/dashboard
- **Vercel Dashboard**: https://vercel.com/dashboard
- **GitHub Actions**: https://github.com/[your-username]/news-radar/actions

### Development
- **Local Next.js**: http://localhost:3000
- **Supabase Studio**: http://localhost:54323 (if running locally)

---

## Database Schema Quick Look

### articles table
```sql
slug          text    (unique, URL-friendly)
title         text
content       text    (Markdown or HTML)
excerpt       text    (First ~200 chars)
featured_image_url  text  (Unsplash URL)
status        text    ('draft' or 'published')
publish_at    timestamp
keywords      text[]
source_urls   text[]
```

### Query Examples
```sql
-- Get published articles
SELECT * FROM articles
WHERE status = 'published'
AND publish_at <= NOW()
ORDER BY published_at DESC;

-- Count articles
SELECT COUNT(*) FROM articles WHERE status = 'published';

-- Get articles by keyword
SELECT * FROM articles WHERE 'epstein' = ANY(keywords);
```

---

## Free Tier Limits

| Service | Limit | Your Usage |
|---------|-------|------------|
| Supabase | 2GB bandwidth/month | ~50KB per article view → 40K views |
| Vercel | 100GB bandwidth/month | ~500KB per page → 200K views |
| GitHub Actions | 2000 min/month (private) | ~6 min/day → 180 min/month |
| Unsplash API | 50 req/hour | 3 req/day = no issue |

**When you'll hit limits**: ~40,000 readers/month (Supabase bandwidth)

---

## Publishing Schedule

| Time (EST) | Time (UTC) | Cron |
|------------|------------|------|
| 8am | 1pm | `0 13 * * *` |
| 1pm | 6pm | `0 18 * * *` |
| 6pm | 11pm | `0 23 * * *` |

**How it works**:
1. GitHub Action runs at scheduled time
2. Scans news sources for trending stories
3. Generates article with voice generator
4. Fetches Unsplash image
5. Publishes to Supabase with current timestamp
6. Article appears on site immediately

---

## Content Strategy

### Article Requirements
- **Length**: 1500-2500 words (substantive)
- **Style**: Academic voice (Midwest direct + intellectual depth)
- **Sources**: 2+ explicitly cited
- **No**: "What do you think?" endings
- **Yes**: Natural discussion-provoking conclusions

### Topics Focus
- Political accountability
- Democratic erosion
- Institutional failures
- Power dynamics

---

## Troubleshooting

### Articles not appearing on site
```bash
# Check Supabase
1. Go to Supabase → Table Editor → articles
2. Verify: status = 'published'
3. Verify: publish_at <= current time
4. Check RLS policies are set up
```

### GitHub Action failing
```bash
# Check logs
1. GitHub → Actions → [failed run]
2. Common issues:
   - Missing secrets (add in repo settings)
   - Build errors (run `npm run build` locally)
   - Supabase connection (test SERVICE_ROLE_KEY)
```

### Images not loading
```bash
# Check next.config.js
images: {
  remotePatterns: [{
    protocol: 'https',
    hostname: 'images.unsplash.com'
  }]
}
```

---

## Design Tokens

### Colors
- Primary: Slate/Gray (#64748b)
- Accent: Blue (#3b82f6)
- Background: White (#ffffff)
- Text: Near-black (#0f172a)

### Typography
- Headlines: Inter (bold, modern)
- Body: Georgia (serif, readable)
- Max width: 680px (articles), 1200px (homepage)

### Component Library
- shadcn/ui (Tailwind-based)
- Components: Button, Card, Badge, Separator

---

## Next Features (After MVP)

Priority order:
1. [ ] OG image generation (social sharing)
2. [ ] RSS feed
3. [ ] Newsletter signup (ConvertKit free tier)
4. [ ] Related articles
5. [ ] Search
6. [ ] Analytics (Vercel Analytics)
7. [ ] Comments (Giscus - GitHub-based, free)

---

## Emergency Contacts

**If something breaks**:
1. Check Vercel deployment logs
2. Check Supabase logs
3. Check GitHub Actions logs
4. Test locally: `npm run dev`

**If you hit free tier limits**:
- Supabase upgrade: $25/month (only needed at 40K+ views)
- Vercel should never hit limits for a blog

---

## File Locations

```
news-radar/
├── ARCHITECTURE.md          ← Read first
├── IMPLEMENTATION_GUIDE.md  ← Build steps
├── QUICK_REFERENCE.md       ← This file
├── src/generators/voice.ts  ← Article generator
├── scripts/
│   └── generate-and-publish.ts  ← Automation script
└── .github/workflows/
    └── generate-content.yml     ← Scheduled jobs

news-radar-web/
├── app/
│   ├── page.tsx              ← Homepage
│   └── articles/[slug]/      ← Article pages
├── components/
│   └── ArticleCard.tsx       ← Reusable UI
├── lib/
│   └── supabase.ts           ← Database client
└── .env.local                ← Secrets (don't commit!)
```

---

## Success Criteria

MVP is done when:
- [ ] Can visit website
- [ ] See published articles
- [ ] Click and read full article
- [ ] GitHub Action runs 3x daily
- [ ] New articles appear automatically
- [ ] Mobile responsive
- [ ] No errors in production

---

**Last Updated**: 2025-11-18
**Version**: 1.0
