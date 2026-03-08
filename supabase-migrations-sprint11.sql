-- Sprint 11.1: Session Context for AI (Smart Answers)
-- Run this migration to add the session_context table

CREATE TABLE IF NOT EXISTS session_context (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('document', 'url', 'previous_session', 'description')),
  content_text TEXT NOT NULL,
  source_url TEXT,
  file_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by session
CREATE INDEX IF NOT EXISTS idx_session_context_session_id ON session_context(session_id);

-- Enable RLS
ALTER TABLE session_context ENABLE ROW LEVEL SECURITY;

-- Allow all operations (no auth in Query)
CREATE POLICY "Allow all access to session_context" ON session_context
  FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime (optional, for future use)
ALTER PUBLICATION supabase_realtime ADD TABLE session_context;
