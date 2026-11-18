-- Short card links: marvberry.com/c/kim-x7k2q opens Kim's card.
alter table public.agents add column if not exists short_code text unique;
