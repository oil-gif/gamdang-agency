-- ย้ายคนที่ "ขอเลื่อนรอบ" ไปลงรอบใหม่จากหลังบ้าน (ขอ 2026-09-21)
--
-- ย้าย "ใบจองเดิม" ไปวันใหม่ ไม่สร้างใบใหม่ — เขาจ่ายเงินแล้ว (ตอนออกแบบ
-- ทั้ง 15 คนที่รอเลื่อนมีสลิปครบ) สลิป / LINE / โปรไฟล์ talent ตามไปด้วยหมด
--
-- เก็บว่า "เลื่อนมาจากรอบไหน" ไว้โชว์ป้ายบนการ์ดวันใหม่ ให้พนักงานหน้างาน
-- รู้ว่าจ่ายแล้ว ไม่ต้องเก็บเงินซ้ำ
--
-- ⚠️ เก็บเป็นวันที่ธรรมดา ไม่ใช่ foreign key ไป shoot_days
-- ถ้ามี FK ตัวที่สองชี้ไป shoot_days คำสั่ง select `shoot_day:shoot_days(...)`
-- ที่ใช้อยู่ทั่วระบบจะพังทันที (PostgREST: "more than one relationship")

alter table shoot_bookings
  add column if not exists rescheduled_from_date date,
  add column if not exists rescheduled_from_hour text,
  add column if not exists rescheduled_at timestamptz;

-- ย้ายแบบกันจองชน: ล็อกเดียวกับ book_shoot_slot (วัน|ชั่วโมง) แล้วค่อยนับที่นั่ง
-- ถ้ามีคนจองผ่านหน้าเว็บในวินาทีเดียวกัน จะไม่ได้คนเกินที่นั่ง
--
-- ต่างจาก book_shoot_slot ตรงที่:
-- - ลงรอบที่ยังไม่เปิดจอง (draft) ได้ — แอดมินจองที่ให้คนที่เลื่อนไว้ก่อน
--   เปิดจองสาธารณะ ("แจ้งให้ทราบก่อนใคร")
-- - ไม่สนสวิตช์ปิด/เปิดรายชั่วโมง (นั่นคือสวิตช์ของหน้าเว็บ) แต่ยังเคารพ
--   จำนวนที่นั่งเสมอ
-- - รับเฉพาะใบที่สถานะ postponed — กันกดซ้ำ/ย้ายใบที่ไม่ได้ขอเลื่อน
create or replace function reschedule_booking(
  p_id uuid, p_day uuid, p_hour text, p_package text,
  p_photo_cap int, p_video_cap int
) returns void
language plpgsql
as $$
declare
  v_old record;
  v_new_date date;
  v_photo int;
  v_video int;
begin
  perform pg_advisory_xact_lock(hashtext(p_day::text || '|' || p_hour));

  select b.status, b.hour, d.shoot_date into v_old
  from shoot_bookings b join shoot_days d on d.id = b.shoot_day_id
  where b.id = p_id
  for update of b;
  if not found then
    raise exception 'not_found';
  end if;
  if v_old.status <> 'postponed' then
    raise exception 'not_postponed';
  end if;

  select shoot_date into v_new_date
  from shoot_days where id = p_day and shoot_date >= current_date;
  if not found then
    raise exception 'no_day';
  end if;

  select count(*) into v_photo from shoot_bookings
    where shoot_day_id = p_day and hour = p_hour
      and status not in ('rejected', 'postponed');
  select count(*) into v_video from shoot_bookings
    where shoot_day_id = p_day and hour = p_hour and package = 'A'
      and status not in ('rejected', 'postponed');

  if v_photo >= p_photo_cap then
    raise exception 'full';
  end if;
  if p_package = 'A' and v_video >= p_video_cap then
    raise exception 'full_video';
  end if;

  update shoot_bookings set
    shoot_day_id = p_day,
    hour = p_hour,
    package = p_package,
    status = 'approved',
    arrived_at = null,
    rescheduled_from_date = v_old.shoot_date,
    rescheduled_from_hour = v_old.hour,
    rescheduled_at = now()
  where id = p_id;
end $$;
