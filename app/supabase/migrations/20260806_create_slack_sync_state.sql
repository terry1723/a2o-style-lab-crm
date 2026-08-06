create table if not exists public.slack_sync_state (
  entity_type text not null,
  entity_key text not null,
  fingerprint text not null default '',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_notified_at timestamptz,
  last_reminded_at timestamptz,
  reminder_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  primary key (entity_type, entity_key)
);

alter table public.slack_sync_state enable row level security;

grant usage on schema public to service_role;
grant select, insert, update, delete on table public.slack_sync_state to service_role;

create index if not exists slack_sync_state_last_seen_idx
  on public.slack_sync_state (last_seen_at desc);

comment on table public.slack_sync_state is
  'Internal deduplication and reminder state for A2O Slack notifications.';

select pg_notify('pgrst', 'reload schema');
