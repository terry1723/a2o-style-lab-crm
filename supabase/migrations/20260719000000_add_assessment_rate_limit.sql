-- Isolated abuse protection for the public assessment endpoints.
-- Stores only keyed address hashes; no CRM or assessment lead data is read or written.

create table if not exists public.assessment_rate_limits (
  key_hash text primary key check (key_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null default now(),
  request_count integer not null default 1 check (request_count > 0),
  updated_at timestamptz not null default now()
);

alter table public.assessment_rate_limits enable row level security;
revoke all on public.assessment_rate_limits from anon, authenticated;

create or replace function public.check_assessment_rate_limit(
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed boolean;
begin
  if p_key_hash !~ '^[0-9a-f]{64}$'
    or p_limit < 1
    or p_limit > 1000
    or p_window_seconds < 1
    or p_window_seconds > 86400 then
    return false;
  end if;

  insert into public.assessment_rate_limits as limits (
    key_hash,
    window_started_at,
    request_count,
    updated_at
  ) values (
    p_key_hash,
    now(),
    1,
    now()
  )
  on conflict (key_hash) do update
  set
    window_started_at = case
      when limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
        then now()
      else limits.window_started_at
    end,
    request_count = case
      when limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
        then 1
      else least(limits.request_count + 1, p_limit + 1)
    end,
    updated_at = now()
  returning request_count <= p_limit into allowed;

  delete from public.assessment_rate_limits
  where updated_at < now() - interval '1 day';

  return allowed;
end;
$$;

revoke all on function public.check_assessment_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_assessment_rate_limit(text, integer, integer) to service_role;

comment on table public.assessment_rate_limits is
  'Short-lived keyed address hashes used only to rate-limit public assessment endpoints.';
