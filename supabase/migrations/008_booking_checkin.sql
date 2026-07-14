-- Photoshoot Overview: เช็คชื่อวันถ่าย + ผูกคนจองเข้าระบบ talent
-- Run in Supabase Dashboard -> SQL Editor -> New query -> Run (safe to re-run).

alter table shoot_bookings
  add column if not exists arrived_at timestamptz,
  add column if not exists talent_id uuid references talents(id) on delete set null;
