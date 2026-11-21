-- Client suites: buyer, seller, investor and private suites.
-- Run once in the Supabase SQL editor before this version goes live.
-- Safe to run twice.

-- 1. Client types: allows "investor". Drops any old check on the column;
--    the app only saves buyer, seller, investor or both.
alter table public.clients drop constraint if exists clients_client_type_check;

-- 2. Stages. Buying: preparing, showing, offer, contract, closing.
--    Selling: s_preparing, listing, open_house, offers, s_contract, s_closing.
alter table public.clients drop constraint if exists clients_phase_check;
alter table public.steps drop constraint if exists steps_phase_check;

-- Clients and steps saved before stages existed were in Showing. Keep them
-- there, so a blank stage can mean "new client, starting at Preparing".
update public.clients set phase = 'showing' where phase is null;
update public.steps set phase = 'showing' where phase is null;

-- The seller's stage, kept apart so buyer-and-seller clients have both.
alter table public.clients add column if not exists sell_phase text;

-- 3. The seller's home.
alter table public.clients add column if not exists sale_address text;
alter table public.clients add column if not exists sale_price numeric;
alter table public.clients add column if not exists sale_listed_on date;
alter table public.clients add column if not exists sale_url text;
-- When on, the Open house stage reads "Private showings" (vetted buyers only).
alter table public.clients add column if not exists private_showings boolean not null default false;

-- 4. Open houses and private showings, each with the agent's feedback note.
create table if not exists public.open_houses (
  id          uuid primary key default gen_random_uuid(),
  agent_id    uuid not null references public.agents(id) on delete cascade,
  client_id   uuid not null references public.clients(id) on delete cascade,
  created_at  timestamptz not null default now(),
  starts_at   timestamptz not null,
  ends_at     timestamptz,
  kind        text not null default 'open_house' check (kind in ('open_house', 'private')),
  feedback    text
);
create index if not exists open_houses_client_idx on public.open_houses(client_id, starts_at);
alter table public.open_houses enable row level security;
drop policy if exists "agent owns open houses" on public.open_houses;
create policy "agent owns open houses" on public.open_houses for all
  to authenticated using (agent_id = auth.uid()) with check (agent_id = auth.uid());

-- 5. Offers the seller receives, with where each stands and the agent's note.
create table if not exists public.sale_offers (
  id           uuid primary key default gen_random_uuid(),
  agent_id     uuid not null references public.agents(id) on delete cascade,
  client_id    uuid not null references public.clients(id) on delete cascade,
  created_at   timestamptz not null default now(),
  amount       numeric not null,
  terms        text,
  status       text not null default 'review' check (status in ('review', 'countered', 'accepted', 'declined')),
  note         text,
  received_on  date
);
create index if not exists sale_offers_client_idx on public.sale_offers(client_id, created_at);
alter table public.sale_offers enable row level security;
drop policy if exists "agent owns sale offers" on public.sale_offers;
create policy "agent owns sale offers" on public.sale_offers for all
  to authenticated using (agent_id = auth.uid()) with check (agent_id = auth.uid());
