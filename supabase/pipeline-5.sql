-- Pipeline: a "List" stage before Texted (found and vetted, not contacted yet),
-- plus a "has her own website" flag to test as a list filter.
alter table public.pipeline_leads add column if not exists texted_at timestamptz;
alter table public.pipeline_leads add column if not exists has_website boolean not null default false;
update public.pipeline_leads set texted_at = created_at where texted_at is null and stage <> 'list';
alter table public.pipeline_leads drop constraint if exists pipeline_leads_stage_check;
alter table public.pipeline_leads add constraint pipeline_leads_stage_check
  check (stage in ('list','texted','replied','yes','sent','claimed','active','paid','lost'));
