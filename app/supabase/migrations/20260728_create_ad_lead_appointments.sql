create table public.ad_lead_appointments (
  source_key text primary key references public.ad_lead_tracking(source_key) on delete cascade,
  appointment_date date not null,
  appointment_time text not null check (appointment_time in ('12:00', '13:30', '15:00', '16:30', '18:00', '19:30', '21:00')),
  updated_at timestamptz not null default now(),
  unique (appointment_date, appointment_time)
);

alter table public.ad_lead_appointments enable row level security;

create trigger ad_lead_appointments_updated_at
before update on public.ad_lead_appointments
for each row execute function public.set_ad_lead_tracking_updated_at();

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
begin
  insert into public.ad_lead_tracking (source_key, status, owner)
  values (p_source_key, '已預約', p_owner)
  on conflict (source_key) do update
  set status = excluded.status,
      owner = excluded.owner;

  insert into public.ad_lead_appointments (source_key, appointment_date, appointment_time)
  values (p_source_key, p_appointment_date, p_appointment_time)
  on conflict (source_key) do update
  set appointment_date = excluded.appointment_date,
      appointment_time = excluded.appointment_time;
end;
$$;

revoke all on function public.book_ad_lead_appointment(text, text, date, text) from public;
grant execute on function public.book_ad_lead_appointment(text, text, date, text) to service_role;
