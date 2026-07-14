-- งาน Model: ฟอร์มส่งงานเป็นแบบ Casting — ขอรูปเพิ่ม 3 รูป + คลิปแนะนำตัว
-- (ลิงก์ผลงานที่เคยทำใช้ submission_links เดิม)
-- Run in Supabase Dashboard -> SQL Editor -> New query -> Run (safe to re-run).

alter table project_talents
  add column if not exists extra_photo_paths text[] not null default '{}',
  add column if not exists intro_video_url text;
