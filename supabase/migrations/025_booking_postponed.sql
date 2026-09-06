-- สถานะใหม่: "postponed" = คนจองขอเลื่อนไปรอบหน้า
--
-- ก่อนหน้านี้แอดมินต้องกด "ปฏิเสธ" ให้คนที่ขอเลื่อน ซึ่งผิดความหมาย (เหมือน
-- ไม่ผ่าน) และตามต่อไม่ได้ว่าใครขอเลื่อนไว้บ้าง · แยกสถานะออกมาให้ชัด
-- แล้วหน้าหลังบ้านจะมีแท็บ "คนขอเลื่อนรอบ" ไว้ตามว่าใครกลับมาจองรอบใหม่แล้ว
--
-- เรื่องที่นั่ง: postponed = คืนที่นั่งเหมือน rejected (เขาไม่มาแล้วรอบนี้)
-- ไม่งั้นที่ว่างจะถูกจองค้างไว้เปล่าๆ

alter table shoot_bookings drop constraint if exists shoot_bookings_status_check;
alter table shoot_bookings add constraint shoot_bookings_status_check
  check (status in ('pending', 'approved', 'rejected', 'postponed'));

-- ฟังก์ชันจอง: เดิมนับที่นั่งด้วย status <> 'rejected' → ต้องกัน postponed ด้วย
-- (คัดลอกจาก 007 ทั้งดุ้น เปลี่ยนเฉพาะ 2 บรรทัดที่นับที่นั่ง)
create or replace function book_shoot_slot(
  p_day uuid, p_package text, p_hour text,
  p_full_name text, p_nickname text, p_phone text, p_line_id text,
  p_email text, p_height text, p_weight text, p_talents text, p_slip_path text,
  p_photo_cap int, p_video_cap int
) returns uuid
language plpgsql
as $$
declare
  v_slots jsonb;
  v_photo_open boolean;
  v_video_open boolean;
  v_photo int;
  v_video int;
  v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext(p_day::text || '|' || p_hour));

  select slots into v_slots
  from shoot_days
  where id = p_day and status = 'published' and shoot_date >= current_date;
  if not found then
    raise exception 'full';
  end if;

  v_photo_open := coalesce((v_slots -> p_hour ->> 'photo_open')::boolean, true);
  v_video_open := coalesce((v_slots -> p_hour ->> 'video_open')::boolean, true);

  select count(*) into v_photo from shoot_bookings
    where shoot_day_id = p_day and hour = p_hour
      and status not in ('rejected', 'postponed');
  select count(*) into v_video from shoot_bookings
    where shoot_day_id = p_day and hour = p_hour and package = 'A'
      and status not in ('rejected', 'postponed');

  if not (v_photo_open and v_photo < p_photo_cap) then
    raise exception 'full';
  end if;
  if p_package = 'A' and not (v_video_open and v_video < p_video_cap) then
    raise exception 'full';
  end if;

  insert into shoot_bookings
    (shoot_day_id, package, hour, full_name, nickname, phone, line_id,
     email, height, weight, talents_note, slip_path)
  values
    (p_day, p_package, p_hour, p_full_name, p_nickname, p_phone, p_line_id,
     p_email, p_height, p_weight, p_talents, p_slip_path)
  returning id into v_id;
  return v_id;
end $$;
