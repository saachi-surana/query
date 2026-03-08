-- Sprint 7: Host Authentication Migration
-- Run this against your Supabase database

-- Add user_id column to sessions (nullable so existing sessions still work)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- NOTE: RLS is intentionally NOT enabled here. Add RLS policies in a future sprint.

-- TODO (Sprint 7 follow-up): Update app/session/[code]/page.tsx to show a user
-- indicator in the session header. This could be a small avatar or email badge
-- in the top-right of the header bar, with a sign-out option. The session page
-- is large and complex, so this change is deferred to avoid regressions.
