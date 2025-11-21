-- News Radar Database Schema
-- Version: 0.2.0
-- Created: 2025-11-21

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (for authentication and profiles)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Articles table (generated articles with metadata)
CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Content fields
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,

  -- Metadata
  word_count INTEGER,
  reading_time_minutes INTEGER,

  -- Generation settings
  platform TEXT CHECK (platform IN ('facebook', 'linkedin', 'newsletter', 'blog')),
  length TEXT CHECK (length IN ('tweet', 'short', 'medium', 'long')),
  style TEXT CHECK (style IN ('conversational', 'academic')),

  -- Tone settings (0-10 scale)
  tone_humor INTEGER CHECK (tone_humor BETWEEN 0 AND 10),
  tone_urgency INTEGER CHECK (tone_urgency BETWEEN 0 AND 10),
  tone_optimism INTEGER CHECK (tone_optimism BETWEEN 0 AND 10),
  tone_criticism INTEGER CHECK (tone_criticism BETWEEN 0 AND 10),

  -- Status and workflow
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,

  -- Search and categorization
  keywords TEXT[],
  hashtags TEXT[],

  -- Analytics
  view_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Article revisions (version history)
CREATE TABLE article_revisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,

  -- Snapshot of content at this revision
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,

  -- Revision metadata
  version_number INTEGER NOT NULL,
  change_summary TEXT,

  -- Who made this revision
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sources (news sources used for article generation)
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,

  -- Source information
  url TEXT NOT NULL,
  title TEXT,
  author TEXT,
  published_date TIMESTAMPTZ,
  source_name TEXT,

  -- Extracted data
  facts TEXT[],
  quotes TEXT[],
  numbers TEXT[],

  -- Plagiarism check results
  similarity_score DECIMAL(5,2),
  matched_phrases TEXT[],

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tags (for categorization)
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  color TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Article-Tag junction table (many-to-many)
CREATE TABLE article_tags (
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (article_id, tag_id)
);

-- Analytics (track views and engagement)
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,

  -- Event details
  event_type TEXT CHECK (event_type IN ('view', 'share', 'copy', 'export')),

  -- Context
  platform TEXT,
  referrer TEXT,
  user_agent TEXT,

  -- User (optional - can track anonymous events)
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_articles_user_id ON articles(user_id);
CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_created_at ON articles(created_at DESC);
CREATE INDEX idx_articles_published_at ON articles(published_at DESC);

CREATE INDEX idx_article_revisions_article_id ON article_revisions(article_id);
CREATE INDEX idx_article_revisions_created_at ON article_revisions(created_at DESC);

CREATE INDEX idx_sources_article_id ON sources(article_id);

CREATE INDEX idx_analytics_events_article_id ON analytics_events(article_id);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to tables
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Users can read their own articles
CREATE POLICY "Users can read own articles"
  ON articles FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own articles
CREATE POLICY "Users can insert own articles"
  ON articles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own articles
CREATE POLICY "Users can update own articles"
  ON articles FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own articles
CREATE POLICY "Users can delete own articles"
  ON articles FOR DELETE
  USING (auth.uid() = user_id);

-- Public can read published articles
CREATE POLICY "Public can read published articles"
  ON articles FOR SELECT
  USING (status = 'published');

-- Similar policies for related tables
CREATE POLICY "Users can manage own article revisions"
  ON article_revisions FOR ALL
  USING (article_id IN (SELECT id FROM articles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own article sources"
  ON sources FOR ALL
  USING (article_id IN (SELECT id FROM articles WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can read tags"
  ON tags FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can manage own article tags"
  ON article_tags FOR ALL
  USING (article_id IN (SELECT id FROM articles WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can insert analytics events"
  ON analytics_events FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Create views for common queries
CREATE VIEW article_details AS
SELECT
  a.*,
  u.full_name as author_name,
  u.email as author_email,
  COUNT(DISTINCT ar.id) as revision_count,
  COUNT(DISTINCT s.id) as source_count,
  COUNT(DISTINCT at.tag_id) as tag_count,
  COALESCE(SUM(CASE WHEN ae.event_type = 'view' THEN 1 ELSE 0 END), 0) as total_views
FROM articles a
LEFT JOIN users u ON a.user_id = u.id
LEFT JOIN article_revisions ar ON a.id = ar.article_id
LEFT JOIN sources s ON a.id = s.article_id
LEFT JOIN article_tags at ON a.id = at.article_id
LEFT JOIN analytics_events ae ON a.id = ae.article_id
GROUP BY a.id, u.full_name, u.email;

-- Comments for documentation
COMMENT ON TABLE articles IS 'Generated articles with metadata and content';
COMMENT ON TABLE article_revisions IS 'Version history for articles';
COMMENT ON TABLE sources IS 'News sources used to generate articles';
COMMENT ON TABLE tags IS 'Tags for categorizing articles';
COMMENT ON TABLE analytics_events IS 'Track article views and engagement';
