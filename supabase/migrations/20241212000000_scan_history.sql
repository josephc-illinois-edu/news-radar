-- Scan history for trend analysis
CREATE TABLE IF NOT EXISTS scan_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  scanned_at timestamptz DEFAULT now(),
  config jsonb NOT NULL,
  topics_found int NOT NULL DEFAULT 0,
  stories_found int NOT NULL DEFAULT 0,
  top_topics text[] NOT NULL DEFAULT '{}',
  source_stats jsonb,
  errors text[],
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scan_history_user_date ON scan_history(user_id, scanned_at DESC);

-- User scan presets
CREATE TABLE IF NOT EXISTS scan_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  config jsonb NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scan_presets_user ON scan_presets(user_id);

-- RLS policies
ALTER TABLE scan_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_presets ENABLE ROW LEVEL SECURITY;

-- Scan history policies
CREATE POLICY "Users can view own scan history"
  ON scan_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scan history"
  ON scan_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own scan history"
  ON scan_history FOR DELETE
  USING (auth.uid() = user_id);

-- Scan presets policies
CREATE POLICY "Users can view own presets"
  ON scan_presets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own presets"
  ON scan_presets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own presets"
  ON scan_presets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own presets"
  ON scan_presets FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-cleanup function for old scan history (30 days)
CREATE OR REPLACE FUNCTION cleanup_old_scan_history()
RETURNS void AS $$
BEGIN
  DELETE FROM scan_history
  WHERE scanned_at < now() - interval '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment for documentation
COMMENT ON TABLE scan_history IS 'Stores scan results for trend analysis, auto-deleted after 30 days';
COMMENT ON TABLE scan_presets IS 'User-saved scan configuration presets';
