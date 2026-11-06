-- What the agent calls their assistant (picked during onboarding, changeable later).
alter table agents add column if not exists assistant_name text not null default 'Marvberry';
