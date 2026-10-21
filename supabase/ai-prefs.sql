-- Marvberry AI switches, one per thing it does. All on by default.
alter table public.agents add column if not exists assistant_reminders boolean not null default true;
alter table public.agents add column if not exists assistant_replies   boolean not null default true;
alter table public.agents add column if not exists morning_email       boolean not null default true;
alter table public.agents add column if not exists offer_nudges        boolean not null default true;
