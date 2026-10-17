-- Realtor onboarding, run by the Marvberry team.
-- One row per realtor being onboarded, plus the documents the team asks them for.
-- Internal: only the service-role (admin) client reads or writes these.

create table if not exists public.onboarding (
  agent_id        uuid primary key references public.agents(id) on delete cascade,
  created_at      timestamptz not null default now(),
  owner           text not null default 'Alecia',   -- who ran the setup call and stays with them
  setup_call_done boolean not null default false,
  setup_call_at   timestamptz,
  completed_at    timestamptz                        -- set when the team marks onboarding complete
);
alter table public.onboarding enable row level security;

create table if not exists public.onboarding_docs (
  id             uuid primary key default gen_random_uuid(),
  agent_id       uuid not null references public.agents(id) on delete cascade,
  created_at     timestamptz not null default now(),
  title          text not null,
  file_path      text,
  file_name      text,
  uploaded_at    timestamptz,
  template_built boolean not null default false
);
create index if not exists onboarding_docs_agent_idx on public.onboarding_docs (agent_id, created_at);
alter table public.onboarding_docs enable row level security;

-- Private bucket for the files realtors send in. Uploads use one-time signed
-- links made server-side; the team opens files through short-lived links.
insert into storage.buckets (id, name, public)
values ('onboarding-docs', 'onboarding-docs', false)
on conflict (id) do update set public = false;
