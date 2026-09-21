-- =====================================================================
-- Branding add-on — run ONCE in your v2 Supabase project's SQL Editor.
--
-- Safe to run on the v2 project (the one behind bookingtoolv2.vercel.app).
-- It only ADDS columns and a storage bucket — it changes no existing data.
-- Do NOT run it against your live phase-1 project.
--
-- Adds, to each agent:
--   welcome_message  a personal note shown at the top of the booking page
--   tagline          an optional headline under the business name
--   public_phone     contact phone shown to clients on the booking page
--   public_email     contact email shown to clients on the booking page
--   logo_url         uploaded logo image
--   headshot_url     uploaded headshot image
--
-- And creates a public "branding" storage bucket to hold those images.
-- =====================================================================

alter table public.agents
  add column if not exists welcome_message text not null default '',
  add column if not exists tagline         text not null default '',
  add column if not exists public_phone     text not null default '',
  add column if not exists public_email     text not null default '',
  add column if not exists logo_url         text not null default '',
  add column if not exists headshot_url     text not null default '';

-- Public image bucket. Images are readable by anyone (they appear on the
-- public booking page). Uploads happen server-side with the service-role
-- key, so no upload policy is needed.
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do update set public = true;
