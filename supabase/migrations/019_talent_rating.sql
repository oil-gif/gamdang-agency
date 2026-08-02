-- ดาวจัดอันดับ (แอดมินให้เอง 0-5) — ใช้ดันคนผลงานเยอะ/คนเด่นขึ้นหน้าแรก
-- ของหน้า /talents สาธารณะ · 0 หรือ null = ยังไม่ให้ดาว
alter table talents
  add column if not exists rating smallint not null default 0
  check (rating between 0 and 5);
