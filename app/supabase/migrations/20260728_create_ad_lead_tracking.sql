create table public.ad_lead_tracking (
  source_key text primary key,
  status text not null check (status in ('未聯絡', 'WhatsApp 跟進中', '已預約', '已拒絕')),
  owner text not null check (owner in ('Terry', 'Ryan', 'Martin', 'Caren', 'New')),
  updated_at timestamptz not null default now()
);

alter table public.ad_lead_tracking enable row level security;

create function public.set_ad_lead_tracking_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger ad_lead_tracking_updated_at
before update on public.ad_lead_tracking
for each row execute function public.set_ad_lead_tracking_updated_at();
