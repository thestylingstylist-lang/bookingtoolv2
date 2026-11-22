-- Buyer's agent on a seller's received offers.
alter table public.sale_offers add column if not exists buyer_agent_name text;
alter table public.sale_offers add column if not exists buyer_agent_email text;
