-- Every message Marvberry writes for an agent, so each agent can have a
-- monthly limit (300). Agents can see and add their own rows only.
create table if not exists public.ai_drafts (
  id         uuid primary key default gen_random_uuid(),
  agent_id   uuid not null references public.agents(id) on delete cascade,
  created_at timestamptz not null default now(),
  kind       text not null default 'reminder'
);
create index if not exists ai_drafts_agent_month_idx on public.ai_drafts (agent_id, created_at);
alter table public.ai_drafts enable row level security;
drop policy if exists "own ai drafts read" on public.ai_drafts;
create policy "own ai drafts read" on public.ai_drafts for select to authenticated using (agent_id = auth.uid());
drop policy if exists "own ai drafts add" on public.ai_drafts;
create policy "own ai drafts add" on public.ai_drafts for insert to authenticated with check (agent_id = auth.uid());
