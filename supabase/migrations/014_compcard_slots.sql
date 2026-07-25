-- Comp Card Studio: จำว่ารูปช่องไหน (หน้าตรง/ครึ่งตัว/ไลฟ์สไตล์/เต็มตัว + เพิ่มเติม)
-- ใช้ตอนสร้างคอมการ์ดอัตโนมัติ — เก็บเป็น jsonb {slot: storage_path}
-- Run in Supabase Dashboard -> SQL Editor -> New query -> Run (safe to re-run).

alter table talents
  add column if not exists compcard_slots jsonb not null default '{}'::jsonb;
