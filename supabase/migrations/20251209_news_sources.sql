-- News Sources Management
-- Version: 0.3.0
-- Created: 2025-12-09
-- Description: Dynamic news source configuration with system presets and custom feeds

-- News sources table (unified source configuration)
CREATE TABLE news_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identity
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT,

  -- Classification
  category TEXT NOT NULL CHECK (category IN ('tech', 'news', 'business', 'science', 'custom')),
  source_type TEXT NOT NULL CHECK (source_type IN ('api', 'rss', 'scraper')),

  -- Configuration (flexible JSON for different source types)
  -- API: { "endpoint": "algolia" | "json", "baseUrl": "..." }
  -- RSS: { "url": "...", "selectors": {...} }
  -- Scraper: { "urls": [...], "selectors": {...} }
  config JSONB DEFAULT '{}',

  -- Status
  is_system BOOLEAN DEFAULT false,
  is_enabled BOOLEAN DEFAULT true,

  -- Scan tracking
  last_scanned_at TIMESTAMPTZ,
  last_error TEXT,
  error_count INTEGER DEFAULT 0,
  stories_found INTEGER DEFAULT 0,
  avg_engagement DECIMAL(10,2) DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_news_sources_slug ON news_sources(slug);
CREATE INDEX idx_news_sources_category ON news_sources(category);
CREATE INDEX idx_news_sources_is_enabled ON news_sources(is_enabled);
CREATE INDEX idx_news_sources_is_system ON news_sources(is_system);

-- Apply updated_at trigger
CREATE TRIGGER update_news_sources_updated_at
  BEFORE UPDATE ON news_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE news_sources ENABLE ROW LEVEL SECURITY;

-- Anyone can read sources (needed for scanning)
CREATE POLICY "Anyone can read news sources"
  ON news_sources FOR SELECT
  TO authenticated, anon
  USING (true);

-- Only authenticated users can manage custom sources
CREATE POLICY "Authenticated users can insert custom sources"
  ON news_sources FOR INSERT
  TO authenticated
  WITH CHECK (is_system = false);

CREATE POLICY "Authenticated users can update custom sources"
  ON news_sources FOR UPDATE
  TO authenticated
  USING (is_system = false);

CREATE POLICY "Authenticated users can delete custom sources"
  ON news_sources FOR DELETE
  TO authenticated
  USING (is_system = false);

-- Allow anon to insert for demo mode
CREATE POLICY "Anon can insert custom sources"
  ON news_sources FOR INSERT
  TO anon
  WITH CHECK (is_system = false);

CREATE POLICY "Anon can update custom sources"
  ON news_sources FOR UPDATE
  TO anon
  USING (is_system = false);

CREATE POLICY "Anon can delete custom sources"
  ON news_sources FOR DELETE
  TO anon
  USING (is_system = false);

-- Seed system presets (built-in sources)
INSERT INTO news_sources (slug, name, icon, category, source_type, is_system, config) VALUES
  -- Tech aggregators (API-based)
  ('hackernews', 'Hacker News', '🟠', 'tech', 'api', true,
   '{"endpoint": "algolia", "baseUrl": "https://hn.algolia.com/api/v1"}'),
  ('lobsters', 'Lobsters', '🦞', 'tech', 'api', true,
   '{"endpoint": "json", "baseUrl": "https://lobste.rs"}'),

  -- Major news RSS feeds
  ('guardian', 'The Guardian', '📰', 'news', 'rss', true,
   '{"url": "https://www.theguardian.com/world/rss"}'),
  ('bbc', 'BBC News', '📺', 'news', 'rss', true,
   '{"urls": ["https://feeds.bbci.co.uk/news/rss.xml", "https://feeds.bbci.co.uk/news/world/rss.xml"]}'),
  ('reuters', 'Reuters', '📡', 'news', 'rss', true,
   '{"url": "https://www.reutersagency.com/feed/", "proxy": "google-news"}'),
  ('apnews', 'AP News', '📻', 'news', 'rss', true,
   '{"url": "https://news.google.com/rss/search?q=site:apnews.com", "proxy": "google-news"}'),
  ('npr', 'NPR', '🎙️', 'news', 'rss', true,
   '{"urls": ["https://feeds.npr.org/1001/rss.xml", "https://feeds.npr.org/1014/rss.xml"]}'),

  -- Tech news RSS feeds
  ('techcrunch', 'TechCrunch', '💻', 'tech', 'rss', true,
   '{"url": "https://techcrunch.com/feed/"}'),
  ('arstechnica', 'Ars Technica', '🔬', 'tech', 'rss', true,
   '{"url": "https://feeds.arstechnica.com/arstechnica/technology-lab"}'),
  ('theverge', 'The Verge', '⚡', 'tech', 'rss', true,
   '{"url": "https://www.theverge.com/rss/index.xml"}');

-- Add comments
COMMENT ON TABLE news_sources IS 'News source configurations for scanning - includes system presets and user-added custom feeds';
COMMENT ON COLUMN news_sources.slug IS 'Unique identifier used in code (e.g., hackernews, guardian)';
COMMENT ON COLUMN news_sources.source_type IS 'How to fetch: api (custom endpoint), rss (feed URL), scraper (HTML parsing)';
COMMENT ON COLUMN news_sources.config IS 'JSON config specific to source_type - URLs, selectors, auth keys';
COMMENT ON COLUMN news_sources.is_system IS 'System sources cannot be deleted, only enabled/disabled';
