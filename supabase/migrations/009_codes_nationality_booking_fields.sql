-- (1) รหัส talent GEN อัตโนมัติ format แบบระบบเก่า: 2 ตัวอักษร + 3 ตัวเลข +
--     1 ตัวอักษร เช่น FF979D (ของเดิม GD-xxxx ยังอยู่ แอดมินแก้มือได้)
-- (2) talents.nationality (เช่น Thai/American)
-- (3) ฟอร์มจองถ่ายเก็บ เพศ + วันเกิด (ลิงค์เข้าใบสมัคร คำนวณอายุอัตโนมัติ)
-- Run in Supabase Dashboard -> SQL Editor -> New query -> Run (safe to re-run).

alter table talents add column if not exists nationality text;

alter table shoot_bookings
  add column if not exists gender text,
  add column if not exists dob date;

create or replace function gen_talent_code() returns text
language plpgsql
as $$
declare
  v_code text;
begin
  loop
    v_code := chr(65 + floor(random() * 26)::int)
           || chr(65 + floor(random() * 26)::int)
           || lpad(floor(random() * 1000)::text, 3, '0')
           || chr(65 + floor(random() * 26)::int);
    exit when not exists (select 1 from talents where code = v_code);
  end loop;
  return v_code;
end $$;

alter table talents alter column code set default gen_talent_code();
