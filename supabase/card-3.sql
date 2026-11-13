-- Free card accounts: 'card' sees Card, Calendar and Clients. 'full' is Marvberry.
alter table public.agents add column if not exists plan text not null default 'full';
alter table public.agents drop constraint if exists agents_plan_check;
alter table public.agents add constraint agents_plan_check check (plan in ('full','card'));
