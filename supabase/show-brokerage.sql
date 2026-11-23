-- "Show my brokerage under my name", on by default. Safe to run twice.
alter table public.agents add column if not exists show_brokerage boolean not null default true;
