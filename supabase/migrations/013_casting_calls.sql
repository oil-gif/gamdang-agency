-- Casting Calls: ประกาศงานสาธารณะ + roles + ผู้สมัครเข้าร่วม
-- Run in Supabase Dashboard -> SQL Editor -> New query -> Run (safe to re-run).

alter table projects
  add column if not exists cover_path text,
  add column if not exists category text,        -- TV Commercial / Movie / MV / ...
  add column if not exists is_published boolean not null default false, -- โชว์หน้า /casting
  add column if not exists casting_closed boolean not null default false; -- ริบบิ้น CASTING CLOSED

-- role ในโปรเจกต์ (1 งานมีหลาย role)
create table if not exists project_roles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  description text,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists project_roles_project_idx on project_roles (project_id);

-- คนที่กด "สมัคร/เข้าร่วม" จากหน้าสาธารณะ — รอแอดมิน approve เข้า proposal
create table if not exists project_applications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  talent_id uuid not null references talents(id) on delete cascade,
  role_id uuid references project_roles(id) on delete set null,
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  applied_at timestamptz not null default now(),
  unique (project_id, talent_id)
);
create index if not exists project_applications_project_idx on project_applications (project_id);
create index if not exists project_applications_status_idx on project_applications (status);

alter table project_roles enable row level security;
alter table project_applications enable row level security;
