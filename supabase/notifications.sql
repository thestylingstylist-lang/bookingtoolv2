-- Browser notifications for agents. Safe to run twice.

-- One row per browser or phone an agent turned notifications on in.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
drop policy if exists "own push subscriptions" on public.push_subscriptions;
create policy "own push subscriptions" on public.push_subscriptions
  for all using (agent_id = auth.uid()) with check (agent_id = auth.uid());

-- Her switches, and whether she's been asked.
alter table public.agents add column if not exists notify_messages boolean not null default true;
alter table public.agents add column if not exists notify_signed boolean not null default true;
alter table public.agents add column if not exists notify_bookings boolean not null default true;
alter table public.agents add column if not exists notify_support boolean not null default true;
alter table public.agents add column if not exists notify_hours_only boolean not null default false;
alter table public.agents add column if not exists notify_prompt text; -- null, 'on' or 'declined'

-- Notifications held until her day starts. Sent as one morning note.
create table if not exists public.notification_queue (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  line text not null,
  url text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
alter table public.notification_queue enable row level security;
create index if not exists notification_queue_waiting on public.notification_queue (agent_id) where sent_at is null;

-- Safety net: one email when a client message sits unread for a day.
alter table public.messages add column if not exists unread_emailed_at timestamptz;
