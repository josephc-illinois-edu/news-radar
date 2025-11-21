-- Allow anonymous tag operations for CLI usage
-- Since this is a personal tool, we can relax RLS for convenience

-- Tags table - allow full access to anonymous users
CREATE POLICY "Allow anonymous tag operations"
  ON tags FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Article tags junction table - allow anonymous users to manage tag associations
CREATE POLICY "Allow anonymous article tag management"
  ON article_tags FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
