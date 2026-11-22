-- Diana arranges meetings. Safe to run twice.

-- Meetings go on the calendar alongside showings, closings, open houses and held time.
alter table public.events drop constraint if exists events_kind_check;
alter table public.events add constraint events_kind_check
  check (kind in ('showing','closing','open_house','hold','meeting'));

-- One invitation to a client, with the times on offer.
create table if not exists public.meeting_invites (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  token text not null unique,
  kind text not null check (kind in ('phone','in_person','video')),
  place text not null default '',
  minutes int not null default 30,
  message text not null default '',
  status text not null default 'waiting' check (status in ('waiting','booked','expired','cancelled')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  event_id uuid references public.events(id) on delete set null,
  closed_at timestamptz
);
create index if not exists meeting_invites_agent on public.meeting_invites (agent_id, status);
alter table public.meeting_invites enable row level security;
drop policy if exists "own meeting invites" on public.meeting_invites;
create policy "own meeting invites" on public.meeting_invites for select using (agent_id = auth.uid());

-- Each offered time. While the invitation waits, it's held on the agent's calendar.
create table if not exists public.meeting_options (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references public.meeting_invites(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  released_at timestamptz,
  chosen boolean not null default false
);
create index if not exists meeting_options_held on public.meeting_options (agent_id, starts_at) where released_at is null;
alter table public.meeting_options enable row level security;
drop policy if exists "own meeting options" on public.meeting_options;
create policy "own meeting options" on public.meeting_options for select using (agent_id = auth.uid());

-- The invitation shows in the client's suite chat.
alter table public.messages add column if not exists invite_id uuid references public.meeting_invites(id) on delete set null;

-- The agent's usual meeting lengths, in minutes.
alter table public.agents add column if not exists meeting_call_minutes int not null default 30;
alter table public.agents add column if not exists meeting_inperson_minutes int not null default 60;
