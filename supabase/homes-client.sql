-- The client's side of each home: their own notes, and when they tapped
-- "I'd like to make an offer" from their page.
alter table public.homes add column if not exists client_notes text not null default '';
alter table public.homes add column if not exists client_offer_at timestamptz;
