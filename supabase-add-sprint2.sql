-- Run this migration in your Supabase SQL Editor for Sprint 2 features

-- Highlighted cluster (Discussing Now)
alter table sessions add column if not exists highlighted_cluster_id uuid references clusters(id) on delete set null;

-- End session timestamp (post-session follow-up)
alter table sessions add column if not exists ended_at timestamp with time zone;

-- Pre-session start time
alter table sessions add column if not exists starts_at timestamp with time zone;
