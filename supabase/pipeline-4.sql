-- Pipeline: label each touch as a text, call, DM or email.
alter table public.pipeline_touches add column if not exists channel text;
