-- Team-only settings (e.g. quarterly revenue goals). Only the service role touches it.
create table if not exists public.admin_settings (
  key        text primary key,
  value      numeric,
  updated_at timestamptz not null default now()
);
alter table public.admin_settings enable row level security;
