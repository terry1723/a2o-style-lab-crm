create table if not exists public.products (
  id text primary key,
  title text not null,
  image_url text,
  gallery_images text[] default '{}',
  category text,
  subcategory text,
  style text,
  profile_tags text[] default '{}',
  badge text,
  recommendation text,
  price text,
  available_colors text[] default '{}',
  available_sizes text[] default '{}',
  material text,
  fit_notes text,
  product_details text,
  status text not null default 'active',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;

create policy "Public can read active products"
on public.products for select
to anon, authenticated
using (status = 'active');

-- Add your own authenticated admin policies for insert/update/delete.
