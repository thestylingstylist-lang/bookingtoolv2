-- Redo a step or a document. Safe to run twice.

-- A step the agent reopened: it stays open until the thing happens again.
alter table public.steps add column if not exists reopened_at timestamptz;

-- A signed document that's been redone: kept in the file, marked Replaced.
alter table public.documents add column if not exists replaced_at timestamptz;

-- A document the agent asked for at a particular step.
alter table public.collected_docs add column if not exists step_id uuid references public.steps(id) on delete set null;
