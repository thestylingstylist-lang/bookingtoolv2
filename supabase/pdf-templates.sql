-- PDF templates: the agent's own form (an offer letter, say), with the blanks
-- placed on top of it. Marvberry writes into those spots, so the document keeps
-- the brokerage's real look.
create table if not exists public.pdf_templates (
  id          uuid primary key default gen_random_uuid(),
  agent_id    uuid not null references public.agents(id) on delete cascade,
  created_at  timestamptz not null default now(),
  title       text not null,
  kind        text not null default 'offer' check (kind in ('offer')),
  file_path   text not null,            -- in the private client-docs bucket
  fields      jsonb not null default '[]'::jsonb
  -- each field: { id, key, label, page, x, y, w, h, size, cover }
  -- x, y, w, h are fractions of the page (0–1), measured from the top left.
);
create index if not exists pdf_templates_agent_idx on public.pdf_templates(agent_id);
alter table public.pdf_templates enable row level security;
drop policy if exists "own pdf templates" on public.pdf_templates;
create policy "own pdf templates" on public.pdf_templates
  for all using (agent_id = auth.uid()) with check (agent_id = auth.uid());
