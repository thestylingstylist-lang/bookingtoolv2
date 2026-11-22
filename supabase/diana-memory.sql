-- Diana's conversations and memory. Private to each agent. Safe to run twice.

-- After each conversation: keep it (History) or clear it.
alter table public.agents add column if not exists assistant_keep boolean not null default true;

-- Conversations with Diana. "open" is the one in progress; "kept" ones show in History for 90 days.
create table if not exists public.assistant_conversations (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  title text not null default '',
  lines jsonb not null default '[]'::jsonb,
  status text not null default 'open' check (status in ('open','kept')),
  started_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  ended_at timestamptz
);
create index if not exists assistant_conversations_agent on public.assistant_conversations (agent_id, status, last_at desc);
alter table public.assistant_conversations enable row level security;
drop policy if exists "own conversations" on public.assistant_conversations;
create policy "own conversations" on public.assistant_conversations
  for all using (agent_id = auth.uid()) with check (agent_id = auth.uid());

-- Short notes Diana keeps: about the agent, or about one of the agent's own clients.
create table if not exists public.assistant_memories (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists assistant_memories_agent on public.assistant_memories (agent_id, created_at);
alter table public.assistant_memories enable row level security;
drop policy if exists "own memories" on public.assistant_memories;
create policy "own memories" on public.assistant_memories
  for all using (agent_id = auth.uid()) with check (agent_id = auth.uid());
