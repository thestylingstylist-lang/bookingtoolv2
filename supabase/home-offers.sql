-- Offers sent on a home, straight to the listing agent from Marvberry.
create table if not exists public.home_offers (
  id             uuid primary key default gen_random_uuid(),
  agent_id       uuid not null references public.agents(id) on delete cascade,
  client_id      uuid not null references public.clients(id) on delete cascade,
  home_id        uuid not null references public.homes(id) on delete cascade,
  created_at     timestamptz not null default now(),
  amount         numeric not null,
  deposit        numeric,
  financing      text not null default '',
  contingencies  text[] not null default '{}',
  closing_on     date,
  good_until     timestamptz,
  status         text not null default 'sent' check (status in ('sent','countered','accepted','declined')),
  followed_up_at timestamptz
);
create index if not exists home_offers_home_idx on public.home_offers(home_id, created_at);

alter table public.home_offers enable row level security;
drop policy if exists "agent owns home offers" on public.home_offers;
create policy "agent owns home offers" on public.home_offers for all
  to authenticated using (agent_id = auth.uid()) with check (agent_id = auth.uid());
