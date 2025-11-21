-- Function to increment article view count
-- Used by analytics tracking

CREATE OR REPLACE FUNCTION increment_view_count(article_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE articles
  SET view_count = view_count + 1
  WHERE id = article_id;
END;
$$;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION increment_view_count(UUID) TO authenticated, anon;
