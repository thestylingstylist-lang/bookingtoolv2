-- Support inbox: a simple two-way thread per agent.
create table if not exists public.support_messages (
  id          uuid primary key default gen_random_uuid(),
  agent_id    uuid references auth.users(id) on delete cascade,
  agent_email text,
  agent_name  text,
  body        text not null,
  from_team   boolean not null default false,  -- false = from agent, true = your reply
  read_by_team    boolean not null default false,
  read_by_agent   boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists support_messages_agent_idx on public.support_messages (agent_id, created_at);
alter table public.support_messages enable row level security;
-- Agents read/insert only their own; the admin/service client handles replies + the inbox.
create policy support_own_select on public.support_messages
  for select using (auth.uid() = agent_id);
create policy support_own_insert on public.support_messages
  for insert with check (auth.uid() = agent_id and from_team = false);
