-- =====================================================================
-- Booking + Workflow Platform — v2 schema (MULTI-AGENT)
--
-- Run this ONCE, in a BRAND-NEW Supabase project's SQL Editor.
-- Do NOT run it against the project powering your live phase-1 site —
-- it will rebuild the bookings table and break that site.
--
-- What this sets up:
--   agents             one row per realtor (their business + hours config)
--   clients            one row per client, each owned by one agent
--   bookings           consultation bookings, owned by an agent
--   document_templates the agent's reusable, editable templates
--   documents          contracts/disclosures sent for signature
--   steps              the shared checklist the client ticks off
--
-- Every table is locked with Row Level Security so an agent only ever
-- sees their own data and a client only ever sees their own.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- AGENTS  — keyed to the realtor's Supabase login account.
-- Holds the settings that used to be hardcoded (hours, timezone, etc).
-- `slug` is their personal booking link:  /book/<slug>
-- ---------------------------------------------------------------------
create table if not exists public.agents (
  id            uuid primary key references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now(),
  business_name text not null default '',
  full_name     text not null default '',
  slug          text not null unique,
  timezone      text not null default 'America/New_York',
  weekdays      int[] not null default '{1,2,3,4,5}',  -- 0=Sun .. 6=Sat
  day_start     int  not null default 9,                -- local hour, 24h
  day_end       int  not null default 17,
  slot_minutes  int  not null default 30,
  days_ahead    int  not null default 14
);

-- ---------------------------------------------------------------------
-- CLIENTS  — also a Supabase login account (they sign in to the portal).
-- Every client belongs to exactly one agent.
-- ---------------------------------------------------------------------
create table if not exists public.clients (
  id          uuid primary key references auth.users(id) on delete cascade,
  agent_id    uuid not null references public.agents(id) on delete cascade,
  created_at  timestamptz not null default now(),
  first_name  text not null default '',
  last_name   text not null default '',
  email       text,
  phone       text
);
create index if not exists clients_agent_idx on public.clients(agent_id);

-- ---------------------------------------------------------------------
-- BOOKINGS  — the public booking page writes here via the service-role
-- key (no client login needed). Linked to a client row once they have
-- an account. Both phone and email are required.
-- ---------------------------------------------------------------------
create table if not exists public.bookings (
  id           uuid primary key default gen_random_uuid(),
  agent_id     uuid not null references public.agents(id) on delete cascade,
  client_id    uuid references public.clients(id) on delete set null,
  created_at   timestamptz not null default now(),
  first_name   text not null,
  last_name    text not null,
  email        text not null,
  phone        text not null,
  meeting_type text not null check (meeting_type in ('virtual','phone')),
  slot_start   timestamptz not null
);
-- one booking per slot, per agent
create unique index if not exists bookings_agent_slot_key
  on public.bookings(agent_id, slot_start);
create index if not exists bookings_agent_idx on public.bookings(agent_id);

-- ---------------------------------------------------------------------
-- DOCUMENT TEMPLATES  — the agent's reusable, customizable templates
-- (e.g. the agency agreement). `body` is text with {{placeholders}}.
-- ---------------------------------------------------------------------
create table if not exists public.document_templates (
  id         uuid primary key default gen_random_uuid(),
  agent_id   uuid not null references public.agents(id) on delete cascade,
  created_at timestamptz not null default now(),
  title      text not null,
  body       text not null default ''
);
create index if not exists doc_templates_agent_idx
  on public.document_templates(agent_id);

-- ---------------------------------------------------------------------
-- DOCUMENTS  — one per document sent to a client for signature.
--   kind:   'agreement' (built from a template) | 'disclosure' (uploaded)
--   status: draft -> sent -> signed
-- Simple typed-name e-signature is captured on the row.
-- `sign_token` backs the unguessable emailed signing link.
-- ---------------------------------------------------------------------
create table if not exists public.documents (
  id           uuid primary key default gen_random_uuid(),
  agent_id     uuid not null references public.agents(id) on delete cascade,
  client_id    uuid not null references public.clients(id) on delete cascade,
  created_at   timestamptz not null default now(),
  kind         text not null check (kind in ('agreement','disclosure')),
  title        text not null,
  body         text,          -- filled agreement text  (agreement kind)
  file_path    text,          -- storage path to upload (disclosure kind)
  status       text not null default 'draft'
                 check (status in ('draft','sent','signed')),
  signer_name  text,          -- typed signature
  signed_at    timestamptz,
  signed_ip    text,
  sign_token   uuid not null default gen_random_uuid()
);
create index if not exists documents_agent_idx  on public.documents(agent_id);
create index if not exists documents_client_idx on public.documents(client_id);
create unique index if not exists documents_sign_token_key
  on public.documents(sign_token);

-- ---------------------------------------------------------------------
-- STEPS  — the shared checklist. The agent assigns steps; the client
-- checks them off. `position` orders them.
-- ---------------------------------------------------------------------
create table if not exists public.steps (
  id          uuid primary key default gen_random_uuid(),
  agent_id    uuid not null references public.agents(id) on delete cascade,
  client_id   uuid not null references public.clients(id) on delete cascade,
  created_at  timestamptz not null default now(),
  title       text not null,
  detail      text,
  position    int not null default 0,
  done        boolean not null default false,
  done_at     timestamptz
);
create index if not exists steps_client_idx on public.steps(client_id);

-- =====================================================================
-- ROW LEVEL SECURITY
-- Agents see only their own data; clients see only theirs.
-- The public booking flow writes via the service-role key, which
-- bypasses every policy below.
-- =====================================================================
alter table public.agents             enable row level security;
alter table public.clients            enable row level security;
alter table public.bookings           enable row level security;
alter table public.document_templates enable row level security;
alter table public.documents          enable row level security;
alter table public.steps              enable row level security;

-- AGENTS: an agent reads and updates only their own profile row.
drop policy if exists "agent self read"   on public.agents;
drop policy if exists "agent self update" on public.agents;
create policy "agent self read"   on public.agents for select
  to authenticated using (id = auth.uid());
create policy "agent self update" on public.agents for update
  to authenticated using (id = auth.uid());

-- CLIENTS: agent manages their own clients; client reads own row.
drop policy if exists "agent manages clients" on public.clients;
drop policy if exists "client self read"      on public.clients;
create policy "agent manages clients" on public.clients for all
  to authenticated using (agent_id = auth.uid()) with check (agent_id = auth.uid());
create policy "client self read" on public.clients for select
  to authenticated using (id = auth.uid());

-- BOOKINGS: agent reads their own; inserts arrive via service role.
drop policy if exists "agent reads bookings" on public.bookings;
create policy "agent reads bookings" on public.bookings for select
  to authenticated using (agent_id = auth.uid());

-- TEMPLATES: agent has full control of their own.
drop policy if exists "agent owns templates" on public.document_templates;
create policy "agent owns templates" on public.document_templates for all
  to authenticated using (agent_id = auth.uid()) with check (agent_id = auth.uid());

-- DOCUMENTS: agent full control; client reads their own.
drop policy if exists "agent owns documents"  on public.documents;
drop policy if exists "client reads documents" on public.documents;
create policy "agent owns documents" on public.documents for all
  to authenticated using (agent_id = auth.uid()) with check (agent_id = auth.uid());
create policy "client reads documents" on public.documents for select
  to authenticated using (client_id = auth.uid());

-- STEPS: agent full control; client reads own and can check them off.
drop policy if exists "agent owns steps"    on public.steps;
drop policy if exists "client reads steps"  on public.steps;
drop policy if exists "client checks steps" on public.steps;
create policy "agent owns steps" on public.steps for all
  to authenticated using (agent_id = auth.uid()) with check (agent_id = auth.uid());
create policy "client reads steps" on public.steps for select
  to authenticated using (client_id = auth.uid());
create policy "client checks steps" on public.steps for update
  to authenticated using (client_id = auth.uid()) with check (client_id = auth.uid());
