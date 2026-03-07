-- Run this migration in your Supabase SQL Editor for Sprint 3 features

-- Multi-moderator: cluster claiming
alter table clusters add column if not exists claimed_by text;

-- AI auto-suggest toggle on sessions
alter table sessions add column if not exists auto_suggest boolean not null default false;

-- AI auto-answering: suggested answers on questions
alter table questions add column if not exists suggested_answer text;

-- FAQ library table
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
create policy "Allow all on faq_entries" on faq_entries for all using (true) with check (true);
