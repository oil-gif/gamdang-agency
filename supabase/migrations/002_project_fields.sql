-- Milestone 10: project job type + shooting date + budget
-- Run in Supabase Dashboard -> SQL Editor -> New query -> Run (safe to re-run).

alter table projects
  add column if not exists project_type text not null default 'model'
    check (project_type in ('model', 'influencer')),
  add column if not exists shooting_date date,
  add column if not exists budget text;
