-- Pipeline: star the agents you really want to work with.
alter table public.pipeline_leads add column if not exists starred boolean not null default false;
