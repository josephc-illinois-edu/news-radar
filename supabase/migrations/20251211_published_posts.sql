-- ============================================================================
-- Published Posts - Track articles published to external platforms
-- ============================================================================

-- Create published_posts table
CREATE TABLE IF NOT EXISTS published_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'published', 'failed')),
  post_url TEXT,
  external_post_id TEXT,
  content TEXT, -- Platform-specific content override
  image_url TEXT,
  published_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  error TEXT,
  engagement JSONB DEFAULT '{}',
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_published_posts_article_id ON published_posts(article_id);
CREATE INDEX IF NOT EXISTS idx_published_posts_platform ON published_posts(platform);
CREATE INDEX IF NOT EXISTS idx_published_posts_status ON published_posts(status);
CREATE INDEX IF NOT EXISTS idx_published_posts_user_id ON published_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_published_posts_scheduled_at ON published_posts(scheduled_at) WHERE status = 'scheduled';

-- Enable RLS
ALTER TABLE published_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own published posts"
  ON published_posts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own published posts"
  ON published_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own published posts"
  ON published_posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own published posts"
  ON published_posts FOR DELETE
  USING (auth.uid() = user_id);

-- Allow anonymous access for demo mode
CREATE POLICY "Allow anonymous read access"
  ON published_posts FOR SELECT
  USING (user_id IS NULL);

CREATE POLICY "Allow anonymous insert"
  ON published_posts FOR INSERT
  WITH CHECK (user_id IS NULL);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_published_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_published_posts_updated_at
  BEFORE UPDATE ON published_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_published_posts_updated_at();
