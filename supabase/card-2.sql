-- Card details the agent sets on her dashboard, and her uploaded guide.
alter table public.agents add column if not exists service_areas text;
alter table public.agents add column if not exists office_address text;
alter table public.agents add column if not exists guide_blurb text;
alter table public.agents add column if not exists guide_path text;
