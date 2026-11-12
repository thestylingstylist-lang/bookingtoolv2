-- The Marvberry Card: what visitors do on an agent's card, and the people who
-- asked to be contacted. Visitors write through the server (admin client); the
-- agent reads and updates only their own rows.
create table if not exists public.card_events (
  id          bigserial primary key,
  agent_id    uuid not null references public.agents(id) on delete cascade,
  kind        text not null check (kind in ('view','save','share','book','request')),
  created_at  timestamptz not null default now()
);
create index if not exists card_events_agent_idx on public.card_events(agent_id, created_at desc);
alter table public.card_events enable row level security;
drop policy if exists "own card events" on public.card_events;
create policy "own card events" on public.card_events for select using (agent_id = auth.uid());

create table if not exists public.card_requests (
  id          uuid primary key default gen_random_uuid(),
  agent_id    uuid not null references public.agents(id) on delete cascade,
  created_at  timestamptz not null default now(),
  name        text not null,
  email       text,
  phone       text,
  message     text,
  wants_guide boolean not null default false,
  replied_at  timestamptz,
  client_id   uuid references public.clients(id) on delete set null
);
create index if not exists card_requests_agent_idx on public.card_requests(agent_id, created_at desc);
alter table public.card_requests enable row level security;
drop policy if exists "own card requests" on public.card_requests;
create policy "own card requests" on public.card_requests
  for all using (agent_id = auth.uid()) with check (agent_id = auth.uid());

-- The agent's free guide: a title and a link to the file.
alter table public.agents add column if not exists guide_title text;
alter table public.agents add column if not exists guide_url text;
