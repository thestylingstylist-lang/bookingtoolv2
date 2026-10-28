-- Marvberry partner (affiliate) program, built in-house.
-- Partners share marvberry.com/r/CODE. Agents who sign up through it are credited to the partner,
-- and every time that agent pays, the partner earns a commission (30% for the first 12 payments).
-- Payouts are made by hand once a month; "paid_at" records it.

create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  kind text not null default 'influencer',   -- influencer | coach
  audience text,                              -- where they'd share it (link, group, brokerage)
  pitch text,                                 -- how they'd share it, in their words
  status text not null default 'pending',     -- pending | active | declined
  code text unique,                           -- their link: marvberry.com/r/CODE
  dashboard_token uuid not null default gen_random_uuid() unique, -- their private stats page
  commission_pct int not null default 30,
  commission_months int not null default 12,
  trial_days int,                             -- coaches: longer free trial for their people (e.g. 30)
  payout_method text,                         -- e.g. "PayPal: name@email.com"
  approved_at timestamptz
);

create table if not exists public.partner_clicks (
  id bigint generated always as identity primary key,
  partner_id uuid not null references public.partners(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists partner_clicks_partner_idx on public.partner_clicks (partner_id, created_at);

create table if not exists public.partner_commissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  stripe_invoice_id text not null unique,     -- one commission per payment, never twice
  amount_cents int not null,                  -- what the agent paid
  commission_cents int not null,              -- what the partner earned
  paid_at timestamptz                         -- when Marvberry paid the partner
);
create index if not exists partner_commissions_partner_idx on public.partner_commissions (partner_id, paid_at);

alter table public.agents add column if not exists referred_by uuid references public.partners(id) on delete set null;
alter table public.agents add column if not exists referred_at timestamptz;

-- Internal tables: no public access. Service role (admin client) only.
alter table public.partners enable row level security;
alter table public.partner_clicks enable row level security;
alter table public.partner_commissions enable row level security;
