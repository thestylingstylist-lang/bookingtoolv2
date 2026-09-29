-- One row per visit to the marketing home page (marvberry.com).
-- Filled by /api/track; read in the admin dashboard. No personal data:
-- a random per-tab visit id, device type, where they came from, and how far they got.
create table if not exists public.site_visits (
  session_id       uuid primary key,
  path             text not null default '/',
  referrer         text,
  utm_source       text,
  device           text,                       -- mobile | tablet | desktop
  first_seen       timestamptz not null default now(),
  last_seen        timestamptz not null default now(),
  duration_ms      integer not null default 0, -- time with the tab actually visible
  max_scroll       smallint not null default 0, -- 0-100, deepest point reached
  furthest_section text,                       -- last section they reached before leaving
  section_ms       jsonb not null default '{}'::jsonb, -- time spent looking at each section
  signup_click     boolean not null default false
);

create index if not exists site_visits_first_seen_idx on public.site_visits (first_seen desc);

alter table public.site_visits enable row level security;
-- No policies: only the admin/service client can read or write.
