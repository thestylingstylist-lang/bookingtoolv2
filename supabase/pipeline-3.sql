-- Pipeline: the details used to make her card.
alter table public.pipeline_leads add column if not exists email text;
alter table public.pipeline_leads add column if not exists address text;
alter table public.pipeline_leads add column if not exists office_phone text;
alter table public.pipeline_leads add column if not exists years text;
alter table public.pipeline_leads add column if not exists sold_last_month text;
alter table public.pipeline_leads add column if not exists zillow_url text;
