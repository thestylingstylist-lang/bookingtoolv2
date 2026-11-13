-- Suspended accounts: can't sign in, and their booking page is hidden. Nothing is lost.
alter table public.agents add column if not exists suspended_at timestamptz;
