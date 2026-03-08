-- Query App — Consolidated Migrations
-- Run this ONCE in your Supabase SQL Editor if you already have the base schema
-- (sessions, questions, clusters tables from supabase-schema.sql)
--
-- This file combines all migrations from Sprint 1, 2, and 3.
-- Safe to re-run — all statements use IF NOT EXISTS / IF EXISTS.

-- ============================================================
-- REPLIES TABLE (Sprint 1)
-- ============================================================

create table if not exists replies (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  session_id uuid not null references sessions(id) on delete cascade,
  text text not null,
  author_name text,
  is_host boolean not null default false,
  created_at timestamp with time zone default now(),
  constraint replies_text_length check (char_length(text) <= 500)
);

create index if not exists replies_question_id_idx on replies(question_id);
create index if not exists replies_session_id_idx on replies(session_id);

alter table replies enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Allow all on replies') then
    create policy "Allow all on replies" on replies for all using (true) with check (true);
  end if;
end $$;

-- ============================================================
-- MODERATION (Sprint 1)
-- ============================================================

alter table sessions add column if not exists moderation_enabled boolean not null default false;
alter table questions add column if not exists approved boolean not null default true;
create index if not exists questions_approved_idx on questions(approved);

-- ============================================================
-- HIGHLIGHT, END SESSION, PRE-SESSION (Sprint 2)
-- ============================================================

alter table sessions add column if not exists highlighted_cluster_id uuid references clusters(id) on delete set null;
alter table sessions add column if not exists ended_at timestamp with time zone;
alter table sessions add column if not exists starts_at timestamp with time zone;

-- ============================================================
-- MULTI-MODERATOR, AI SUGGEST, FAQ LIBRARY (Sprint 3)
-- ============================================================

alter table clusters add column if not exists claimed_by text;
alter table sessions add column if not exists auto_suggest boolean not null default false;
alter table questions add column if not exists suggested_answer text;

create table if not exists faq_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  cluster_title text not null,
  summary_question text not null,
  answer text not null,
  created_at timestamp with time zone default now()
);

create index if not exists faq_entries_session_id_idx on faq_entries(session_id);

alter table faq_entries enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Allow all on faq_entries') then
    create policy "Allow all on faq_entries" on faq_entries for all using (true) with check (true);
  end if;
end $$;

-- ============================================================
-- RECURRING SESSIONS (Sprint 4)
-- ============================================================

alter table sessions add column if not exists recurrence_type text;
alter table sessions add column if not exists recurrence_parent_id uuid;
alter table sessions add column if not exists recurrence_dates jsonb;

-- ============================================================
-- AUTO-MARK ANSWERED ON HOST REPLY (Sprint 6)
-- ============================================================

-- When a host reply is inserted, automatically mark the question as answered.
-- This makes the behavior reliable regardless of which client inserts the reply.

CREATE OR REPLACE FUNCTION auto_mark_answered()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_host = true THEN
    UPDATE questions SET status = 'answered' WHERE id = NEW.question_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_host_reply_mark_answered'
  ) THEN
    CREATE TRIGGER on_host_reply_mark_answered
      AFTER INSERT ON replies
      FOR EACH ROW
      EXECUTE FUNCTION auto_mark_answered();
  END IF;
END $$;

-- ============================================================
-- EMPTY TEXT CONSTRAINT (Sprint 6)
-- ============================================================

-- Prevent empty question text at the database level
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'questions_text_not_empty'
  ) THEN
    ALTER TABLE questions ADD CONSTRAINT questions_text_not_empty CHECK (char_length(trim(text)) > 0);
  END IF;
END $$;

-- ============================================================
-- WORD CLOUDS (Sprint 9.3)
-- ============================================================

CREATE TABLE IF NOT EXISTS word_clouds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  prompt text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS word_clouds_session_id_idx ON word_clouds(session_id);

ALTER TABLE word_clouds ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all on word_clouds') THEN
    CREATE POLICY "Allow all on word_clouds" ON word_clouds FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS word_cloud_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word_cloud_id uuid REFERENCES word_clouds(id) ON DELETE CASCADE NOT NULL,
  word text NOT NULL,
  device_id text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS word_cloud_entries_word_cloud_id_idx ON word_cloud_entries(word_cloud_id);

ALTER TABLE word_cloud_entries ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all on word_cloud_entries') THEN
    CREATE POLICY "Allow all on word_cloud_entries" ON word_cloud_entries FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- POLLS (Sprint 9.2)
-- ============================================================

CREATE TABLE IF NOT EXISTS polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]',
  votes jsonb NOT NULL DEFAULT '{}',
  allow_multiple boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS polls_session_id_idx ON polls(session_id);

ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all on polls') THEN
    CREATE POLICY "Allow all on polls" ON polls FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- REALTIME
-- ============================================================

-- Enable realtime on all tables (safe to re-run, will error silently if already added)
do $$ begin
  alter publication supabase_realtime add table sessions;
exception when others then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table replies;
exception when others then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table word_clouds;
exception when others then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table word_cloud_entries;
exception when others then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table polls;
exception when others then null;
end $$;

-- ============================================================
-- CUSTOM HOST BRANDING (Sprint 9.5)
-- ============================================================

-- Logo URL (public Supabase Storage URL) and brand color (hex string)
-- NOTE: You must also create a Supabase Storage bucket named "logos"
--       with public access in your Supabase dashboard.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS brand_color text;
