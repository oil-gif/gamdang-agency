-- เก็บ "Role ที่สมัคร" ติดไปกับ talent ที่รับเข้า project → หลังบ้าน/เสนอลูกค้า
-- แบ่งกลุ่มตาม role ได้ (เช่น นางเอก / เด็กชาย) ตามที่ผู้สมัครเลือกมา
alter table project_talents
  add column if not exists role_id uuid references project_roles(id) on delete set null;
