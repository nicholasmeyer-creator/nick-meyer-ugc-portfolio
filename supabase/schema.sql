create extension if not exists "pgcrypto";

create table if not exists public.portfolio_work (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  type text not null check (type in ('photo', 'video')),
  brand text not null,
  title text not null,
  brief text,
  file_path text not null,
  file_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.portfolio_work enable row level security;

create table if not exists public.portfolio_rates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  label text not null,
  title text not null,
  price text,
  description text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.portfolio_rates enable row level security;

create table if not exists public.portfolio_settings (
  id text primary key default 'site',
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  logo_text text,
  logo_path text,
  logo_url text,
  favicon_path text,
  favicon_url text,
  instagram_handle text,
  tiktok_handle text,
  updated_at timestamptz not null default now(),
  constraint portfolio_settings_singleton check (id = 'site')
);

alter table public.portfolio_settings
add column if not exists logo_text text;

alter table public.portfolio_settings
add column if not exists logo_path text;

alter table public.portfolio_settings
add column if not exists logo_url text;

alter table public.portfolio_settings
add column if not exists favicon_path text;

alter table public.portfolio_settings
add column if not exists favicon_url text;

alter table public.portfolio_settings
add column if not exists instagram_handle text;

alter table public.portfolio_settings
add column if not exists tiktok_handle text;

alter table public.portfolio_settings enable row level security;

drop policy if exists "Portfolio work is publicly readable" on public.portfolio_work;
create policy "Portfolio work is publicly readable"
on public.portfolio_work
for select
using (true);

drop policy if exists "Authenticated users can add own portfolio work" on public.portfolio_work;
create policy "Authenticated users can add own portfolio work"
on public.portfolio_work
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Authenticated users can update own portfolio work" on public.portfolio_work;
create policy "Authenticated users can update own portfolio work"
on public.portfolio_work
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Authenticated users can delete own portfolio work" on public.portfolio_work;
create policy "Authenticated users can delete own portfolio work"
on public.portfolio_work
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Portfolio rates are publicly readable" on public.portfolio_rates;
create policy "Portfolio rates are publicly readable"
on public.portfolio_rates
for select
using (true);

drop policy if exists "Authenticated users can add own portfolio rates" on public.portfolio_rates;
create policy "Authenticated users can add own portfolio rates"
on public.portfolio_rates
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Authenticated users can update own portfolio rates" on public.portfolio_rates;
create policy "Authenticated users can update own portfolio rates"
on public.portfolio_rates
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Authenticated users can delete own portfolio rates" on public.portfolio_rates;
create policy "Authenticated users can delete own portfolio rates"
on public.portfolio_rates
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Portfolio settings are publicly readable" on public.portfolio_settings;
create policy "Portfolio settings are publicly readable"
on public.portfolio_settings
for select
using (true);

drop policy if exists "Authenticated users can add own portfolio settings" on public.portfolio_settings;
create policy "Authenticated users can add own portfolio settings"
on public.portfolio_settings
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Authenticated users can update own portfolio settings" on public.portfolio_settings;
create policy "Authenticated users can update own portfolio settings"
on public.portfolio_settings
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public)
values ('ugc-media', 'ugc-media', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can read UGC media" on storage.objects;
create policy "Public can read UGC media"
on storage.objects
for select
using (bucket_id = 'ugc-media');

drop policy if exists "Authenticated users can upload UGC media" on storage.objects;
create policy "Authenticated users can upload UGC media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'ugc-media'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Authenticated users can update own UGC media" on storage.objects;
create policy "Authenticated users can update own UGC media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'ugc-media'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'ugc-media'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Authenticated users can delete own UGC media" on storage.objects;
create policy "Authenticated users can delete own UGC media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'ugc-media'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
