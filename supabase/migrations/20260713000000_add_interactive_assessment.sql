-- Optional, additive migration for per-answer remote persistence.
-- This file is intentionally NOT applied by the interactive landing page Preview deploy.

create table if not exists public.assessment_sessions (
  id text primary key,
  anonymous_token text not null unique,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  current_scene integer not null default 1 check (current_scene between 1 and 20),
  started_at timestamptz not null default now(),
  source_url text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  device_category text check (device_category in ('mobile', 'desktop'))
);

create table if not exists public.assessment_answers (
  id text primary key,
  session_id text not null references public.assessment_sessions(id) on delete cascade,
  question_id text not null,
  selected_option_ids text[] not null,
  answered_at timestamptz not null default now(),
  constraint assessment_answer_id_matches check (id = session_id || ':' || question_id),
  constraint assessment_answer_selection_count check (cardinality(selected_option_ids) between 1 and 3)
);

create index if not exists assessment_answers_session_id_idx
  on public.assessment_answers(session_id);

alter table public.assessment_sessions enable row level security;
alter table public.assessment_answers enable row level security;

revoke all on public.assessment_sessions from anon, authenticated;
revoke all on public.assessment_answers from anon, authenticated;
grant insert on public.assessment_sessions to anon;
grant insert on public.assessment_answers to anon;

drop policy if exists "anonymous can create assessment session" on public.assessment_sessions;
create policy "anonymous can create assessment session"
  on public.assessment_sessions
  for insert
  to anon
  with check (
    id = anonymous_token
    and char_length(id) between 16 and 80
    and status = 'in_progress'
    and current_scene = 1
  );

drop policy if exists "anonymous can submit assessment answer" on public.assessment_answers;
create policy "anonymous can submit assessment answer"
  on public.assessment_answers
  for insert
  to anon
  with check (
    char_length(session_id) between 16 and 80
    and question_id ~ '^q[0-9]{1,2}$'
    and id = session_id || ':' || question_id
    and cardinality(selected_option_ids) between 1 and 3
  );

comment on table public.assessment_sessions is
  'Anonymous A2O interactive assessment sessions. Insert-only for anon clients.';
comment on table public.assessment_answers is
  'Confirmed answers for A2O interactive assessments. Insert-only for anon clients.';
