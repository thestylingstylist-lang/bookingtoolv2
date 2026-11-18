-- Outbound pipeline: agents Alecia texts, from first message to paying member.
-- Separate from sales_leads (inbound book-a-call leads). Team-only: service role.
create table if not exists public.pipeline_leads (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  name            text not null,
  phone           text,
  brokerage       text,
  town            text,
  source          text,             -- zillow | instagram | linkedin | other
  kind            text not null default 'solo' check (kind in ('broker','solo')),
  hook            text,             -- the standout detail used in the message
  message         text,             -- the full first message sent
  notes           text,
  stage           text not null default 'texted'
                  check (stage in ('texted','replied','yes','claimed','active','paid','lost')),
  last_contact_at timestamptz not null default now(),
  next_follow_up  date,
  agent_id        uuid references public.agents(id) on delete set null, -- her card
  -- when each stage was first reached (kept after Lost, so the numbers stay honest)
  replied_at      timestamptz,
  yes_at          timestamptz,
  claimed_at      timestamptz,
  active_at       timestamptz,
  paid_at         timestamptz,
  lost_at         timestamptz
);
create index if not exists pipeline_leads_stage_idx on public.pipeline_leads(stage);
alter table public.pipeline_leads enable row level security;

create table if not exists public.pipeline_touches (
  id         bigserial primary key,
  lead_id    uuid not null references public.pipeline_leads(id) on delete cascade,
  created_at timestamptz not null default now(),
  note       text not null
);
create index if not exists pipeline_touches_lead_idx on public.pipeline_touches(lead_id, created_at desc);
alter table public.pipeline_touches enable row level security;
