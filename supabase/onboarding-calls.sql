-- Follow-up calls the team books with a realtor from the Onboarding page.
-- The realtor gets an email when it's booked, one the day before, and one an hour before.
create table if not exists public.onboarding_calls (
  id             uuid primary key default gen_random_uuid(),
  agent_id       uuid not null references public.agents(id) on delete cascade,
  created_at     timestamptz not null default now(),
  call_at        timestamptz not null,
  how            text not null default 'video' check (how in ('video','phone')),
  note           text not null default '',
  owner          text not null default 'Alecia',
  day_sent_at    timestamptz,
  hour_email_id  text,
  cancelled_at   timestamptz
);
create index if not exists onboarding_calls_when_idx on public.onboarding_calls (call_at);
alter table public.onboarding_calls enable row level security;
