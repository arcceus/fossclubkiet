-- ============================================================================
-- FOSS Club KIET — Supabase CMS Schema
-- Paste and run this once inside your Supabase SQL Editor.
-- ============================================================================

create table if not exists public.fossc_site_content (
  id text primary key default 'primary',
  content jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text
);

-- Optional audit/history table so every save in /admin keeps a backup snapshot
create table if not exists public.fossc_site_content_history (
  id bigint generated always as identity primary key,
  content jsonb not null,
  saved_at timestamptz not null default now(),
  saved_by text
);

-- Enable RLS
alter table public.fossc_site_content enable row level security;
alter table public.fossc_site_content_history enable row level security;

-- Public read access for site content
drop policy if exists "Allow public read access to fossc_site_content" on public.fossc_site_content;
create policy "Allow public read access to fossc_site_content"
  on public.fossc_site_content
  for select
  using (true);

-- If using SUPABASE_ANON_KEY from the Next.js API route (server-authenticated via admin cookie),
-- allow upsert/insert or use SUPABASE_SERVICE_ROLE_KEY which bypasses RLS automatically.
drop policy if exists "Allow server write access to fossc_site_content" on public.fossc_site_content;
create policy "Allow server write access to fossc_site_content"
  on public.fossc_site_content
  for all
  using (true)
  with check (true);

drop policy if exists "Allow server insert to fossc_site_content_history" on public.fossc_site_content_history;
create policy "Allow server insert to fossc_site_content_history"
  on public.fossc_site_content_history
  for all
  using (true)
  with check (true);
