-- Feedback captured from inside the app, read in the admin dashboard.
create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  agent_id    uuid references auth.users(id) on delete set null,
  agent_email text,
  agent_name  text,
  message     text not null,
  created_at  timestamptz not null default now()
);

alter table public.feedback enable row level security;
-- No policies: only the admin/service client can read or write.
