-- Gift cards made for an agent before she signs up: private until she claims it.
alter table public.agents add column if not exists claim_token text unique;
alter table public.agents add column if not exists gifted_at timestamptz;
-- Links and an office line for the card and the saved contact.
alter table public.agents add column if not exists website_url text;
alter table public.agents add column if not exists instagram text;
alter table public.agents add column if not exists office_phone text;
