-- ฟอร์มจองถ่ายเก็บสัญชาติด้วย (ติดไปตอนสร้าง talent จากการจอง)
-- Run in Supabase Dashboard -> SQL Editor -> New query -> Run (safe to re-run).

alter table shoot_bookings add column if not exists nationality text;
