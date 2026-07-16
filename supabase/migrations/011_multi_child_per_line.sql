-- 1 LINE = หลายโปรไฟล์ (แม่จัดการลูกหลายคนได้): เอา UNIQUE ออกจาก line_user_id
-- Run in Supabase Dashboard -> SQL Editor -> New query -> Run (safe to re-run).

alter table talents drop constraint if exists talents_line_user_id_key;
create index if not exists talents_line_user_id_idx on talents (line_user_id);
