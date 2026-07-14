-- ระบบจองถ่ายโปรไฟล์ (ย้ายจาก WordPress mu-plugin — ดู docs/05 ในโปรเจกต์ WP)
-- Run in Supabase Dashboard -> SQL Editor -> New query -> Run (safe to re-run).

-- รอบถ่าย (วัน + สถานที่ + ตารางเปิด/ปิดรายชั่วโมงของ 2 ห้อง)
create table if not exists shoot_days (
  id uuid primary key default gen_random_uuid(),
  shoot_date date not null,
  location text,
  details text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  -- ต่อชั่วโมง: {"09:00":{"photo_open":true,"video_open":false}, ...}
  -- ไม่มี key = เปิด (default open)
  slots jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- การจอง (pending = จองแล้วรอตรวจสลิป — กินที่นั่งจนกว่าจะ rejected)
create table if not exists shoot_bookings (
  id uuid primary key default gen_random_uuid(),
  shoot_day_id uuid not null references shoot_days(id) on delete cascade,
  package text not null check (package in ('A', 'B')),
  hour text not null,
  full_name text not null,
  nickname text,
  phone text not null,
  line_id text,
  email text,
  height text,
  weight text,
  talents_note text,
  slip_path text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);
create index if not exists shoot_bookings_day_idx on shoot_bookings (shoot_day_id);
create index if not exists shoot_bookings_status_idx on shoot_bookings (status);

drop trigger if exists shoot_days_set_updated_at on shoot_days;
create trigger shoot_days_set_updated_at before update on shoot_days
  for each row execute function set_updated_at();

alter table shoot_days enable row level security;
alter table shoot_bookings enable row level security;

-- จองแบบ atomic: lock ต่อ (วัน+ชั่วโมง) → เช็คความจุ → insert ในทีเดียว
-- ปิด race condition ที่ระบบ WP เดิมมี (คนจองที่สุดท้ายพร้อมกัน)
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
    where shoot_day_id = p_day and hour = p_hour and status <> 'rejected';
  select count(*) into v_video from shoot_bookings
    where shoot_day_id = p_day and hour = p_hour and package = 'A' and status <> 'rejected';

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

-- สลิปโอนเงินมีข้อมูลการเงิน — bucket ส่วนตัว (เข้าถึงผ่าน signed URL ฝั่ง admin เท่านั้น)
insert into storage.buckets (id, name, public)
values ('booking-slips', 'booking-slips', false)
on conflict (id) do nothing;
