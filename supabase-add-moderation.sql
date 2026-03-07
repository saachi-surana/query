-- Run this migration in your Supabase SQL Editor to add moderation support

-- Add moderation toggle to sessions
alter table sessions add column if not exists moderation_enabled boolean not null default false;

-- Add approved flag to questions (default true so existing questions aren't broken)
alter table questions add column if not exists approved boolean not null default true;

-- Index for filtering unapproved questions
create index if not exists questions_approved_idx on questions(approved);

-- Enable realtime on sessions table (needed for moderation toggle sync)
alter publication supabase_realtime add table sessions;
