-- Canonical advertising leads and one-way Slack sync queue.
-- Additive only: existing CRM, tracking and appointment tables remain intact.

create extension if not exists pgcrypto;

create table if not exists public.ad_leads (
  id uuid primary key default gen_random_uuid(),
  normalized_phone text not null unique check (normalized_phone ~ '^[0-9]{8,15}$'),
  display_phone text not null,
  name text not null,
  current_status text not null default '未聯絡'
    check (current_status in ('未聯絡', 'WhatsApp 跟進中', '已預約', '已拒絕')),
  owner text not null default 'Ryan'
    check (owner in ('Terry', 'Ryan', 'Martin', 'Caren', 'New')),
  latest_source text not null default '',
  latest_source_key text not null default '',
  latest_tag text not null default '',
  first_submitted_at timestamptz not null,
  latest_submitted_at timestamptz not null,
  appointment_at timestamptz,
  needs_review boolean not null default false,
  slack_list_item_id text,
  slack_last_synced_version bigint,
  slack_last_synced_at timestamptz,
  sync_version bigint not null default 1 check (sync_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (first_submitted_at <= latest_submitted_at)
);

create index if not exists ad_leads_latest_submitted_at_idx
  on public.ad_leads (latest_submitted_at desc);

create table if not exists public.ad_lead_submissions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.ad_leads(id) on delete set null,
  source_key text not null unique,
  source_form text not null,
  source_tag text not null default '',
  source_spreadsheet_id text,
  source_sheet_name text,
  source_row_number integer,
  submitted_name text not null,
  submitted_phone text not null,
  normalized_phone text check (normalized_phone is null or normalized_phone ~ '^[0-9]{8,15}$'),
  submitted_at timestamptz not null,
  payload_checksum text not null,
  raw_payload jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now()
);

create index if not exists ad_lead_submissions_lead_id_idx
  on public.ad_lead_submissions (lead_id, submitted_at desc);

create index if not exists ad_lead_submissions_normalized_phone_idx
  on public.ad_lead_submissions (normalized_phone);

create table if not exists public.slack_sync_outbox (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.ad_leads(id) on delete cascade,
  event_type text not null default 'lead_upsert' check (event_type = 'lead_upsert'),
  target_version bigint not null check (target_version > 0),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed', 'dead_letter')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  last_error_code text,
  last_error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists slack_sync_outbox_claim_idx
  on public.slack_sync_outbox (next_attempt_at, created_at)
  where status in ('pending', 'failed');

create index if not exists slack_sync_outbox_lead_idx
  on public.slack_sync_outbox (lead_id, target_version desc);

drop index if exists public.slack_sync_outbox_active_lead_idx;
create unique index if not exists slack_sync_outbox_active_lead_idx
  on public.slack_sync_outbox (lead_id)
  where status in ('pending', 'processing', 'failed');

create table if not exists public.ad_lead_sync_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running'
    check (status in ('running', 'completed', 'failed')),
  imported integer not null default 0 check (imported >= 0),
  deduplicated integer not null default 0 check (deduplicated >= 0),
  invalid_phones integer not null default 0 check (invalid_phones >= 0),
  unavailable_sources text[] not null default '{}',
  error_code text
);

create index if not exists ad_lead_sync_runs_started_at_idx
  on public.ad_lead_sync_runs (started_at desc);

-- A single short-lived lease prevents overlapping Vercel Cron deliveries from
-- importing the same external pages and claiming work at the same time.
create table if not exists public.ad_lead_sync_leases (
  name text primary key,
  locked_until timestamptz not null default to_timestamp(0),
  locked_by text,
  updated_at timestamptz not null default now()
);

insert into public.ad_lead_sync_leases (name)
values ('ad-lead-sync')
on conflict (name) do nothing;

-- Invalid phone submissions are retained for staff review instead of silently
-- disappearing from the canonical lead import.
create table if not exists public.ad_lead_review_queue (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  source_form text not null,
  submitted_name text not null,
  submitted_phone text not null,
  reason text not null default 'invalid_phone',
  raw_payload jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.ad_leads enable row level security;
alter table public.ad_lead_submissions enable row level security;
alter table public.slack_sync_outbox enable row level security;
alter table public.ad_lead_sync_runs enable row level security;
alter table public.ad_lead_sync_leases enable row level security;
alter table public.ad_lead_review_queue enable row level security;

revoke all on public.ad_leads from anon, authenticated;
revoke all on public.ad_lead_submissions from anon, authenticated;
revoke all on public.slack_sync_outbox from anon, authenticated;
revoke all on public.ad_lead_sync_runs from anon, authenticated;
revoke all on public.ad_lead_sync_leases from anon, authenticated;
revoke all on public.ad_lead_review_queue from anon, authenticated;
grant select, insert, update, delete on public.ad_leads to service_role;
grant select, insert, update, delete on public.ad_lead_submissions to service_role;
grant select, insert, update, delete on public.slack_sync_outbox to service_role;
grant select, insert, update, delete on public.ad_lead_sync_runs to service_role;
grant select, insert, update, delete on public.ad_lead_sync_leases to service_role;
grant select, insert, update, delete on public.ad_lead_review_queue to service_role;

create or replace function public.set_ad_lead_canonical_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ad_leads_updated_at on public.ad_leads;
create trigger ad_leads_updated_at
before update on public.ad_leads
for each row execute function public.set_ad_lead_canonical_updated_at();

create or replace function public.acquire_ad_lead_sync_lease(
  p_name text,
  p_worker_id text,
  p_lease_seconds integer default 300
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_acquired boolean;
begin
  if nullif(trim(coalesce(p_name, '')), '') is null
    or nullif(trim(coalesce(p_worker_id, '')), '') is null then
    return false;
  end if;

  insert into public.ad_lead_sync_leases (name, locked_until, locked_by, updated_at)
  values (
    trim(p_name),
    now() + make_interval(secs => greatest(30, least(coalesce(p_lease_seconds, 300), 900))),
    trim(p_worker_id),
    now()
  )
  on conflict (name) do update set
    locked_until = excluded.locked_until,
    locked_by = excluded.locked_by,
    updated_at = now()
  where public.ad_lead_sync_leases.locked_until <= now()
     or public.ad_lead_sync_leases.locked_by = excluded.locked_by
  returning true into v_acquired;

  return coalesce(v_acquired, false);
end;
$$;

create or replace function public.release_ad_lead_sync_lease(
  p_name text,
  p_worker_id text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.ad_lead_sync_leases
  set locked_until = to_timestamp(0), locked_by = null, updated_at = now()
  where name = p_name and locked_by = p_worker_id;
end;
$$;

create or replace function public.enqueue_ad_lead_slack_sync(
  p_lead_id uuid,
  p_target_version bigint
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_lead_id::text, 0));

  update public.slack_sync_outbox
  set target_version = greatest(target_version, p_target_version),
      next_attempt_at = now(),
      status = case when status = 'processing' then status else 'pending' end,
      last_error_code = null,
      last_error_message = null
  where lead_id = p_lead_id
    and event_type = 'lead_upsert'
    and status in ('pending', 'processing', 'failed');

  if not found then
    insert into public.slack_sync_outbox (lead_id, target_version)
    values (p_lead_id, p_target_version);
  end if;
end;
$$;

create or replace function public.claim_ad_lead_slack_outbox(
  p_limit integer,
  p_worker_id text
)
returns setof public.slack_sync_outbox
language plpgsql
security invoker
set search_path = public
as $$
begin
  return query
  with candidates as (
    select id
    from public.slack_sync_outbox
    where (
      (status in ('pending', 'failed') and next_attempt_at <= now())
      or (status = 'processing' and locked_at < now() - interval '10 minutes')
    )
    order by next_attempt_at, created_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 1), 50))
  )
  update public.slack_sync_outbox o
  set status = 'processing',
      locked_at = now(),
      locked_by = coalesce(nullif(p_worker_id, ''), 'unknown-worker'),
      attempt_count = o.attempt_count + 1
  from candidates c
  where o.id = c.id
  returning o.*;
end;
$$;

-- Immediate CRM updates use the same lease discipline as Cron.  If another
-- worker already owns this lead's active row, returning no row lets that
-- worker finish without creating a second Slack item.
create or replace function public.claim_ad_lead_slack_outbox_for_lead(
  p_lead_id uuid,
  p_worker_id text
)
returns setof public.slack_sync_outbox
language plpgsql
security invoker
set search_path = public
as $$
begin
  return query
  with candidate as (
    select id
    from public.slack_sync_outbox
    where lead_id = p_lead_id
      and (
        (status in ('pending', 'failed') and next_attempt_at <= now())
        or (status = 'processing' and locked_at < now() - interval '10 minutes')
      )
    order by next_attempt_at, created_at
    for update skip locked
    limit 1
  )
  update public.slack_sync_outbox o
  set status = 'processing',
      locked_at = now(),
      locked_by = coalesce(nullif(p_worker_id, ''), 'unknown-worker'),
      attempt_count = o.attempt_count + 1
  from candidate c
  where o.id = c.id
  returning o.*;
end;
$$;

drop function if exists public.mark_ad_lead_slack_synced(uuid, uuid, bigint, text);
create or replace function public.mark_ad_lead_slack_synced(
  p_outbox_id uuid,
  p_lead_id uuid,
  p_worker_id text,
  p_synced_version bigint,
  p_slack_list_item_id text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_current_version bigint;
begin
  select sync_version into v_current_version
  from public.ad_leads
  where id = p_lead_id
  for update;

  if v_current_version is null then
    raise exception 'canonical_lead_not_found';
  end if;

  update public.slack_sync_outbox
  set status = 'completed',
      completed_at = now(),
      locked_at = null,
      locked_by = null,
      last_error_code = null,
      last_error_message = null
  where id = p_outbox_id
    and lead_id = p_lead_id
    and status = 'processing'
    and locked_by = p_worker_id;

  if not found then
    raise exception 'stale_outbox_lease';
  end if;

  update public.ad_leads
  set slack_list_item_id = p_slack_list_item_id,
      slack_last_synced_version = p_synced_version,
      slack_last_synced_at = now()
  where id = p_lead_id;

  if v_current_version is not null and v_current_version > p_synced_version then
    perform public.enqueue_ad_lead_slack_sync(p_lead_id, v_current_version);
  end if;
end;
$$;

create or replace function public.fail_ad_lead_slack_outbox(
  p_outbox_id uuid,
  p_worker_id text,
  p_status text,
  p_next_attempt_at timestamptz,
  p_error_code text,
  p_error_message text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_status not in ('failed', 'dead_letter') then
    raise exception 'invalid_outbox_status';
  end if;

  update public.slack_sync_outbox
  set status = p_status,
      next_attempt_at = coalesce(p_next_attempt_at, now()),
      locked_at = null,
      locked_by = null,
      last_error_code = left(coalesce(p_error_code, 'unknown_error'), 120),
      last_error_message = left(coalesce(p_error_message, p_error_code, 'unknown_error'), 500)
  where id = p_outbox_id
    and status = 'processing'
    and locked_by = p_worker_id;

  if not found then
    raise exception 'stale_outbox_lease';
  end if;
end;
$$;

create or replace function public.requeue_ad_lead_slack_outbox(
  p_outbox_id uuid default null
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.slack_sync_outbox
  set status = 'pending',
      next_attempt_at = now(),
      locked_at = null,
      locked_by = null,
      last_error_code = null,
      last_error_message = null
  where status in ('failed', 'dead_letter')
    and (p_outbox_id is null or id = p_outbox_id);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.import_ad_lead_submission(
  p_source_key text,
  p_source_form text,
  p_source_tag text,
  p_source_spreadsheet_id text,
  p_source_sheet_name text,
  p_source_row_number integer,
  p_submitted_name text,
  p_submitted_phone text,
  p_normalized_phone text,
  p_submitted_at timestamptz,
  p_payload_checksum text,
  p_raw_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_lead_id uuid;
  v_submission_id uuid;
  v_latest_submitted_at timestamptz;
  v_legacy_status text;
  v_legacy_owner text;
  v_legacy_appointment_date date;
  v_legacy_appointment_time text;
  v_should_enqueue boolean := false;
begin
  if p_source_key is null or p_source_key = ''
    or p_source_form is null or p_submitted_name is null
    or p_submitted_phone is null or p_submitted_at is null
    or p_payload_checksum is null then
    raise exception 'invalid_ad_lead_submission';
  end if;

  if p_normalized_phone is null then
    insert into public.ad_lead_review_queue (
      source_key, source_form, submitted_name, submitted_phone, reason, raw_payload, last_seen_at
    ) values (
      p_source_key, p_source_form, p_submitted_name, p_submitted_phone,
      'invalid_phone', coalesce(p_raw_payload, '{}'::jsonb), now()
    ) on conflict (source_key) do update set
      source_form = excluded.source_form,
      submitted_name = excluded.submitted_name,
      submitted_phone = excluded.submitted_phone,
      raw_payload = excluded.raw_payload,
      last_seen_at = now(),
      resolved_at = null;

    insert into public.ad_lead_submissions (
      source_key, source_form, source_tag, source_spreadsheet_id,
      source_sheet_name, source_row_number, submitted_name, submitted_phone,
      normalized_phone, submitted_at, payload_checksum, raw_payload
    ) values (
      p_source_key, p_source_form, coalesce(p_source_tag, ''), p_source_spreadsheet_id,
      p_source_sheet_name, p_source_row_number, p_submitted_name, p_submitted_phone,
      null, p_submitted_at, p_payload_checksum, coalesce(p_raw_payload, '{}'::jsonb)
    ) on conflict (source_key) do nothing
    returning id into v_submission_id;
    return null;
  end if;

  insert into public.ad_leads (
    normalized_phone, display_phone, name, latest_source, latest_source_key, latest_tag,
    first_submitted_at, latest_submitted_at
  ) values (
    p_normalized_phone, p_submitted_phone, p_submitted_name, p_source_form, p_source_key,
    coalesce(p_source_tag, ''), p_submitted_at, p_submitted_at
  ) on conflict (normalized_phone) do update set
    first_submitted_at = least(public.ad_leads.first_submitted_at, excluded.first_submitted_at),
    display_phone = case when excluded.latest_submitted_at >= public.ad_leads.latest_submitted_at
      then excluded.display_phone else public.ad_leads.display_phone end,
    name = case when excluded.latest_submitted_at >= public.ad_leads.latest_submitted_at
      then excluded.name else public.ad_leads.name end,
    latest_source = case when excluded.latest_submitted_at >= public.ad_leads.latest_submitted_at
      then excluded.latest_source else public.ad_leads.latest_source end,
    latest_source_key = case when excluded.latest_submitted_at >= public.ad_leads.latest_submitted_at
      then excluded.latest_source_key else public.ad_leads.latest_source_key end,
    latest_tag = case when excluded.latest_submitted_at >= public.ad_leads.latest_submitted_at
      and excluded.latest_tag <> '' then excluded.latest_tag else public.ad_leads.latest_tag end,
    latest_submitted_at = greatest(public.ad_leads.latest_submitted_at, excluded.latest_submitted_at),
    sync_version = case when excluded.latest_submitted_at > public.ad_leads.latest_submitted_at
      then public.ad_leads.sync_version + 1 else public.ad_leads.sync_version end
  returning id, latest_submitted_at into v_lead_id, v_latest_submitted_at;

  insert into public.ad_lead_submissions (
    lead_id, source_key, source_form, source_tag, source_spreadsheet_id,
    source_sheet_name, source_row_number, submitted_name, submitted_phone,
    normalized_phone, submitted_at, payload_checksum, raw_payload
  ) values (
    v_lead_id, p_source_key, p_source_form, coalesce(p_source_tag, ''), p_source_spreadsheet_id,
    p_source_sheet_name, p_source_row_number, p_submitted_name, p_submitted_phone,
    p_normalized_phone, p_submitted_at, p_payload_checksum, coalesce(p_raw_payload, '{}'::jsonb)
  ) on conflict (source_key) do nothing
  returning id into v_submission_id;

  v_should_enqueue := v_submission_id is not null;

  -- Preserve existing CRM tracking and appointments during the additive
  -- backfill. These legacy values are only used while the canonical row is
  -- still at its default state; later CRM edits remain authoritative.
  select status, owner into v_legacy_status, v_legacy_owner
  from public.ad_lead_tracking
  where source_key = p_source_key;

  if v_legacy_status is not null or v_legacy_owner is not null then
    if exists (
      select 1 from public.ad_leads
      where id = v_lead_id
        and ((current_status = '未聯絡' and v_legacy_status is not null and current_status <> v_legacy_status)
          or (owner = 'Ryan' and v_legacy_owner is not null and owner <> v_legacy_owner))
    ) then
      v_should_enqueue := true;
    end if;
    update public.ad_leads
    set current_status = case
          when current_status = '未聯絡' and v_legacy_status is not null then v_legacy_status
          else current_status
        end,
        owner = case
          when owner = 'Ryan' and v_legacy_owner is not null then v_legacy_owner
          else owner
        end,
        sync_version = sync_version + case
          when (current_status = '未聯絡' and v_legacy_status is not null and current_status <> v_legacy_status)
            or (owner = 'Ryan' and v_legacy_owner is not null and owner <> v_legacy_owner)
          then 1 else 0 end
    where id = v_lead_id;
  end if;

  select appointment_date, appointment_time
  into v_legacy_appointment_date, v_legacy_appointment_time
  from public.ad_lead_appointments
  where source_key = p_source_key;

  if v_legacy_appointment_date is not null and v_legacy_appointment_time is not null then
    if exists (
      select 1 from public.ad_leads
      where id = v_lead_id and appointment_at is null
    ) then
      v_should_enqueue := true;
    end if;
    update public.ad_leads
    set appointment_at = coalesce(
          appointment_at,
          (v_legacy_appointment_date::text || ' ' || v_legacy_appointment_time)::timestamp
            at time zone 'Asia/Hong_Kong'
        ),
        current_status = case when appointment_at is null and current_status = '未聯絡' then '已預約' else current_status end,
        sync_version = sync_version + case when appointment_at is null then 1 else 0 end
    where id = v_lead_id;
  end if;

  if v_should_enqueue then
    perform public.enqueue_ad_lead_slack_sync(v_lead_id, (select sync_version from public.ad_leads where id = v_lead_id));
  end if;
  return v_lead_id;
end;
$$;

create or replace function public.update_ad_lead_tracking(
  p_source_key text,
  p_status text,
  p_owner text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_lead_id uuid;
begin
  select lead_id into v_lead_id
  from public.ad_lead_submissions
  where source_key = p_source_key
  order by submitted_at desc
  limit 1;

  if v_lead_id is null then
    raise exception 'canonical_lead_not_found';
  end if;

  update public.ad_leads
  set current_status = p_status,
      owner = p_owner,
      sync_version = sync_version + 1
  where id = v_lead_id;

  insert into public.ad_lead_tracking (source_key, status, owner)
  values (p_source_key, p_status, p_owner)
  on conflict (source_key) do update set status = excluded.status, owner = excluded.owner;

  perform public.enqueue_ad_lead_slack_sync(v_lead_id, (select sync_version from public.ad_leads where id = v_lead_id));
end;
$$;

-- Extend the existing appointment RPC without removing its legacy behaviour.
create or replace function public.book_ad_lead_appointment(
  p_source_key text,
  p_owner text,
  p_appointment_date date,
  p_appointment_time text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead_id uuid;
  v_appointment_at timestamptz;
begin
  insert into public.ad_lead_tracking (source_key, status, owner)
  values (p_source_key, '已預約', p_owner)
  on conflict (source_key) do update
  set status = excluded.status, owner = excluded.owner;

  insert into public.ad_lead_appointments (source_key, appointment_date, appointment_time)
  values (p_source_key, p_appointment_date, p_appointment_time)
  on conflict (source_key) do update
  set appointment_date = excluded.appointment_date, appointment_time = excluded.appointment_time;

  select lead_id into v_lead_id
  from public.ad_lead_submissions
  where source_key = p_source_key
  order by submitted_at desc
  limit 1;

  if v_lead_id is not null then
    v_appointment_at := (p_appointment_date::text || ' ' || p_appointment_time)::timestamp
      at time zone 'Asia/Hong_Kong';
    update public.ad_leads
    set current_status = '已預約', owner = p_owner,
        appointment_at = v_appointment_at, sync_version = sync_version + 1
    where id = v_lead_id;
    perform public.enqueue_ad_lead_slack_sync(v_lead_id, (select sync_version from public.ad_leads where id = v_lead_id));
  end if;
end;
$$;

revoke all on function public.enqueue_ad_lead_slack_sync(uuid, bigint) from public, anon, authenticated;
revoke all on function public.set_ad_lead_canonical_updated_at() from public, anon, authenticated;
revoke all on function public.claim_ad_lead_slack_outbox(integer, text) from public, anon, authenticated;
revoke all on function public.claim_ad_lead_slack_outbox_for_lead(uuid, text) from public, anon, authenticated;
revoke all on function public.mark_ad_lead_slack_synced(uuid, uuid, text, bigint, text) from public, anon, authenticated;
revoke all on function public.fail_ad_lead_slack_outbox(uuid, text, text, timestamptz, text, text) from public, anon, authenticated;
revoke all on function public.requeue_ad_lead_slack_outbox(uuid) from public, anon, authenticated;
revoke all on function public.acquire_ad_lead_sync_lease(text, text, integer) from public, anon, authenticated;
revoke all on function public.release_ad_lead_sync_lease(text, text) from public, anon, authenticated;
revoke all on function public.import_ad_lead_submission(text, text, text, text, text, integer, text, text, text, timestamptz, text, jsonb) from public, anon, authenticated;
revoke all on function public.update_ad_lead_tracking(text, text, text) from public, anon, authenticated;
revoke all on function public.book_ad_lead_appointment(text, text, date, text) from public, anon, authenticated;
grant execute on function public.enqueue_ad_lead_slack_sync(uuid, bigint) to service_role;
grant execute on function public.claim_ad_lead_slack_outbox(integer, text) to service_role;
grant execute on function public.claim_ad_lead_slack_outbox_for_lead(uuid, text) to service_role;
grant execute on function public.mark_ad_lead_slack_synced(uuid, uuid, text, bigint, text) to service_role;
grant execute on function public.fail_ad_lead_slack_outbox(uuid, text, text, timestamptz, text, text) to service_role;
grant execute on function public.requeue_ad_lead_slack_outbox(uuid) to service_role;
grant execute on function public.acquire_ad_lead_sync_lease(text, text, integer) to service_role;
grant execute on function public.release_ad_lead_sync_lease(text, text) to service_role;
grant execute on function public.import_ad_lead_submission(text, text, text, text, text, integer, text, text, text, timestamptz, text, jsonb) to service_role;
grant execute on function public.update_ad_lead_tracking(text, text, text) to service_role;
grant execute on function public.book_ad_lead_appointment(text, text, date, text) to service_role;

select pg_notify('pgrst', 'reload schema');
