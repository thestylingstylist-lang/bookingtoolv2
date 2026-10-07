-- Personal time the realtor holds on the calendar ("hold" events).
-- Lets the events table accept the new kind alongside showings, closings and open houses.
alter table public.events drop constraint if exists events_kind_check;
alter table public.events add constraint events_kind_check
  check (kind in ('showing','closing','open_house','hold'));
