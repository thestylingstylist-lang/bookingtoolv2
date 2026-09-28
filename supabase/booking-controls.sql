-- =====================================================================
-- Booking controls add-on — run ONCE in your v2 Supabase project's SQL Editor.
--
-- Safe to run: it only ADDS columns with defaults. No existing data changes.
--
-- Adds, to each agent:
--   min_notice_hours  how far ahead a client must book (24 = no same-day)
--   show_contact      whether phone/email show on the public booking page
-- =====================================================================

alter table public.agents
  add column if not exists min_notice_hours int     not null default 24,
  add column if not exists show_contact     boolean not null default false;
