-- Remembers when each client was sent their suite link, so the client page
-- can show the next action. Safe to run twice.
alter table public.clients add column if not exists portal_sent_at timestamptz;
-- Clients who already have a suite link were sent one before.
update public.clients set portal_sent_at = now() where portal_token is not null and portal_sent_at is null;
