-- Old booking links that forward to an agent's current link.
create table if not exists public.slug_redirects (
  old_slug   text primary key,
  agent_id   uuid not null references public.agents(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.slug_redirects enable row level security;
