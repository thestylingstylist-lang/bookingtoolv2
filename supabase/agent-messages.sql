-- Agent messages dock: remembers when the agent last opened each client's chat,
-- so a blush dot can mark new client messages. Safe to run twice.
alter table public.clients add column if not exists agent_read_at timestamptz;
