-- Due dates on checklist steps. A plain calendar date (no time), set by the
-- realtor when she asks "when do you want this by?". Clients see their own.
alter table public.steps add column if not exists due_on date;
