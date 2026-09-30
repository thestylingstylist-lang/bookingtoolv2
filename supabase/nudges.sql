-- When the realtor sent (or skipped) the one-tap reminder for a client step.
alter table public.steps add column if not exists nudged_at timestamptz;
