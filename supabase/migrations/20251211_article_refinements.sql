-- Track individual refinement events for preference learning
CREATE TABLE IF NOT EXISTS article_refinements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Selection info
  selection_text TEXT NOT NULL,
  selection_start INT NOT NULL,
  selection_end INT NOT NULL,

  -- Refinement details
  feedback_type TEXT NOT NULL, -- 'redundant', 'unclear', 'tone', 'wordy', 'factual', 'custom'
  instruction TEXT NOT NULL,

  -- Before/after for learning
  before_text TEXT NOT NULL,
  after_text TEXT,  -- NULL if user discarded

  -- Outcome
  applied BOOLEAN DEFAULT FALSE,

  -- Metadata
  model TEXT DEFAULT 'haiku',
  tokens_used INT,
  cost DECIMAL(10, 6),

  -- For future preference promotion
  promoted_to_preference_id UUID,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user preference analysis
CREATE INDEX IF NOT EXISTS idx_refinements_user_feedback ON article_refinements(user_id, feedback_type);
CREATE INDEX IF NOT EXISTS idx_refinements_article ON article_refinements(article_id);
CREATE INDEX IF NOT EXISTS idx_refinements_created ON article_refinements(created_at DESC);

-- Future: User writing preferences (populated from refinement patterns)
CREATE TABLE IF NOT EXISTS user_writing_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  category TEXT NOT NULL, -- 'tone', 'structure', 'terminology', 'style'
  scope TEXT DEFAULT 'all', -- 'all', 'conversational', 'academic', etc.
  rule_type TEXT NOT NULL, -- 'avoid', 'prefer', 'replace', 'example'

  content JSONB NOT NULL, -- { pattern, replacement, examples[] }

  weight INT DEFAULT 1, -- frequency-based importance
  active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_preferences_user ON user_writing_preferences(user_id, active);

-- Enable RLS
ALTER TABLE article_refinements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_writing_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for article_refinements
CREATE POLICY "Users can view own refinements"
  ON article_refinements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own refinements"
  ON article_refinements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own refinements"
  ON article_refinements FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for user_writing_preferences
CREATE POLICY "Users can view own preferences"
  ON user_writing_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON user_writing_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_writing_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences"
  ON user_writing_preferences FOR DELETE
  USING (auth.uid() = user_id);
