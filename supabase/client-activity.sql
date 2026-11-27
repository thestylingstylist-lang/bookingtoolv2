-- Client activity: what a client did on their own page, so the agent never misses it.
-- A note on a home, an offer request, showing times, a document, a booked time. Views don't count.
-- Safe to run twice.

create table if not exists public.client_activity (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  home_id uuid references public.homes(id) on delete set null,
  kind text not null check (kind in ('note', 'offer', 'times', 'upload', 'booking')),
  line text not null,   -- the short line: "Kelly left a note on 15 East 96th Street"
  detail text,          -- in full: the note itself, the times she picked
  created_at timestamptz not null default now(),
  seen_at timestamptz   -- set when the agent opens the client's jacket
);
alter table public.client_activity enable row level security;
drop policy if exists "own client activity" on public.client_activity;
create policy "own client activity" on public.client_activity
  for all using (agent_id = auth.uid()) with check (agent_id = auth.uid());
create index if not exists client_activity_unseen on public.client_activity (agent_id) where seen_at is null;
create index if not exists client_activity_client on public.client_activity (client_id, created_at desc);

-- "Keep for follow-up": the jacket stays at the top until she marks it done.
alter table public.clients add column if not exists follow_up_at timestamptz;
