-- Signing order: the agent signs, then the broker (if the agent has one in Settings),
-- and only then does the client receive the agreement. Until then it stays a draft.
-- Once everyone has signed, the final signed PDF is kept in the client's file.

alter table public.agents add column if not exists broker_name  text not null default '';
alter table public.agents add column if not exists broker_email text not null default '';

alter table public.documents add column if not exists agent_signed_name  text;
alter table public.documents add column if not exists agent_signed_at    timestamptz;
alter table public.documents add column if not exists broker_name        text;
alter table public.documents add column if not exists broker_email       text;
alter table public.documents add column if not exists broker_token       uuid not null default gen_random_uuid();
alter table public.documents add column if not exists broker_signed_name text;
alter table public.documents add column if not exists broker_signed_at   timestamptz;
alter table public.documents add column if not exists broker_signed_ip   text;
alter table public.documents add column if not exists signed_pdf_path    text;

create unique index if not exists documents_broker_token_idx on public.documents(broker_token);

-- What the client sees for a home, when it should differ from the address on the agent's side.
alter table public.homes add column if not exists client_address text not null default '';
