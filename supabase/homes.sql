-- Homes a buyer is looking at. One row per house, under the client.
-- A showing time also puts a showing on the realtor's calendar (events).
create table if not exists public.homes (
  id               uuid primary key default gen_random_uuid(),
  agent_id         uuid not null references public.agents(id) on delete cascade,
  client_id        uuid not null references public.clients(id) on delete cascade,
  created_at       timestamptz not null default now(),
  address          text not null,
  listing_url      text not null default '',
  agent_name       text not null default '',
  agent_brokerage  text not null default '',
  agent_email      text not null default '',
  agent_phone      text not null default '',
  showing_at       timestamptz,
  event_id         uuid references public.events(id) on delete set null,
  notes            text not null default '',
  status           text not null default 'active' check (status in ('active','passed'))
);
create index if not exists homes_client_idx on public.homes(client_id, created_at);

alter table public.homes enable row level security;
drop policy if exists "agent owns homes" on public.homes;
create policy "agent owns homes" on public.homes for all
  to authenticated using (agent_id = auth.uid()) with check (agent_id = auth.uid());
