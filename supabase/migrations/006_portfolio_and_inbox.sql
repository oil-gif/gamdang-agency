-- (1) ผลงาน/คลิปแนะนำตัวเก็บที่ตัว talent ถาวร (แอดมินกรอกเองได้ +
--     ฟอร์ม casting ของ talent sync เข้ามา) — เห็นครบในหน้า talent หลังบ้าน
-- (2) photo_inbox: อัพรูปเป็น batch แล้วค่อยกดมอบหมายทีหลังว่าเป็นรูป/compcard ของใคร
-- Run in Supabase Dashboard -> SQL Editor -> New query -> Run (safe to re-run).

alter table talents
  add column if not exists portfolio_links text[] not null default '{}',
  add column if not exists intro_video_url text;

create table if not exists photo_inbox (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  created_at timestamptz not null default now()
);
alter table photo_inbox enable row level security;
