-- The realtor's usual commission. Pre-fills every agreement; still editable per client.
alter table public.agents add column if not exists default_commission text not null default '';
