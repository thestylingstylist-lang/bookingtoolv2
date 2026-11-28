-- The agent's colour on her Marvberry Card. Safe to run twice.
alter table public.agents add column if not exists brand_color text not null default '';
