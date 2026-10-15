-- Email signature layout: false = name and details only, true = photo on the left.
alter table public.agents add column if not exists signature_photo boolean not null default false;
