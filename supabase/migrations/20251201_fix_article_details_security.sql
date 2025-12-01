-- Fix SECURITY DEFINER issue on article_details view
-- Recreate as SECURITY INVOKER to respect RLS policies

-- Drop the existing view
DROP VIEW IF EXISTS article_details;

-- Recreate with explicit SECURITY INVOKER (respects caller's RLS)
CREATE VIEW article_details
WITH (security_invoker = true) AS
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

-- Grant access to roles that need it
GRANT SELECT ON article_details TO anon, authenticated;

COMMENT ON VIEW article_details IS 'Aggregated article data with author info and counts - SECURITY INVOKER respects RLS';
