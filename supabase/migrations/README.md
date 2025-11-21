# Supabase Migrations

Database schema migrations for News Radar v0.2.0.

## Running Migrations

### Option 1: Supabase SQL Editor (Recommended for first setup)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your `news-radar` project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the contents of `20251121_initial_schema.sql`
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. Wait for "Success. No rows returned" message

### Option 2: Supabase CLI

If you have the Supabase CLI installed:

```bash
# Login to Supabase
supabase login

# Link your project
supabase link --project-ref pdeiyoovyxshguhnenio

# Run migrations
supabase db push
```

### Option 3: Direct PostgreSQL Connection

```bash
# Using the connection string from your .env
psql "your_postgres_connection_string" < supabase/migrations/20251121_initial_schema.sql
```

## Schema Overview

### Core Tables

**`users`** - User authentication and profiles
- Stores user information (email, name, bio, avatar)
- Linked to Supabase Auth

**`articles`** - Generated articles
- Title, content, excerpt
- Generation settings (platform, length, style, tone)
- Status workflow (draft → published → archived)
- Keywords, hashtags, view counts

**`article_revisions`** - Version history
- Complete snapshots of article content
- Version numbers and change summaries
- Track who made each revision

**`sources`** - News sources
- URLs and metadata for source articles
- Extracted facts, quotes, numbers
- Plagiarism check results

**`tags`** - Categorization
- Reusable tags with names, slugs, colors
- Many-to-many relationship with articles

**`article_tags`** - Junction table
- Links articles to tags

**`analytics_events`** - Engagement tracking
- Track views, shares, copies, exports
- Platform and referrer information

### Key Features

- **UUID Primary Keys** - Better for distributed systems
- **Row Level Security (RLS)** - Users can only access their own data
- **Timestamps** - Automatic created_at/updated_at tracking
- **Indexes** - Optimized for common queries
- **Views** - `article_details` for denormalized data
- **Constraints** - Data validation at database level

## Verification

After running the migration, verify tables exist:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Expected tables:
- analytics_events
- article_revisions
- article_tags
- articles
- sources
- tags
- users

## Next Steps

1. ✅ Run the migration
2. Install Supabase client: `npm install @supabase/supabase-js`
3. Create database service layer in `src/services/database.ts`
4. Update write command to save articles to database
5. Add article listing/retrieval commands

## Rollback (if needed)

To drop all tables and start over:

```sql
DROP TABLE IF EXISTS analytics_events CASCADE;
DROP TABLE IF EXISTS article_tags CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS sources CASCADE;
DROP TABLE IF EXISTS article_revisions CASCADE;
DROP TABLE IF EXISTS articles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
```

Then re-run the migration.

## Schema Diagram

```
users
  └── articles (1:many)
        ├── article_revisions (1:many)
        ├── sources (1:many)
        ├── article_tags (many:many) ──> tags
        └── analytics_events (1:many)
```
