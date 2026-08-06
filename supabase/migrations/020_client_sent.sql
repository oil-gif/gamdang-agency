-- บันทึกว่า "ส่งรายชื่อ/proposal ให้ลูกค้าแล้ว"
--
-- ทำไมต้องมี: ระบบเดิมรู้แค่ว่าลูกค้า "เปิดลิงก์ /p/[token]" หรือยัง (project_links.view_count)
-- แต่ลูกค้าหลายเจ้าขอให้ส่งไฟล์/รายชื่อทางไลน์หรืออีเมลแทน ไม่เคยเปิดลิงก์เลย
-- view_count เลยเป็น 0 ตลอด และไม่มีอะไรบอกว่างานนี้ส่งไปหรือยัง — ต้องให้แอดมินบันทึกเอง
--
-- Run in Supabase Dashboard -> SQL Editor -> New query -> Run (safe to re-run).

alter table projects
  add column if not exists client_sent_at timestamptz,   -- ส่งเมื่อไหร่ (null = ยังไม่ได้ส่ง)
  add column if not exists client_sent_via text,         -- line / email / link / other
  add column if not exists client_sent_note text;        -- เช่น "ส่งกลุ่มไลน์คุณเอ"
