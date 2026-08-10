-- Harden the Google Apps Script -> Supabase -> Slack worker boundary.
-- This migration is additive and preserves legacy CRM data and appointment
-- behavior.

create table if not exists public.ad_lead_sync_requests (
  request_id text primary key,
  trigger text not null check (trigger in ('form_submit', 'five_minute', 'manual_reconcile')),
  row_count integer not null default 0 check (row_count >= 0),
  received_at timestamptz not null default now(),
  completed_at timestamptz,
  response jsonb
);

alter table public.ad_lead_sync_requests enable row level security;
revoke all on public.ad_lead_sync_requests from anon, authenticated;
grant select, insert, update, delete on public.ad_lead_sync_requests to service_role;

create index if not exists ad_lead_sync_requests_received_at_idx
  on public.ad_lead_sync_requests (received_at desc);

-- Keep the existing RPC's legacy security semantics while constraining its
-- lookup path. It writes legacy tables and the canonical projection together.
alter function public.book_ad_lead_appointment(text, text, date, text) security definer;
alter function public.book_ad_lead_appointment(text, text, date, text) set search_path = public;
revoke all on function public.book_ad_lead_appointment(text, text, date, text) from public, anon, authenticated;
grant execute on function public.book_ad_lead_appointment(text, text, date, text) to service_role;

-- Existing appointment rows are intentionally preserved. Appointment
-- reconciliation is deferred to an explicit, separately reviewed data
-- migration so this hardening migration cannot delete CRM history.
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
  select lead_id into v_lead_id
  from public.ad_lead_submissions
  where source_key = p_source_key
  order by submitted_at desc
  limit 1;

  insert into public.ad_lead_tracking (source_key, status, owner)
  values (p_source_key, '已預約', p_owner)
  on conflict (source_key) do update
  set status = excluded.status, owner = excluded.owner;

  insert into public.ad_lead_appointments (source_key, appointment_date, appointment_time)
  values (p_source_key, p_appointment_date, p_appointment_time)
  on conflict (source_key) do update
  set appointment_date = excluded.appointment_date,
      appointment_time = excluded.appointment_time;

  if v_lead_id is not null then
    v_appointment_at := (p_appointment_date::text || ' ' || p_appointment_time)::timestamp at time zone 'Asia/Hong_Kong';
    update public.ad_leads
    set current_status = '已預約', owner = p_owner,
        appointment_at = v_appointment_at, sync_version = sync_version + 1
    where id = v_lead_id;
    perform public.enqueue_ad_lead_slack_sync(v_lead_id, (select sync_version from public.ad_leads where id = v_lead_id));
  end if;
end;
$$;

revoke all on function public.book_ad_lead_appointment(text, text, date, text) from public, anon, authenticated;
grant execute on function public.book_ad_lead_appointment(text, text, date, text) to service_role;

-- Completion must identify the claimed target as well as the worker. A worker
-- whose lease was reclaimed cannot complete or fail the newer worker's row.
drop function if exists public.mark_ad_lead_slack_synced(uuid, uuid, text, bigint, text);
create or replace function public.mark_ad_lead_slack_synced(
  p_outbox_id uuid,
  p_lead_id uuid,
  p_worker_id text,
  p_target_version bigint,
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
    and locked_by = p_worker_id
    and target_version >= p_target_version;

  if not found then
    raise exception 'stale_outbox_lease';
  end if;

  update public.ad_leads
  set slack_list_item_id = p_slack_list_item_id,
      slack_last_synced_version = p_synced_version,
      slack_last_synced_at = now()
  where id = p_lead_id;

  if v_current_version > p_synced_version then
    perform public.enqueue_ad_lead_slack_sync(p_lead_id, v_current_version);
  end if;
end;
$$;

drop function if exists public.fail_ad_lead_slack_outbox(uuid, text, text, timestamptz, text, text);
create or replace function public.fail_ad_lead_slack_outbox(
  p_outbox_id uuid,
  p_worker_id text,
  p_target_version bigint,
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
    and locked_by = p_worker_id
    and target_version >= p_target_version;

  if not found then
    raise exception 'stale_outbox_lease';
  end if;
end;
$$;

revoke all on function public.mark_ad_lead_slack_synced(uuid, uuid, text, bigint, bigint, text) from public, anon, authenticated;
revoke all on function public.fail_ad_lead_slack_outbox(uuid, text, bigint, text, timestamptz, text, text) from public, anon, authenticated;
grant execute on function public.mark_ad_lead_slack_synced(uuid, uuid, text, bigint, bigint, text) to service_role;
grant execute on function public.fail_ad_lead_slack_outbox(uuid, text, bigint, text, timestamptz, text, text) to service_role;

select pg_notify('pgrst', 'reload schema');
