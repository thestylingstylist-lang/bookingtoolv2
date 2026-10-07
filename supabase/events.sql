-- Calendar events the realtor adds by hand: showings, closings, open houses.
-- Consultations are not here; they come from the bookings table.
create table if not exists public.events (
  id         uuid primary key default gen_random_uuid(),
  agent_id   uuid not null references public.agents(id) on delete cascade,
  client_id  uuid references public.clients(id) on delete set null,
  created_at timestamptz not null default now(),
  kind       text not null check (kind in ('showing','closing','open_house')),
  place      text not null default '',
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  check (ends_at > starts_at)
);
create index if not exists events_agent_start_idx on public.events(agent_id, starts_at);

alter table public.events enable row level security;
drop policy if exists "agent owns events" on public.events;
create policy "agent owns events" on public.events for all
  to authenticated using (agent_id = auth.uid()) with check (agent_id = auth.uid());
