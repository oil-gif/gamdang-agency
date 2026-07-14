-- Gamdang Phase 1 schema
-- Run this once in the Supabase Dashboard -> SQL Editor -> New query -> Run.
-- Safe to re-run individual pieces if something fails partway (mostly idempotent
-- via "if not exists", except the ALTER/constraint statements near the bottom).

create extension if not exists "pgcrypto";

-- Human-friendly talent codes: GD-0001, GD-0002, ...
create sequence if not exists talent_code_seq start 1;

create table if not exists talents (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('GD-' || lpad(nextval('talent_code_seq')::text, 4, '0')),

  -- LINE identity (set by the LIFF apply flow, never user-editable)
  line_user_id text unique,
  line_display_name text,
  line_picture_url text,

  -- profile
  full_name text,
  nickname_th text,
  nickname_en text,
  gender text check (gender in ('male', 'female', 'other')),
  dob date,
  ethnicities text[] not null default '{}',
  height_cm int,
  weight_kg int,
  measurements text,
  phone text,
  email text,
  contact_line_or_whatsapp text,
  note text,

  is_model boolean not null default false,
  is_influencer boolean not null default false,
  -- AI Model: ตัวละครที่ admin สร้างเอง (ไม่มี LINE/followers) โชว์ใน tab แยกหน้าบ้าน
  is_ai_model boolean not null default false,
  character text,

  status text not null default 'pending' check (status in ('pending', 'active', 'rejected', 'inactive')),
  source text not null default 'self' check (source in ('admin', 'self')),

  -- social: the 5 canonical tier-eligible platforms only
  ig_handle text, ig_followers int not null default 0,
  tiktok_handle text, tiktok_followers int not null default 0,
  youtube_handle text, youtube_followers int not null default 0,
  facebook_handle text, facebook_followers int not null default 0,
  lemon8_handle text, lemon8_followers int not null default 0,

  max_followers int not null default 0,
  tier text not null default 'nano' check (tier in ('nano', 'micro', 'mid', 'macro', 'celeb')),

  categories text[] not null default '{}',

  compcard_photo_id uuid,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists talents_categories_idx on talents using gin (categories);
create index if not exists talents_ethnicities_idx on talents using gin (ethnicities);
create index if not exists talents_status_idx on talents (status);

create table if not exists talent_photos (
  id uuid primary key default gen_random_uuid(),
  talent_id uuid not null references talents(id) on delete cascade,
  kind text not null check (kind in ('gallery', 'compcard')),
  storage_path text not null,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists talent_photos_one_compcard
  on talent_photos (talent_id) where kind = 'compcard';

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'talents_compcard_photo_fk'
  ) then
    alter table talents
      add constraint talents_compcard_photo_fk
      foreign key (compcard_photo_id) references talent_photos(id) on delete set null;
  end if;
end $$;

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_name text,
  description text,
  -- งาน Model หรืองาน Influencer — กำหนดตอนสร้าง ใช้เป็น default card type
  project_type text not null default 'model' check (project_type in ('model', 'influencer')),
  shooting_date date,
  budget text,
  status text not null default 'draft' check (status in ('draft', 'active', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists project_talents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  talent_id uuid not null references talents(id) on delete cascade,
  card_type text not null default 'compcard' check (card_type in ('compcard', 'influcard')),
  display_order int not null default 0,
  notes text,
  client_interested boolean,
  talent_response text check (talent_response in ('pending', 'accepted', 'declined')),
  -- Influ ส่งลิงก์ผลงาน (สูงสุด 5 — บังคับในโค้ด) เพื่อ Gen Report ให้ลูกค้า
  -- งาน Model ใช้ช่องเดียวกันเป็น "ลิงก์ผลงานที่เคยทำ"
  submission_links text[] not null default '{}',
  submission_note text,
  submitted_at timestamptz,
  -- งาน Model (casting): รูปเพิ่มสูงสุด 3 รูป + ลิงก์คลิปแนะนำตัว
  extra_photo_paths text[] not null default '{}',
  intro_video_url text,
  added_at timestamptz not null default now(),
  unique (project_id, talent_id)
);

create table if not exists project_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz,
  renewed_count int not null default 0,
  tc_accepted boolean not null default false,
  tc_accepted_at timestamptz,
  tc_accepted_ip text,
  view_count int not null default 0,
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_at timestamptz not null default now()
);

-- keep updated_at fresh automatically
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists talents_set_updated_at on talents;
create trigger talents_set_updated_at before update on talents
  for each row execute function set_updated_at();

drop trigger if exists projects_set_updated_at on projects;
create trigger projects_set_updated_at before update on projects
  for each row execute function set_updated_at();

-- RLS: enabled everywhere, ZERO policies granted to anon/authenticated.
-- Only the service-role key (used exclusively in server-side Next.js code)
-- can read/write these tables. This is the safety net described in the plan,
-- not the primary access control (the primary control is "the browser never
-- imports a client that isn't scoped this way").
alter table talents enable row level security;
alter table talent_photos enable row level security;
alter table projects enable row level security;
alter table project_talents enable row level security;
alter table project_links enable row level security;

-- Storage bucket for all talent photos (public: these are marketing photos
-- meant to be shown on public client links anyway; filenames are random
-- UUIDs so nothing is guessable/enumerable).
insert into storage.buckets (id, name, public)
values ('talent-photos', 'talent-photos', true)
on conflict (id) do nothing;
