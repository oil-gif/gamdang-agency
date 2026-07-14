-- Milestone 14: Influ ส่งลิงก์ผลงาน (สูงสุด 5 ลิงก์/คน/โปรเจกต์) เพื่อ Gen Report ให้ลูกค้า
-- Run in Supabase Dashboard -> SQL Editor -> New query -> Run (safe to re-run).

alter table project_talents
  add column if not exists submission_links text[] not null default '{}',
  add column if not exists submission_note text,
  add column if not exists submitted_at timestamptz;
