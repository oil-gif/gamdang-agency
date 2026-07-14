-- หน้าบ้าน 3 Tab: เพิ่มประเภท AI Model (ตัวละครที่ admin สร้างเอง ไม่มี LINE/followers)
-- Run in Supabase Dashboard -> SQL Editor -> New query -> Run (safe to re-run).

alter table talents
  add column if not exists is_ai_model boolean not null default false,
  -- คาแรกเตอร์ของ AI Model เช่น "Energetic / Fun" (คั่นด้วย /)
  add column if not exists character text;
