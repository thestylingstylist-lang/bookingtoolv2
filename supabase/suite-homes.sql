-- Client suite: home cards (photo, price, beds, baths, the agent's note to the client)
-- and the times the client shares for seeing homes.

alter table public.homes add column if not exists photo_url   text not null default '';
alter table public.homes add column if not exists price       numeric;
alter table public.homes add column if not exists beds        numeric;
alter table public.homes add column if not exists baths       numeric;
alter table public.homes add column if not exists client_note text not null default '';

alter table public.clients add column if not exists showing_times    jsonb;
alter table public.clients add column if not exists showing_times_at timestamptz;
