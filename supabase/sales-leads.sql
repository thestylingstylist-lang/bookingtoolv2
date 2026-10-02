-- Sales pipeline: leads coming in (from the book-a-call link or added by hand),
-- their stage, the next step, and enough to compute call-to-close conversion.
create table if not exists public.sales_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text,
  phone text,
  source text,                       -- where the lead came from (e.g. "book link", "event", "referral")
  stage text not null default 'new', -- new | call_booked | called | member | lost
  next_step text,                    -- free-text: the next action for this lead
  call_at timestamptz,               -- when their booked call is
  booking_id uuid,                   -- links to the bookings row if they booked through Marvberry
  notes text
);

-- Internal team table: no public access. Service role (admin client) only.
alter table public.sales_leads enable row level security;
