-- Marvberry Assistant.
-- Who has it on their plan lives in its own table. Realtors can read their own
-- row but never write it, so only the team (admin page) can turn it on.
create table if not exists public.assistant_plans (
  agent_id   uuid primary key references public.agents(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.assistant_plans enable row level security;
drop policy if exists "read own assistant plan" on public.assistant_plans;
create policy "read own assistant plan" on public.assistant_plans
  for select using (agent_id = auth.uid());

-- The realtor's own choices.
-- assistant_auto: false = she approves every message first (the default).
-- assistant_voice: a few messages she's written, so drafts sound like her.
alter table public.agents add column if not exists assistant_auto boolean not null default false;
alter table public.agents add column if not exists assistant_voice text not null default '';
