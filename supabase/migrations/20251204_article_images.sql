-- Migration: Add article images storage
-- Date: 2024-12-04
-- Description: Creates storage bucket and table for article featured images

-- Create article_images table to track generated images
CREATE TABLE IF NOT EXISTS article_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Image metadata
  title TEXT NOT NULL,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT,

  -- Generation details
  platform TEXT NOT NULL, -- facebook, linkedin, twitter, instagram, blog
  style TEXT NOT NULL, -- modern, minimal, bold, gradient, photo
  generation_mode TEXT NOT NULL, -- dalle, ai, placeholder
  prompt TEXT,

  -- Dimensions
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,

  -- Cost tracking (for DALL-E)
  cost DECIMAL(10, 4) DEFAULT 0,

  -- Status
  is_featured BOOLEAN DEFAULT false, -- Is this the current featured image for the article?

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add featured_image_url to articles table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'articles' AND column_name = 'featured_image_url'
  ) THEN
    ALTER TABLE articles ADD COLUMN featured_image_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'articles' AND column_name = 'featured_image_id'
  ) THEN
    ALTER TABLE articles ADD COLUMN featured_image_id UUID REFERENCES article_images(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_article_images_article_id ON article_images(article_id);
CREATE INDEX IF NOT EXISTS idx_article_images_user_id ON article_images(user_id);
CREATE INDEX IF NOT EXISTS idx_article_images_created_at ON article_images(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_article_images_is_featured ON article_images(is_featured) WHERE is_featured = true;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_article_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS article_images_updated_at ON article_images;
CREATE TRIGGER article_images_updated_at
  BEFORE UPDATE ON article_images
  FOR EACH ROW
  EXECUTE FUNCTION update_article_images_updated_at();

-- RLS Policies for article_images
ALTER TABLE article_images ENABLE ROW LEVEL SECURITY;

-- Users can read their own images
CREATE POLICY "Users can read own images"
  ON article_images FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own images
CREATE POLICY "Users can insert own images"
  ON article_images FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Users can update their own images
CREATE POLICY "Users can update own images"
  ON article_images FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own images
CREATE POLICY "Users can delete own images"
  ON article_images FOR DELETE
  USING (auth.uid() = user_id);

-- Allow anonymous image creation (for CLI/demo mode)
CREATE POLICY "Allow anonymous image creation"
  ON article_images FOR INSERT
  WITH CHECK (user_id IS NULL);

-- Allow reading images without user_id (anonymous images)
CREATE POLICY "Allow reading anonymous images"
  ON article_images FOR SELECT
  USING (user_id IS NULL);

-- Allow updating anonymous images
CREATE POLICY "Allow updating anonymous images"
  ON article_images FOR UPDATE
  USING (user_id IS NULL);

-- Allow reading images for published articles (public access)
CREATE POLICY "Public can read images for published articles"
  ON article_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM articles
      WHERE articles.id = article_images.article_id
      AND articles.status = 'published'
    )
  );

-- Storage bucket policies (run in Supabase dashboard or via API)
-- Note: Storage bucket creation requires Supabase dashboard or service role
--
-- Bucket: article-images
-- Public: true (for serving images)
-- File size limit: 5MB
-- Allowed MIME types: image/png, image/jpeg, image/webp, image/svg+xml

COMMENT ON TABLE article_images IS 'Stores metadata for generated article images. Actual files stored in Supabase Storage bucket "article-images".';
