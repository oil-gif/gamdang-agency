-- เก็บ "Role ที่สมัคร" ติดไปกับ talent ที่รับเข้า project → หลังบ้าน/เสนอลูกค้า
-- แบ่งกลุ่มตาม role ได้ (เช่น นางเอก / เด็กชาย) ตามที่ผู้สมัครเลือกมา
alter table project_talents
  add column if not exists role_id uuid references project_roles(id) on delete set null;

-- ย้อนเติม role_id ให้ talent ที่รับเข้าไปก่อนหน้านี้ — จับคู่กับใบสมัคร
-- (project + talent เดียวกัน) ที่มี role_id · unique(project_id,talent_id) จึง 1:1
update project_talents pt
set role_id = pa.role_id
from project_applications pa
where pt.role_id is null
  and pa.project_id = pt.project_id
  and pa.talent_id = pt.talent_id
  and pa.role_id is not null;
