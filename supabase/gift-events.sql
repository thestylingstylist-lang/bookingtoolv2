-- What happens after a gift card link is sent: opened, from where, which
-- screens, started claiming, claimed. Team-only (service role).
create table if not exists public.gift_events (
  id         bigserial primary key,
  agent_id   uuid not null references public.agents(id) on delete cascade,
  created_at timestamptz not null default now(),
  kind       text not null,   -- open | screen | claim_start | claimed
  detail     text             -- open: short | qr | link; screen: which screen
);
create index if not exists gift_events_agent_idx on public.gift_events(agent_id, created_at desc);
alter table public.gift_events enable row level security;
