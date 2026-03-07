-- Run this migration in your Supabase SQL Editor to add the replies table

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
create policy "Allow all on replies" on replies for all using (true) with check (true);

alter publication supabase_realtime add table replies;
