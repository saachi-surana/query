-- Query App - Supabase Schema
-- Run this in your Supabase SQL Editor

-- Sessions table
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  title text not null,
  description text,
  created_at timestamp with time zone default now()
);

-- Clusters table (defined before questions due to FK reference)
create table if not exists clusters (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  title text not null,
  summary_question text not null,
  status text not null default 'unanswered',
  created_at timestamp with time zone default now(),
  constraint clusters_status_check check (status in ('unanswered', 'answered'))
);

-- Questions table
create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  text text not null,
  author_name text,
  is_anonymous boolean not null default false,
  cluster_id uuid references clusters(id) on delete set null,
  status text not null default 'pending',
  upvotes integer not null default 0,
  created_at timestamp with time zone default now(),
  constraint questions_status_check check (status in ('pending', 'answered')),
  constraint questions_text_length check (char_length(text) <= 500)
);

-- Replies table
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

-- Indexes for common queries
create index if not exists questions_session_id_idx on questions(session_id);
create index if not exists questions_cluster_id_idx on questions(cluster_id);
create index if not exists clusters_session_id_idx on clusters(session_id);
create index if not exists sessions_code_idx on sessions(code);
create index if not exists replies_question_id_idx on replies(question_id);
create index if not exists replies_session_id_idx on replies(session_id);

-- Full-text search index for similarity matching
create index if not exists questions_text_fts_idx on questions using gin(to_tsvector('english', text));

-- Enable Row Level Security (optional but recommended)
-- For simplicity in development, we'll allow all operations
alter table sessions enable row level security;
alter table questions enable row level security;
alter table clusters enable row level security;

-- Permissive policies (adjust for production)
create policy "Allow all on sessions" on sessions for all using (true) with check (true);
create policy "Allow all on questions" on questions for all using (true) with check (true);
create policy "Allow all on clusters" on clusters for all using (true) with check (true);
create policy "Allow all on replies" on replies for all using (true) with check (true);

-- Enable Realtime
alter publication supabase_realtime add table questions;
alter publication supabase_realtime add table clusters;
alter publication supabase_realtime add table replies;
