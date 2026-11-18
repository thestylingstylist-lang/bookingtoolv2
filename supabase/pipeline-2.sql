-- Pipeline: a "Card Sent" step between Said Yes and Card Claimed.
alter table public.pipeline_leads add column if not exists sent_at timestamptz;
alter table public.pipeline_leads drop constraint if exists pipeline_leads_stage_check;
alter table public.pipeline_leads add constraint pipeline_leads_stage_check
  check (stage in ('texted','replied','yes','sent','claimed','active','paid','lost'));
