-- เชื่อม LINE ตอนจองถ่าย: เก็บ LINE user id (+ชื่อ/รูป) ของคนที่จองผ่าน LINE
-- เพื่อผูกโปรไฟล์ให้อัตโนมัติตอนแอดมินดึงเข้าระบบ talent
-- Run in Supabase Dashboard -> SQL Editor -> New query -> Run (safe to re-run).

alter table shoot_bookings
  add column if not exists line_user_id text,
  add column if not exists line_display_name text,
  add column if not exists line_picture_url text;
