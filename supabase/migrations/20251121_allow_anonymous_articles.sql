-- Allow anonymous article creation for CLI usage
-- Since this is a personal tool, we can relax RLS for convenience

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can insert own articles" ON articles;

-- Allow anonymous users to insert articles (CLI usage)
CREATE POLICY "Allow anonymous article creation"
  ON articles FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anonymous users to read their own articles (articles without user_id)
CREATE POLICY "Allow anonymous article access"
  ON articles FOR ALL
  TO anon
  USING (user_id IS NULL);

-- Also allow anonymous access to related tables
DROP POLICY IF EXISTS "Users can manage own article revisions" ON article_revisions;
CREATE POLICY "Allow anonymous revisions"
  ON article_revisions FOR ALL
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Users can manage own article sources" ON sources;
CREATE POLICY "Allow anonymous sources"
  ON sources FOR ALL
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Users can manage own article tags" ON article_tags;
CREATE POLICY "Allow anonymous article tags"
  ON article_tags FOR ALL
  TO anon
  USING (true);

COMMENT ON POLICY "Allow anonymous article creation" ON articles IS 'CLI tool usage - allows personal article generation without authentication';
