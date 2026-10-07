-- Optional real estate license number. Shows on the booking page when filled in.
alter table public.agents add column if not exists license_number text not null default '';
