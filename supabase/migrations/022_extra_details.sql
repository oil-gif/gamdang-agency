-- ข้อมูลเพิ่มเติมที่ลูกค้าถามบ่อย (English Level, Swim, ขี่จักรยาน ฯลฯ)
--
-- ออกแบบตามที่พี่เจ้าของเลือก 2026-08-14:
--  · ทักษะถาวรติดกับ "คน" → กรอกครั้งเดียว ขึ้นได้ทุกงาน
--  · โน้ตเฉพาะงานติดกับ "แถวในโปรเจกต์" → ใช้ตอบเรื่องที่ลูกค้าเจาะจงถามงานนั้น
--  · ทุกอย่างต้องติ๊กเองว่าจะโชว์ในรายงานมั้ย (ค่าเริ่มต้น = ไม่โชว์)
--
-- ⚠️ อย่าสับสนกับ talents.note ซึ่งเป็น "โน้ตภายใน" (มีข้อมูลอยู่แล้ว 198 คน)
--    อันนั้นห้ามโชว์ลูกค้าเด็ดขาด
--
-- รูปแบบ extra_details: [{"label":"English Level","value":"Intermediate","show":true}, ...]
alter table talents
  add column if not exists extra_details jsonb not null default '[]'::jsonb;

-- project_talents.notes มีอยู่แล้วแต่ไม่เคยถูกใช้ (0 แถว) — เอามาใช้เป็นโน้ตเฉพาะงาน
alter table project_talents
  add column if not exists notes_show boolean not null default false,
  add column if not exists show_socials boolean not null default false;
