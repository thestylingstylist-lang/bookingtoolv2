-- The realtor's own video meeting link (Zoom, Google Meet, Teams). It goes into
-- every client booking confirmation and reminder for video calls.
alter table public.agents add column if not exists meeting_link text not null default '';
